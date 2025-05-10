import { getPrice } from "../../../utils/getPrice.js";
import { createSpinner } from "nanospinner";
import { getToken } from "../../../utils/keyChain.js";
import path from 'path';
import dotenv from "dotenv";
import inquirer from "inquirer";
import { getBalance } from "../../../utils/getBalance.js"
import { readConfigFile } from "../../../utils/authPath.js"
import yaml from "js-yaml";
import chalk from "chalk";



dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const deployAkash = async (filePath) => {
    try {
        const jwt = await getToken();
        const config = await readConfigFile(filePath, "AKASH");
        const dataPrice = await getPrice(config, jwt, "AKASH")

        // Assuming you want 2 decimal places for currency
        if (isNaN(dataPrice)) {
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
            console.log(chalk.red(`Account Balance: $${userBalance}`));
            console.log(chalk.red("Please deposit credits by visiting https://ongrid.run/profile/billing or by using the CLI command grid stripe."));
            return;
        }
        const akashYaml = yaml.dump(config, { indent: 2 });
        console.log(akashYaml);
        
        const spinner = createSpinner('Deploying your service...').start();

        const fetchWithTimeout = (url, options = {}, timeout = 400000) => {
            return Promise.race([
              fetch(url, options),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out')), timeout)
              ),
            ]);
          };
          
          try {
            const response = await fetchWithTimeout(`${process.env.BACKEND_URL_DEV}akash`, {
              method: "POST",
              headers: {
                "Accept": "text/plain",
                "Content-type": "text/plain",
                Authorization: `Bearer ${jwt}`,
              },
              body: akashYaml,
            }, 40000); // Timeout de 15 segundos
            const result = await response.json();
            
            if (result.status === 'error') {
              const errorText = await response.json();
              console.error('Error en el deploy:', errorText);
              spinner.error({text: "Error deploying, if problem persist: Support@ongrid.run"})
              process.exit(1);
            }
          
        
            spinner.success({text: `Deployment succesfull: ${result}`});
            process.exit(0);
          } catch (error) {
            spinner.error({text: "Error general al hacer fetch"})
            process.exit(1)
          }
          

    } catch (error) {
        console.error("Error details:", error.message);
        throw error;
    }
}