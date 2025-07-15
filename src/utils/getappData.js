import { getToken } from "./keyChain.js";
import path from "path";
import dotenv from "dotenv";
import chalk from "chalk";
import DeploymentManager from "../service/deployments/deploymentAdmin.js"
import inquirer from 'inquirer';


dotenv.config({ path: path.resolve(process.cwd(), '.env') });


class appDataFlux {

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
            if (!selectedIp.includes(":")) {
                const formatedIp = selectedIp + ":16127"
                return formatedIp.replace(/[.:]/g, "-");
            }

            return selectedIp.replace(/[.:]/g, "-");
        } catch (error) {
            console.error(chalk.red("❌ Error fetching ips. If the problem persists, contact support@ongrid.run"));
            process.exit(1);
        }
    }
}

export default appDataFlux