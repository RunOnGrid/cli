import { Command } from "commander";
import {redirectGit, getRepositories, gridWorkflow} from "../../service/git/git.js"
import { savePassword } from "../../utils/keyChain.js";


export const gitCommand = new Command("git app")
    .description("Connect Github App")
    .command("git")
    .option("--repos", "fetch repositories")
    .option("--build", "build repository")
    .option("--token <token>", "set personal access token")
    .action(async (options) => {
        if (options.repos) {
            const response = await getRepositories();
            console.log(response);
        } else if (options.build) {
           await gridWorkflow();
        }else if(options.token){
            console.log(options.token); 
            await savePassword("Access token",options.token);
        }
         else {
            await redirectGit();
        }
    });



