import dotenv from "dotenv";
import path from "path";


dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BACKEND_URL = process.env.BACKEND_URL_DEV || "http://backend-dev.ongrid.run/"

export async function getPrice(config, jwt, provider) {
    try {
        
        const response = await fetch(`${BACKEND_URL}deployments/price?cloudProvider=${provider}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwt}`
            },
            body: JSON.stringify(config)
        });

        const data = await response.json();
        return Number(data.price);
    } catch (error) {
        console.error("Error fetching price", error);
        throw new Error("Failed to get price");
    }
}