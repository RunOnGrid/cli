import open from 'open';
import dotenv from "dotenv"
import { getPassword, getToken, savePassword } from "../../utils/keyChain.js"
import { fileURLToPath } from 'url';
import path from 'path';
import inquirer from "inquirer";
import { createSpinner } from "nanospinner";
import chalk from "chalk"
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const git_url = process.env.GIT_URL || "https://git-app.ongrid.run/";
const git_connector = process.env.GITHUB_APP_DEV || "https://github.com/apps/grid-connector-github-cli";


function getIdFromJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        const payload = JSON.parse(jsonPayload);
        return payload.id;
    } catch (err) {
        console.error('Error decoding JWT:', err.message);
        return null;
    }
}

export const postUser = async (installationId) => {
    try {
        if (!installationId) {
            console.log('❌ Installation ID is required');
            return false;
        }

        const token = await getToken();
        if (!token) {
            console.log('❌ Authentication failed');
            return false;
        }

        const gridId = await getIdFromJWT(token);
        if (!gridId) {
            console.log('❌ User authentication failed');
            return false;
        }

        await savePassword("userId", gridId);

        const response = await fetch(`${git_url}users/linkUser`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                installationId,
                grid_userId: gridId
            }),
        });

        if (!response.ok) {
            console.log('❌ Failed to link user account');
            return false;
        }

        const data = await response.json();
        if (!data.success) {
            console.log('❌ Failed to complete user setup');
            return false;
        }

        return data;
    } catch (error) {
        console.log('❌ An unexpected error occurred');
        return false;
    }
}

export const redirectGit = async () => {
    try {
        const port = 4000;
        const server = http.createServer();
        const spinner = createSpinner('Waiting for GitHub installation to be completed').start();

        server.listen(port, "127.0.0.1", () => {
            console.log(chalk.blue('\nOpening GitHub installation page...'));
            open(git_connector);
        });

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                server.close();
                spinner.error({ text: 'Timed out waiting for installation.' });
                reject(console.log(('GitHub installation timed out.')));
            }, 120000); // 2 minutos

            server.once('request', async (req, res) => {
                clearTimeout(timeout);

                const url = new URL(req.url || '', `http://localhost:${port}`);
                const installationId = url.searchParams.get('installation_id');
                const setupAction = url.searchParams.get('setup_action');

                if (installationId && setupAction === 'install') {
                    await postUser(installationId);
                    res.writeHead(200, { 'Content-Type': 'text/html', 'Connection': 'close' });
                    res.end(`
                        <html>
                            <head>
                                <title>Installation Successful</title>
                                <style>
                                    body {
                                        font-family: Arial, sans-serif;
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        height: 100vh;
                                        margin: 0;
                                        background-color: #f5f5f5;
                                    }
                                    .success-message {
                                        text-align: center;
                                        padding: 2rem;
                                        background: white;
                                        border-radius: 8px;
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                    }
                                    h1 {
                                        color: #2ea44f;
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="success-message">
                                    <h1>Installation Successful</h1>
                                    <p>You can now close this window and return to the CLI.</p>
                                </div>
                            </body>
                        </html>
                    `);
                    spinner.success({ text: 'GitHub app installation completed successfully!' });
                    resolve(installationId);
                    process.exit(0);

                } else {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Invalid installation response');
                    spinner.error({ text: 'Installation failed or was cancelled' });
                    reject(new Error('Invalid installation response'));
                }

                server.close();
            });

            server.once('error', (err) => {
                clearTimeout(timeout);
                server.close();
                reject(new Error(`Server error: ${err.message}`));
            });
        });
    } catch (error) {
        throw new Error(error);
    }
};
export const getRepositories = async () => {
    try {
        const id = await getPassword("userId");
        
        const response = await fetch(`${git_url}repos/getRepositories?gridUserId=${id}`, {
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

export const gridWorkflow = async () => {
    try {
        const spinner = createSpinner(`Fetching available repositories`).start();
        const repositoriesData = await getRepositories();
        spinner.stop();

        const { repo, branch, owner, installationId } = await selectRepo(repositoriesData);


        const response = await fetch(`${git_url}workflows/run`, {
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
        process.exit(1)
    }
}

export const checkWorkFlow = async (installationId, owner, repo, runId) => {
    const spinner = createSpinner('Checking workflow status...').start();

    return new Promise((resolve, reject) => {
        const checkStatus = async () => {
            try {

                const response = await fetch(
                    `${git_url}workflows/status?installationId=${installationId}&owner=${owner}&repo=${repo}&runId=${runId}`,
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
