import { getPrice } from "../../../utils/getPrice.js";
import { createSpinner } from "nanospinner";
import { getToken } from "../../../utils/keyChain.js";
import path from 'path';
import dotenv from "dotenv";
import inquirer from "inquirer";
import { getBalance } from "../../../utils/getBalance.js"
import ConfigFileManager from "../../../utils/authPath.js"
import yaml from "js-yaml";
import chalk from "chalk";

const manager = new ConfigFileManager();

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BACKEND_URL = "http://backend.ongrid.run/"

export const deployAkash = async (filePath) => {
    try {
        const jwt = await getToken();
      
        const config = await manager.readConfigFile(filePath, "AKASH");
        const dataPrice = await getPrice(config, jwt, "AKASH");
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
            process.exit(1);
        }
        const userBalance = await getBalance();
        
        
        if (userBalance < dataPrice) {
            console.log(chalk.red(`Account Balance: $${userBalance}`));
            console.log(chalk.red("Please deposit credits by visiting https://ongrid.run/profile/billing or by using the CLI command grid stripe."));
            process.exit(1);
        }
        const akashYaml = yaml.dump(config, { indent: 2 });
        console.log(akashYaml);
        
        const spinner = createSpinner('Deploying your service...').start();

        const fetchWithTimeout = (url, options = {}, timeout = 7000000) => {
            return Promise.race([
              fetch(url, options),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out')), timeout)
              ),
            ]);
          };
          
          try {
            const response = await fetchWithTimeout(`${BACKEND_URL}akash`, {
              method: "POST",
              headers: {
                "Accept": "text/plain",
                "Content-type": "text/plain",
                Authorization: `Bearer ${jwt}`,
              },
              body: akashYaml,
            }, 7000000);
            const result = await response.json();
            
            if (result.status === 'error') {
              const errorText = await response.json();
              console.error(errorText);
              spinner.error({text: "Error deploying, if problem persist: Support@ongrid.run"})
              process.exit(1);
            }
            console.log(result);
            spinner.success({text: "Sucess"});
            process.exit(0);
          } catch (error) {
            spinner.error({text: "Error fetching,check if deployment succesfull by using grid deployment list. if problem persist: Support@ongrid.run"})
            process.exit(1)
          }
          

    } catch (error) {
        console.error("Error details:", error.message);
        throw error;
    }
}