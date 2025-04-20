import open from 'open';
import dotenv from "dotenv"
import {getPassword} from "../../utils/auth.js"
import { fileURLToPath } from 'url';
import path from 'path';
import inquirer from "inquirer";
import { createSpinner } from "nanospinner";
import chalk from "chalk"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);




dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const git_url = process.env.GIT_URL;

export const redirectGit = async() =>{
    try {
        console.log(process.env.GIT_URL);
        open("https://github.com/apps/grid-connector-for-github-dev/installations/select_target")
    } catch (error) {
        throw new error()
    }
} 

export const getRepositories = async() =>{
    try {
        const id = await getPassword("userId");
    
        const response = await fetch(`https://dev.ongrid.run/api/repositories-proxy?installationId=${id}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          })
        const data = await response.json();
        return data.message;
    } catch (error) {
        throw new Error(error)
    }
}

export async function selectRepo(repositories) {
    const choices = repositories.map(repo => ({
        name: repo.fullName,
        value: repo.fullName,
        installationId: repo.installationId
    }));
    
    const { selectedRepo } = await inquirer.prompt([
        {
            type: "list",
            name: "selectedRepo",
            message: "Select a repository:",
            choices: choices
        }
    ]);

    const { branch } = await inquirer.prompt([
        {
            name: "branch",
            type: "input",
            message: "Enter branch name:",
            default: "main"
        }
    ]);

    const selectedChoice = choices.find(choice => choice.value === selectedRepo);
    
    return { 
        repo: selectedRepo.split('/')[1], 
        branch, 
        owner: selectedRepo.split('/')[0].toLowerCase(), 
        installationId: selectedChoice.installationId 
    };
}

export const gridWorkflow = async() => {
    try {
        const spinner = createSpinner(`Fetching available repositories`).start();
        const repositoriesData = await getRepositories();
        spinner.stop();
        
        const { repo, branch, owner, installationId } = await selectRepo(repositoriesData);
    
        
        const response = await fetch(`${git_url}/workflows/run`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                installationId,
                owner,
                repo,
                workflow: "grid-ci.yml",
                branch,
            }),
        });
        const data = await response.json();
        
        console.log(chalk.gray('\nWorkflow URL:'), chalk.underline.green(data.workflow_url));
        console.log(chalk.gray('(Opening workflow in your browser...)\n'));
        await open(data.workflow_url);
        
        await checkWorkFlow(installationId, owner, repo, data.runId);
    } catch (error) {
        throw new Error(error);
    }
}

export const checkWorkFlow = async(installationId, owner, repo, runId) => {
    const spinner = createSpinner('Checking workflow status...').start();
    
    return new Promise((resolve, reject) => {
        const checkStatus = async () => {
            try {
                
                const response = await fetch(
                    `${git_url}/workflows/status?installationId=${installationId}&owner=${owner}&repo=${repo}&runId=${runId}`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
                const data = await response.json();
                
                
                if (data.workflow_run.status === 'completed') {
                    spinner.success({ text: 'Workflow completed successfully!' });
                    console.log(`Container URL: ghcr.io/${owner}/${repo}:latest `);
                    resolve(data);
                    return data 
                } else if (data.workflow_run.status === 'error') {
                    spinner.error({ text: 'Workflow failed!' });
                    reject(new Error('Workflow failed'));
                } else {
                    spinner.update({ text: `Workflow status: ${data.workflow_run.status}...` });
                    setTimeout(checkStatus, 3000); // Check every 5 seconds
                }
            } catch (error) {
                spinner.error({ text: 'Error checking workflow status' });
                reject(error);
            }
        };

        checkStatus();
    });
}

//{"installationId":"62387777","owner":"benjaminaguirre","repo":"gridearly","workflow":"grid-ci.yml","branch":"main"}
