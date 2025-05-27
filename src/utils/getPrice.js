import { log } from "console";
import dotenv from "dotenv";
import path from "path";


dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BACKEND_URL = process.env.BACKEND_URL_DEV || "http://backend.ongrid.run/"

export async function getPrice(config, jwt, provider) {
    try {
        const file = JSON.stringify(config)
        
        const response = await fetch(`${BACKEND_URL}deployments/price?cloudProvider=${provider}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwt}`
            },
            body: file
        });
        
        const data = await response.json();
        return Number(data.price);
    } catch (error) {
        console.error("Error fetching price");
        process.exit(1)
    }
}