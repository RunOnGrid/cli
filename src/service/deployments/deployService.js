import fs from 'fs/promises';
import chalk from 'chalk';
// import inquirer from "inquirer";
import { createSpinner } from "nanospinner";
import { getToken } from "../../utils/auth.js";
import { getPassword } from "../../utils/auth.js";
import path from 'path';



// async function askDeployConfig() {
//     return await inquirer.prompt([
//         { name: "name", type: "input", message: "Service Name:" },
//         { name: "image", type: "input", message: "Docker Image (repotag):" },
//         { name: "containerPorts", type: "number", message: "Container Port (e.g. 8080):", default: 8080 },
//     ]);
// }
export async function readConfigFile(filePath) {
    try {
        
        // Normalizar la ruta para todos los sistemas operativos
        const normalizedPath = filePath.replace(/\\/g, '/');
        console.log('Normalized path:', normalizedPath);
        
        // Verificar que la ruta es absoluta
        if (!path.isAbsolute(normalizedPath)) {
            throw new Error('Only absolute paths are allowed. Please provide the full path to your config file.');
        }

        // Verificar si el archivo existe
        try {
            await fs.access(normalizedPath);
            console.log(`Found config file at: ${normalizedPath}`);
        } catch (error) {
            throw new Error(`Config file not found at: ${normalizedPath}`);
        }

        // Leer el archivo
        const fileContent = await fs.readFile(normalizedPath, 'utf8');
        console.log(fileContent);
        
        
        // Validar que el JSON es válido
        let config;
        try {
            config = JSON.parse(fileContent);
        } catch (parseError) {
            throw new Error(`Invalid JSON format in config file: ${parseError.message}`);
        }

        // Validar la estructura básica del JSON
        if (!config.name || !config.compose || !Array.isArray(config.compose)) {
            throw new Error('Invalid config file structure. Must contain name and compose array');
        }

        return config;
    } catch (error) {
        console.error('Error details:', error);
        throw new Error(`Error reading config file: ${error.message}`);
    }
}

async function enhanceConfig(config) {
    try {
        // Obtener el token de acceso
        const accessToken = await getPassword("Access token");
        
        // Crear una copia profunda del config para no modificar el original
        const enhancedConfig = JSON.parse(JSON.stringify(config));
        
        // Agregar el token a cada servicio en el compose
        enhancedConfig.compose = enhancedConfig.compose.map(service => ({
            ...service,
            repoauth: accessToken
        }));

        return enhancedConfig;
    } catch (error) {
        throw new Error(`Error enhancing config: ${error.message}`);
    }
}

export const deployFlux = async(config) => {
    try {
        const jwt = await getToken();
        if (!jwt) {
            throw new Error("No authentication token found. Please login first.");
        }

        // Si config es una ruta de archivo, leer el archivo
        if (typeof config === 'string') {
            try {
                config = await readConfigFile(config);
            } catch (error) {
                console.error(chalk.red(error.message));
                console.log(chalk.yellow('\nExample of a valid config file structure:'));
                console.log(JSON.stringify({
                    name: "my-service",
                    description: "service-description",
                    compose: [{
                        name: "container-name",
                        description: "container-description",
                        repotag: "image:tag",
                        ports: [36522],
                        domains: [""],
                        environmentParameters: [],
                        commands: [],
                        containerPorts: [8080],
                        containerData: "/data",
                        cpu: 1,
                        ram: 1024,
                        hdd: 10,
                        tiered: false,
                        secrets: "",
                        repoauth: "" // Este campo se agregará automáticamente
                    }]
                }, null, 2));
                throw error;
            }
        }

        // Mejorar la configuración con el token de acceso
        const enhancedConfig = await enhanceConfig(config);

        const spinner = createSpinner('Deploying your service...').start();
        const response = await fetch("https://backend-dev.ongrid.run/flux", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwt}`,
            },
            body: JSON.stringify(enhancedConfig)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const data = await response.json();
        if (data.informationDeploy.message == 'Insufficient balance') {
            spinner.error({ text: "Insufficient balance, charge credits at: https://dev.ongrid.run/profile/billing" });
            return;
        }
        spinner.success({ text: "Deploy successful, check your deployments for more information" });
        console.log(data);
        
    } catch (error) {
        console.error("Error details:", error.message);
        throw error;
    }
}

export const deployAkash = async(jwt, config) =>{
    try {
        const response = await fetch("https://backend-dev.ongrid.run/akash",{
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-type": "application/json",
                Authorization: `Bearer ${jwt}`,
            }
            
        })
    } catch (error) {
        
    }
}