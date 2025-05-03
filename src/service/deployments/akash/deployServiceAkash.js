import { getPrice } from "../../../utils/getPrice.js";
import { createSpinner } from "nanospinner";
import { getToken } from "../../../utils/auth.js";
import path from 'path';
import dotenv from "dotenv"
import inquirer from "inquirer";
import { getBalance } from "../../getBalance.js"
import { readConfigFile } from "../../../utils/authPath.js"


export const deployAkash = async (filePath) => {
    try {
        const jwt = await getToken();
        if (!jwt) {
            throw new Error("No authentication token found. Please login first.");
        }
        const config = await readConfigFile(filePath);

        console.log(config);

        const dataPrice = await getPrice(config, jwt, "AKASH")
        console.log(dataPrice);


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
        console.log(`Account Balance: $${userBalance}`);
        if (userBalance < dataPrice) {
            console.log(chalk.red("Please deposit credits by visiting https://ongrid.run/profile/billing or by using the CLI command grid stripe."));
            return;
        }

        // const response = await fetch("https://backend-dev.ongrid.run/akash", {
        //     method: "POST",
        //     headers: {
        //         "Accept": "application/json",
        //         "Content-type": "application/json",
        //         Authorization: `Bearer ${jwt}`,
        //     },
        //     body: yamlFile,
        // })

        const data = await response.json();

    } catch (error) {
        console.error("Error details:", error.message);
        throw error;
    }
}