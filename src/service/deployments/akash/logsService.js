import { getTarget } from "../../../utils/keyChain.js";
import path from "path";
import dotenv from "dotenv";
import chalk from "chalk";
import DeploymentManager from "../deploymentAdmin.js";
import WebSocket from 'ws';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

class AkashLogsService {
    constructor() {
        this.BACKEND_URL = process.env.BACKEND_URL_DEV || "https://backend.ongrid.run/";
        this.WS_URL =  "ws://localhost:8087";
        
        this.deployments = new DeploymentManager();
    }

    async getLogs() {
        try {
            const jwt = await getTarget("jwt")
            const selectedDeployment = await this.getAkashDeployment();
            
            if (!selectedDeployment) {
                console.log(chalk.yellow("No Akash deployments found."));
                process.exit(0);
            }
            const response = await this.validateDeploymentAkash(selectedDeployment.providerId)           
            
            // Connect to WebSocket
            const ws = new WebSocket(`${this.WS_URL}`);
            
            
            
            ws.on('open', () => {
                
                // Primero, autenticación
                const authRequest = {
                    type: "auth",
                    token: jwt
                };
                ws.send(JSON.stringify(authRequest));

                // Luego, la petición de logs
                const { id, gseq, oseq } = response[0] || {};
                
                if (!id || !gseq || !oseq) {
                    console.error(chalk.red("❌ Faltan campos requeridos para la petición de logs (dseq, gseq, oseq)"));
                    ws.close();
                    return;
                }
                
                const logRequest = {
                    type: 'request-logs',
                    provider_uri: this.getProviderUri(selectedDeployment.uri),
                    dseq: id.toString(),
                    gseq: gseq.toString(),
                    oseq: oseq.toString(),
                };
                console.log(logRequest);
                
                ws.send(JSON.stringify(logRequest));
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    
                    if (message.type === "log") {
                        console.log(chalk.white(`[${new Date().toISOString()}] ${JSON.stringify(message.data, null, 2)}`));
                    } else if (message.type === 'error') {
                        console.error(chalk.red(`❌ Error: ${message.error}`));
                        process.exit(1)
                    } else if (message.type === 'status') {
                        console.log(chalk.yellow(`ℹ️  ${message.message}`));
                    }else if (message.type === "auth-error"){
                        console.error(chalk.red("🔒 Auth error: Your session has expired or you are not logged in. Please log in again."));
                    }
                } catch (error) {
                    console.log(chalk.white(data.toString()));
                }
            });

            ws.on('close', () => {
                console.log(chalk.yellow("🔌 WebSocket connection closed"));
                process.exit(0);
            });

            ws.on('error', (error) => {
                console.error(chalk.red(`❌ WebSocket error: ${error.message}`));
                process.exit(1);
            });

            // Handle process termination
            process.on('SIGINT', () => {
                console.log(chalk.yellow("\n🛑 Disconnecting..."));
                ws.close();
                process.exit(0);
            });

        } catch (error) {
            console.error(chalk.red("❌ Error fetching logs. If the problem persists, contact support@ongrid.run"));
            console.error(chalk.red(`Error details: ${error.message}`));
            process.exit(1);
        }
    }

    async getAkashDeployment() {
        try {
            const data = await this.deployments.getDeployments();

            const akashDeployments = data
                .filter(deployment => deployment.cloudProvider === "AKASH" && deployment.status === "Deployed")
                .map(deployment => ({
                    id: deployment.id,
                    providerId: deployment.providerId,
                    uri: deployment.uri,
                    status: deployment.status,
                    cloudProvider: deployment.cloudProvider
                }));

            if (akashDeployments.length === 0) {
                return null;
            }

            // Create choices for the selector
            const choices = akashDeployments.map(deployment => ({
                name: `${deployment.id} (DSEQ: ${deployment.providerId}, Provider_Uri: ${deployment.uri})`,
                value: deployment
            }));

            const { selectedDeployment } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'selectedDeployment',
                    message: 'Select an Akash deployment to view logs:',
                    choices
                }
            ]);

            return selectedDeployment;
        } catch (error) {
            console.error(chalk.red("❌ Error fetching Akash deployments. If the problem persists, contact support@ongrid.run"));
            process.exit(1);
        }
    }

  
    async validateDeploymentAkash(deployId) {
        try {
            const jwt = await this.jwt
            
            const response = await fetch(`${this.BACKEND_URL}logs/akash?deployId=${deployId}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${jwt}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json()
            
            return data
            
        } catch (error) {
            console.error(chalk.red(`Error`));
            throw error;
        }
    }

    getProviderUri(uri) {
        // Encuentra el índice del segundo punto
        const firstDot = uri.indexOf('.');
        const secondDot = uri.indexOf('.', firstDot + 1);
        if (secondDot === -1) return uri; // Si no hay dos puntos, devuelve igual
        return 'provider' + uri.slice(secondDot);
    }
}

export default AkashLogsService;
