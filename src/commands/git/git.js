import { Command } from "commander";
import {redirectGit, getRepositories} from "../../service/git/git.js"


export const gitCommand = new Command("git app")
    .description("Connect Github App")
    .command("git")
    .option("--repos", "fetch repositories")
    .action(async (options)=>{
        if(options.repos){
            const response = await getRepositories()
            console.log(response);
        }else{
            await redirectGit();
        }
    })
