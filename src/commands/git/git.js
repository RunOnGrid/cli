import { Command } from "commander";
import { redirectGit, getRepositories, gridWorkflow } from "../../service/git/git.js"
import { getToken } from '../../utils/keyChain.js';

export const gitCommands = new Command("git")
    .description("GitHub repository management")
    .action(async () => {
        const token = await getToken();
        // Implement git commands logic here
        console.log('Git commands');
    });

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





