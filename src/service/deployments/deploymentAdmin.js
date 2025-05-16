import { getToken } from "../../utils/keyChain.js";
import path from "path";
import dotenv from "dotenv";
import chalk from "chalk";
import { getBalance } from "../../utils/getBalance.js";


dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BACKEND_URL = process.env.BACKEND_URL_DEV || "http://backend.ongrid.run/"
export const getDeployments = async () => {
    try {
        const jwt = await getToken()
        const response = await fetch(`${BACKEND_URL}deployments`, {
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

export const getDeploymentById = async (id) => {
    try {
        const jwt = await getToken()
        const response = await fetch(`${BACKEND_URL}deployments/${id}`, {
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
export const deleteDeployment = async (id) => {
    try {
        const jwt = await getToken();
        const response = await fetch(`${BACKEND_URL}deployments/${id}`, {
            method: "DELETE",
            headers: {
                "Accept": "*/*",
                Authorization: `Bearer ${jwt}`
            },
        })

        const data = await response.json();

        if (data == 1) {
            console.log(chalk.green("Deployment successfully deleted"))
            process.exit(0);
        } else {
            spinner.error({ text: "Error deleting deployment, if problem persist: Support@ongrid.run" });
            process.exit(1);
        }
    } catch (error) {
        console.error("Error deleting deployment, if the error persist please contact support@ongrid.run")
    }
}

export const updateDeployment = async (id, filepath, provider) => {
    try {
        const jwt = await getToken();

        const response = await fetch(`${BACKEND_URL}deployments/${id}?cloudProvider=${provider}`, {
            method: "PUT",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwt}`,
            },
            body: JSON.stringify(filepath)
        })

    } catch (error) {
        console.error("Error updating deployment, if the error persist please contact support@ongrid.run")
    }
}

export const refundAkash = async (id) => {
    try {
    
        const jwt = await getToken();
        const response = await fetch(`${BACKEND_URL}akash/refund/${id}`, {
            method: "POST",
            headers: {
                "Accept": "*/*",
                Authorization: `Bearer ${jwt}`,
            },
        })

        const data = await response.json();

        if (data.status === 'success') {
            console.log(chalk.green(`Refund completed successfully. refund amount ${data.refundAmount}`));
            process.exit(0);
        }
        console.log(chalk.red("Error: please verify that the deployment has not already been marked as refunded or failed."));
        process.exit(1)
    } catch (error) {
        console.error("Error refunding deployment, if the error persist please contact support@ongrid.run")
    }
}