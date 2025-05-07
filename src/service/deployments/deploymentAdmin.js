import {getToken} from "../../utils/keyChain.js";
import path from "path";
import dotenv from "dotenv"

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const getDeployments = async () => {
    try {
        const jwt = await getToken()
        const response = await fetch(`${process.env.BACKEND_URL_DEV}deployments`, {
            method: "GET",
            headers: {
                "Accept": "*/*",
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwt}`,
            },
            
        });
        if (!response.ok) {
            throw new Error('Error fetching deployments');
          }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("Error fetching deployments, if the error persist please contact support@ongrid.run");
    }
}

export const getDeploymentById= async(id) =>{
    try {
        const jwt = await getToken()
        const response = await fetch(`${process.env.BACKEND_URL_DEV}deployments/${id}`, {
            method: "GET",
            headers: {
                "Accept": "*/*",
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwt}`,
            },
            
        });
        if (!response.ok) {
            throw new Error(`Error fetching deployment, if the error persist please contact support@ongrid.run`);
          }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching deployment, if the error persist please contact support@ongrid.run");
    }
}
export const refundAkash = async(id) =>{
    try {
        const jwt = await getToken();
        const response = await fetch(`${process.env.BACKEND_URL_DEV}akash/${id}`,{
            method: "POST",
            headers:{
                "Accept": "*/*",
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwt}`,
            },
        })
        const data = response.json();
        return data;
    } catch (error) {
        console.error("Error refunding deployment, if the error persist please contact support@ongrid.run")
    }
}