import chalk from 'chalk';
// import inquirer from "inquirer";
import { createSpinner } from "nanospinner";
import { getToken } from "../../../utils/keyChain.js";
import path from 'path';
import dotenv from "dotenv"
import inquirer from "inquirer";
import { getBalance } from "../../../utils/getBalance.js"
import { getPrice } from "../../../utils/getPrice.js";
import ConfigFileManager from "../../../utils/authPath.js"
// import axios from "axios";

const manager = new ConfigFileManager();
// Load .env from the project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BACKEND_URL = process.env.BACKEND_URL_DEV ||"https://backend.ongrid.run/"


export const deployFlux = async (filePath) => {
    try {
        const jwt = await getToken();
        
        const config = await manager.readConfigFile(filePath, "FLUX");
        console.log(config);

        const dataPrice = await getPrice(config, jwt, "FLUX");
        
        if (isNaN(dataPrice)) {
            console.error(chalk.red("Authorization Token expired, Please Log-in using(grid login google/github)"));
            return;
        }
        console.log(chalk.green("Price: $", dataPrice.toFixed(2)));

        const payments = await inquirer.prompt([
            {
                type: "list",
                name: "paymentAuthorized",
                message: "Authorize payment(y/n)",
                choices: [
                    {
                        name: 'y',
                        value: true
                    },
                    {
                        name: 'n',
                        value: false
                    }
                ],
            }
        ]);

        if (payments.paymentAuthorized === false) {
            console.log(chalk.red("Payment cancelled"))
            process.exit(1)
        }
        const userBalance = await getBalance();

        if (userBalance < dataPrice) {
            console.log(chalk.red("Please deposit credits by visiting https://ongrid.run/profile/billing or by using the CLI command grid stripe."));
            process.exit(1)
        }
        const spinner = createSpinner('Deploying your service...').start();
        const response = await fetch(`${BACKEND_URL}flux`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwt}`,
            },
            body: JSON.stringify(config)
        });        
        const data = await response.json();
        if (data.status === "success") {
            console.log(data);
            spinner.success({ text: "Deploy successful, check your deployments for more information"});
            process.exit(0);
        } else {
            spinner.error({ text: "Error deploying, if problem persist: Support@ongrid.run" });
            process.exit(1);
        }
    } catch (error) {
        console.error("Error fetching, check if deployment was succesfull by using grid deployment list. if problem persist: Support@ongrid.run");
        throw error;
    }
}
