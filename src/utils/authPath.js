import path from "path";
import fs from "fs/promises";
import { getPassword } from "../utils/auth.js"; 
import { getSuitableNodeIps } from "../service/deployments/flux/fluxNodeService.js";

export async function readConfigFile(filePath, provider) {
    try {
        const normalizedPath = filePath.replace(/\\/g, '/');

        if (!path.isAbsolute(normalizedPath)) {
            throw new Error('Only absolute paths are allowed. Please provide the full path to your config file.');
        }

        await fs.access(normalizedPath);

        const fileContent = await fs.readFile(normalizedPath, 'utf8');

        let config;
        try {
            config = JSON.parse(fileContent);
        } catch (parseError) {
            throw new Error(`Invalid JSON format in config file: ${parseError.message}`);
        }

        let enhancedCompose;
        if (provider === "FLUX") {
             enhancedCompose = enhancedComposeFlux(config)
        }
       
        return enhancedCompose;
    } catch (error) {
        console.error('Error details:', error);
        throw new Error(`Error reading config file: ${error.message}`);
    }
}

async function enhancedComposeFlux(config){
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
        throw new Error(`Error reading config file: ${error.message}`)
    }
}
async function enhancedComposeAkash(config){
    try {
        const accessToken = await getPassword("Access token");

        const enhancedCompose = config.compose.map(service => ({
            ...service,
            password: accessToken,
        }));
        return enhancedCompose

    } catch (error) {
        throw new Error(`Error reading config file: ${error.message}`)
    }
}
