import { getToken } from "../../../utils/keyChain.js";
import path from "path";
import dotenv from "dotenv";
import chalk from "chalk";
import DeploymentManager from "../deploymentAdmin.js";
import inquirer from 'inquirer';
import WebSocket from 'ws';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

class AkashLogsService {
    constructor() {
        this.BACKEND_URL = process.env.BACKEND_URL || "https://localhost:8087/";
        this.WS_URL = process.env.WS_URL_DEV || "ws://localhost:8087";
        this.jwt = getToken();
        this.deployments = new DeploymentManager();
    }

    async getLogs() {
        try {
          
            const selectedDeployment = await this.getAkashDeployment();

            if (!selectedDeployment) {
                console.log(chalk.yellow("No Akash deployments found."));
                process.exit(0);
            }

            console.log(chalk.blue("🔌 Connecting to WebSocket for real-time logs..."));
            
            // Connect to WebSocket
            const ws = new WebSocket(`${this.WS_URL}`);
            
            ws.on('open', () => {
                console.log(chalk.green("✅ Connected to WebSocket server"));
                
                // Send request for logs
                const logRequest = {
                    type: 'request-logs',
                    provider_uri: selectedDeployment.provider_uri,
                    dseq: selectedDeployment.dseq,
                    gseq: selectedDeployment.gseq,
                    oseq: selectedDeployment.oseq
                };
                
                ws.send(JSON.stringify(logRequest));
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    
                    if (message.type === 'log') {
                        // Display log message
                        console.log(chalk.cyan(`[${new Date().toISOString()}] ${message.content}`));
                    } else if (message.type === 'error') {
                        console.error(chalk.red(`❌ Error: ${message.error}`));
                    } else if (message.type === 'status') {
                        console.log(chalk.yellow(`ℹ️  ${message.message}`));
                    }
                } catch (error) {
                    // If it's not JSON, treat as raw log data
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
                    id: deployment.configurationDetails.id,
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

    // Alternative method for direct connection without WebSocket (fallback)
    async getLogsDirect(provider_uri, dseq, gseq, oseq) {
        try {
            const jwt = await this.jwt;
            
            const response = await fetch(`${this.BACKEND_URL}logs/akash`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`
                },
                body: JSON.stringify({
                    provider_uri,
                    dseq,
                    gseq,
                    oseq
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const logs = await response.json();
            console.log(chalk.cyan("📋 Deployment Logs:"));
            console.log(logs);
            
        } catch (error) {
            console.error(chalk.red("❌ Error fetching logs directly:"));
            console.error(chalk.red(`Error details: ${error.message}`));
            throw error;
        }
    }
}

export default AkashLogsService;
