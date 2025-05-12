import chalk from "chalk";
import axios from "axios";
import dotenv from "dotenv";
import path from 'path';


dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const FLUX_URL = process.env.FLUX_API_URL || "https://api.runonflux.io/"
export async function getSuitableNodeIps(count = 10) { // Puedes hacer el conteo un parámetro con valor por defecto
    try {
       
        const enterpriseNodes = await getEnterpriseNodes();
        
        
        
        const filteredNodes = filterEnterpriseNodes(enterpriseNodes);
    
        
        const selectedNodes = selectBestNodes(filteredNodes, count);
        
        const nodeIps = selectedNodes.map((node) => node.ip);

        if (nodeIps.length === 0) {
             console.warn(chalk.yellow("Enterprise nodes not found"));
        }


        return nodeIps;

    } catch (error) {
        // Capturar errores de cualquier paso interno y propagar un error más descriptivo
        console.error(chalk.red('Error al obtener los IPs de nodos adecuados:'), error.message);
        // Puedes loguear el error completo si es necesario para depuración: console.error(error);
        throw new Error('No se pudieron obtener los IPs de nodos necesarios para el despliegue.');
    }
}



async function getEnterpriseNodes() {
    
    const enterpriseUrlNodes = `${FLUX_URL}apps/enterprisenodes`;
    try {
        
        const response = await axios.get(enterpriseUrlNodes);
        if (response.data.status !== 'success') {
            throw new Error('Failed to get enterprise nodes: ' + response.data.message);
        }
        // set to redis

        return response.data.data;
    } catch (error) {
        console.error('Error fetching enterprise nodes:', error);
        throw new Error('Could not retrieve enterprise nodes');
    }
}

function filterEnterpriseNodes(nodes) {
    return nodes.filter((node) => node.score > 85 && node.maturityPoints > 50);
}

function selectBestNodes(nodes, count) {
    // get first 10 nodes
    return nodes.slice(0, count);
}

