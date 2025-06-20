import { Command } from "commander";
import GridGitManager from "../../service/git/git.js"
import chalk from "chalk";

const manager = new GridGitManager(); 


export const gitCommands = new Command("git")
    .description("GitHub repository management")

const repos = new Command("repos")
    .description("Fetch repositories").action(async () => {
        const data = await manager.getRepositories();
        console.log(data);
    })
const build = new Command("build")
    .description("Build a runnable container image from github repository").action(async () => {
        await manager.gridWorkflow();
    })
const connectGit = new Command("connect")
    .description("Connect Github App")
    .action(async () => {
        try {
            await manager.redirectGit();
        } catch (error) {
            process.exit(1);
        }
    })


gitCommands.addCommand(repos);
gitCommands.addCommand(build);
gitCommands.addCommand(connectGit);





