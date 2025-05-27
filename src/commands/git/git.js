import { Command } from "commander";
import { redirectGit, getRepositories, gridWorkflow } from "../../service/git/git.js"


export const gitCommands = new Command("git");

const repos = new Command("repos")
    .description("Fetch repositories").action(async () => {
        await getRepositories()
    })
const build = new Command("build")
    .description("Build a runnable container image from github repository").action(async () => {
        await gridWorkflow()
    })
const connectGit = new Command("connect")
    .description("Connect Github App")
    .action(async () => {
        await redirectGit();
    })

gitCommands.addCommand(repos);
gitCommands.addCommand(build);
gitCommands.addCommand(connectGit);





