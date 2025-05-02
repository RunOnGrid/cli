
import { getToken } from "../utils/auth.js";
import path from 'path';
import dotenv from "dotenv"


// Load .env from the project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BACKEND_URL = process.env.BACKEND_URL_DEV;

export const getBalance =async()=>{
    try {
        const jwt = await getToken()
        const response = await fetch(`${BACKEND_URL}/user/balance`,{
            method: "GET",
            headers:{
                "Authorization": `Bearer ${jwt}`
            }
    })
    const data = response.json();
    return data;
    } catch (error) {
        throw new Error("Not able to fetch account balance")
    }
}