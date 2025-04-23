import fs from 'fs/promises';
import chalk from 'chalk';
// import inquirer from "inquirer";
import { createSpinner } from "nanospinner";
import { fileURLToPath } from "url";
import { getToken } from "../../utils/auth.js";
import { getPassword } from "../../utils/auth.js";
import path from 'path';
import dotenv from "dotenv"
// import axios from "axios";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BACKEND_URL = process.env.BACKEND_DEV_FLUX;

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
        


        // Validar que el JSON es válido
        let config;
        try {
            config = JSON.parse(fileContent);
        } catch (parseError) {
            throw new Error(`Invalid JSON format in config file: ${parseError.message}`);
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
        const randomName = Math.random().toString(36).substring(7);
        
        
        
        // Crear un nuevo objeto con el orden específico de campos
        // const enhancedConfig = {
        //     version: 7,
        //     name: randomName,
        //     description: "test application",
        //     owner: "1XcNTEsgVND4eb3bsVa2bjktnZZSruVct",
        //     compose: config.compose.map(service => ([{
        //         name: service.name,
        //         description: service.description,
        //         repotag: service.repotag,
        //         ports: service.ports || 31553,
        //         domains: service.domains,
        //         environmentParameters: service.environmentParameters,
        //         commands: service.commands,
        //         containerPorts: service.containerPorts || 8080,
        //         containerData: service.containerData,
        //         cpu: service.cpu,
        //         ram: service.ram,
        //         hdd: service.hdd,
        //         tiered: service.tiered,
        //         secrets: service.secrets,
        //         repoauth: "",
        //     }])),
        //     instances: config.instances,
        //     contacts: config.contacts ,
        //     geolocation: config.geolocation ,
        //     expire: config.expire,
        //     nodes: ["78.46.32.12","65.108.76.194","176.9.51.185","176.9.51.189","176.9.51.186","167.235.215.12","65.108.76.195","65.109.90.135","65.109.91.210","65.109.90.134"],
        //     staticip: config.staticip
        // };

        
        // return enhancedConfig;
    } catch (error) {
        throw new Error(`Error enhancing config: ${error.message}`);
    }
}

export const deployFlux = async (config) => {
    try {
        const jwt = await getToken();
        if (!jwt) {
            throw new Error("No authentication token found. Please login first.");
        }

        // Si config es una ruta de archivo, leer el archivo
        if (typeof config === 'string') {
            try {
                config = await readConfigFile(config);
                console.log(config);
                
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
        // const enhancedConfig = await enhanceConfig(config);

        // Verificar la estructura del JSON
        // console.log('Enhanced Configuration Structure:');
        // console.log(JSON.stringify(enhancedConfig, null, 2));

        const dataPrice = await fetch(`https://api.runonflux.io/apps/calculatefiatandfluxprice`, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain"
            },
            body: JSON.stringify(config)
        });
        
        const price = await dataPrice.json();
        console.log(price);


        // const spinner = createSpinner('Deploying your service...').start();
        // const response = await fetch("https://backend-dev.ongrid.run/flux", {
        //     method: "POST",
        //     headers: {
        //         "Accept": "application/json",
        //         "Content-Type": "application/json",
        //         "Authorization": `Bearer ${jwt}`,
        //     },
        //     body: JSON.stringify(enhancedConfig)
        // });

        // if (!response.ok) {
        //     const errorText = await response.text();
        //     throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        // }
        // const data = await response.json();
        // if (data.informationDeploy.message == 'Insufficient balance') {
        //     spinner.error({ text: "Insufficient balance, charge credits at: https://dev.ongrid.run/profile/billing" });
        //     return;
        // }
        // spinner.success({ text: "Deploy successful, check your deployments for more information" });
        // console.log(data);

    } catch (error) {
        console.error("Error details:", error.message);
        throw error;
    }
}

// async function getEnterpriseNodes() {
//     const enterpriseUrlNodes = `${process.env.FLUX_API_URL}/apps/enterprisenodes`;
//     try {
//         const response = await axios.get(enterpriseUrlNodes);
//         if (response.data.status !== 'success') {
//             throw new Error('Failed to get enterprise nodes: ' + response.data.message);
//         }
//         // set to redis
    
//         return response.data.data;
//     } catch (error) {
//         console.error('Error fetching enterprise nodes:', error);
//         throw new Error('Could not retrieve enterprise nodes');
//     }
// }

// function filterEnterpriseNodes(nodes) {
//     return nodes.filter((node) => node.score > 85 && node.maturityPoints > 50);
// }

// function selectBestNodes(nodes, count) {
//     // get first 10 nodes
//     return nodes.slice(0, count);
// }

export const deployAkash = async (jwt, config) => {
    try {
        const response = await fetch("https://backend-dev.ongrid.run/akash", {
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