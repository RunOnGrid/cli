
import chalk from 'chalk';
// import inquirer from "inquirer";
import { createSpinner } from "nanospinner";
import { getToken } from "../../../utils/keyChain.js";
import { getPassword } from "../../../utils/keyChain.js";
import { getSuitableNodeIps } from "../flux/fluxNodeService.js";
import path from 'path';
import dotenv from "dotenv"
import inquirer from "inquirer";
import { getBalance } from "../../../utils/getBalance.js"
import { getPrice } from "../../../utils/getPrice.js";
import { readConfigFile } from "../../../utils/authPath.js"
// import axios from "axios";


// Load .env from the project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BACKEND_URL = process.env.BACKEND_DEV_FLUX



export const deployFlux = async (filePath) => {
    try {
        const jwt = await getToken();
        const config = await readConfigFile(filePath, "FLUX");

        const dataPrice = await getPrice(config, jwt, "FLUX");

        if(isNaN(dataPrice)){
            console.error(chalk.red("Authorization Token expired, Please Log-in using(grid login --google/--github)"));
            return;
         }
        console.log(chalk.green("Price: $", dataPrice.toFixed(2)));
        

        const payments = await inquirer.prompt([
            {
                type: "choices",
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

        if (payments.paymentAuthorized === 'n') {
            console.log(chalk.red("Payment cancelled"))
            return;
        }
        const userBalance = await getBalance();

        if (userBalance < dataPrice) {
            console.log(chalk.red("Please deposit credits by visiting https://ongrid.run/profile/billing or by using the CLI command grid stripe."));
            return;
        }
        const spinner = createSpinner('Deploying your service...').start();
        const response = await fetch("https://backend-dev.ongrid.run/flux", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwt}`,
            },
            body: JSON.stringify(config)
        });
        const data = await response.json();
        if (data.informationDeploy.message == 'Insufficient balance') {
            spinner.error({ text: "Insufficient balance, charge credits at: https://dev.ongrid.run/profile/billing" });
            return;
        } else if (data.status === "success") {
            spinner.success({ text: "Deploy successful, check your deployments for more information", data });
            return;
        } else {
            spinner.error({ text: "status Failed" });
            return;
        }
    } catch (error) {
        console.error("Error details:", error.message);
        throw error;
    }
}

// async function getPrice(config, jwt) {
//     try {
//         const response = await fetch(`${process.env.BACKEND_URL_DEV}/deployments/price?cloudProvider=FLUX`, {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 "Authorization": `Bearer ${jwt}`
//             },
//             body: JSON.stringify(config)
//         });
//         const data = await response.json();
//         return Number(data.price);
//     } catch (error) {
//         console.error("Error fetching price", error);
//         throw new Error("Failed to get price");
//     }
// }

