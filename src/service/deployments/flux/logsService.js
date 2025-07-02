import { getToken } from "../../../utils/keyChain.js";
import path from "path";
import dotenv from "dotenv";
import chalk from "chalk";
import DeploymentManager from "../deploymentAdmin.js"
import inquirer from 'inquirer';


dotenv.config({ path: path.resolve(process.cwd(), '.env') });


class logsService {

    constructor() {
        this.BACKEND_URL = process.env.BACKEND_URL_DEV || "https://backend.ongrid.run/";
        this.jwt = getToken();
        this.deployments = new DeploymentManager();
    }
    getProviderUri(uri) {
        // Encuentra el índice del segundo punto
        const firstDot = uri.indexOf('.');
        if (firstDot === -1) return uri; // Si no hay punto, devuelve todo
        return uri.slice(0, firstDot);
    }
    async getLogs() {
        try {
            const jwt = await this.jwt;
            const selectedApp = await this.getAppData();
            const ips = await this.getAppips(selectedApp.composeName)
            

            const response = await fetch(`${this.BACKEND_URL}logs/flux?composeName=${selectedApp.appName}&appName=${selectedApp.composeName}&ip=${ips}`, {
                method: "GET",
                headers: {
                    authorization: `Bearer ${jwt}`
                }
            })
            console.log(await response.json());
            process.exit(0);
        } catch (error) {
            console.error(chalk.red("❌ Error fetching logs. If the problem persists, contact support@ongrid.run"));
            process.exit(1)
        }
    }

    async getAppData() {
        try {
            const data = await this.deployments.getDeployments();
            
            const apps = data.map(app => ({
                composeName: app.configurationDetails?.name || false,
                appName: app.configurationDetails?.compose?.[0]?.name || false,
                image: app.configurationDetails?.compose?.[0]?.repotag || 'no-image',
                status: app.status || "no-status",
                cloudProvider: app.cloudProvider,
                uri: app.uri
            })).filter(app => app.status === "Deployed" && app.cloudProvider === "FLUX");
            // Crear las opciones para el selector
            const choices = apps.map(app => ({
                name: `${app.composeName} (${app.appName})`,
                value: app
            }));
            
            
            const { selectedApp } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'selectedApp',
                    message: 'Select an application:',
                    choices
                }
            ]);

            return selectedApp;
        } catch (error) {
            console.error(chalk.red("❌ Error fetching apps. If the problem persists, contact support@ongrid.run"));
            process.exit(1);
        }
    }
    async getAppips(appName) {
        try {
            const jwt = await this.jwt;
            const response = await fetch(`${this.BACKEND_URL}logs/ips/?appName=${appName}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${jwt}`
                }
            });

            const data = await response.json();

            const ips = data.ips?.map(ip => ({
                name: ip.originalIp || 'no-ip',
                value: ip.originalIp
            })) || [];

            const { selectedIp } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'selectedIp',
                    message: 'Select an IP:',
                    choices: ips
                }
            ]);
           
            return selectedIp.replace(/[.:]/g, "-");
        } catch (error) {
            console.error(chalk.red("❌ Error fetching ips. If the problem persists, contact support@ongrid.run"));
            process.exit(1);
        }
    }
}

export default logsService