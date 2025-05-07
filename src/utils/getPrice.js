import dotenv from "dotenv";
import path from "path";


dotenv.config({ path: path.resolve(process.cwd(), '.env') });


export async function getPrice(config, jwt, provider) {
    try {
        
        const response = await fetch(`${process.env.BACKEND_URL_DEV}deployments/price?cloudProvider=${provider}`, {
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