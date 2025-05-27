import path from "path";
import fs from "fs/promises";
import { getSuitableNodeIps } from "../service/deployments/flux/fluxNodeService.js";
import yaml from "js-yaml"

export async function readConfigFile(filePath, provider) {
    try {
        const normalizedPath = filePath.replace(/\\/g, '/');

        if (!path.isAbsolute(normalizedPath)) {
            console.error('Only absolute paths are allowed. Please provide the full path to your config file.');
            process.exit(1);
        }

        await fs.access(normalizedPath);
        const fileContent = await fs.readFile(normalizedPath, 'utf8');

        if (provider === "FLUX") {
            let parsed;
            try {
                parsed = JSON.parse(fileContent);
            } catch (jsonErr) {
                console.error("❌ Invalid config format: Expected JSON for FLUX but received invalid format or YAML.");
                process.exit(1);
            }

            if (parsed.repoAuth && parsed.repoAuth.trim() !== "" && parsed.tierd === true) {
                return await enhancedComposeFlux(fileContent);
            }

            return parsed;
        }

        if (provider === "AKASH") {
            try {
                return yaml.load(fileContent);
            } catch (yamlErr) {
                console.error("❌ Invalid config format: Expected YAML for AKASH but received invalid or malformed content.");
                process.exit(1);
            }
        }

        console.error(`❌ Unsupported provider: ${provider}. Supported providers are "FLUX" and "AKASH".`);
        process.exit(1);

    } catch (error) {
        console.error('❌ Error accessing config file');
        process.exit(1);
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
                config = yaml.dump(fileContent);
                console.log(config);
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
        console.error("Error in enhancedCompose:", error.message);
    }
}
async function enhancedComposeFlux(fileContent) {
    try {
        const selectedNodes = await getSuitableNodeIps();
        const config = await enhancedCompose("FLUX", fileContent);

        if (!config) throw new Error("Invalid config");

        config.nodes = selectedNodes;

        return config;
    } catch (error) {
        console.error(`Error reading config file: ${error.message}`);
    }
}
// async function enhancedComposeAkash(config) {
//     try {
//         const accessToken = await getPassword("Access token");
//         config.services["service-1"].credentials.password = accessToken

//         return config;

//     } catch (error) {
//         throw new Error(`Error reading config file: ${error.message}`)
//     }
// }
