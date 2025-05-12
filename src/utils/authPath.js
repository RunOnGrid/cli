import path from "path";
import fs from "fs/promises";
import { getPassword } from "./keyChain.js";
import { getSuitableNodeIps } from "../service/deployments/flux/fluxNodeService.js";
import yaml from "js-yaml"

export async function readConfigFile(filePath, provider) {
    try {
        const normalizedPath = filePath.replace(/\\/g, '/');

        if (!path.isAbsolute(normalizedPath)) {
            throw new Error('Only absolute paths are allowed. Please provide the full path to your config file.');
        }

        await fs.access(normalizedPath);


        const fileContent = await fs.readFile(normalizedPath, 'utf8');
        let config;


        return enhancedComposeFlux(config);


        return enhancedComposeAkash(config);


    } catch (error) {
        console.error('Error details:', error);
        return;
    }
}

async function enhancedComposeFlux(config) {
    try {
        const accessToken = await getPassword("Access token");
        const selectedNodes = await getSuitableNodeIps();

        const enhancedCompose = config.compose.map(service => ({
            ...service,
            repoauth: `BenjaminAguirre:${accessToken}`,
        }));
        return {
            ...config,
            compose: enhancedCompose,
            nodes: selectedNodes
        }

    } catch (error) {
        console.error(`Error reading config file: ${error.message}`)
    }
}
async function enhancedComposeAkash(config) {
    try {
        const accessToken = await getPassword("Access token");
        config.services["service-1"].credentials.password = accessToken

        return config;

    } catch (error) {
        throw new Error(`Error reading config file: ${error.message}`)
    }
}

export async function enhancedCompose(provider, fileContent) {
    try {
        let config;
        if (provider === "FLUX") {
            try {
                config = JSON.parse(fileContent);
                return config;
            } catch (parseError) {
                console.error(`Invalid JSON format for FLUX config file: ${parseError.message}`);
                return;
            }
        } else if (provider === "AKASH") {
            try {
                config = yaml.load(fileContent);
                return config;
            } catch (parseError) {
                console.error(`Error parsing AKASH config file as YAML: ${parseError.message}`);
                return;
            }
        } else {
            console.error(`Unsupported provider: ${provider}. Supported providers are "FLUX" and "AKASH".`);
            return;
        }
    } catch (error) {

    }
}
