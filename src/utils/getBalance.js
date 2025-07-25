import { getToken } from "./keyChain.js";
import path from 'path';
import dotenv from "dotenv"


// Load .env from the project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BACKEND_URL = "http://backend.ongrid.run/";

export const getBalance =async()=>{
    try {
        const jwt = await getToken()
        const response = await fetch(`${BACKEND_URL}user/balance`,{
            method: "GET",
            headers:{
                "Authorization": `Bearer ${jwt}`
            }
    })
    
    const data = response.json();
    return data;
    } catch (error) {
        console.error('❌ Error fetching price');
        process.exit(1);
        
    }
}