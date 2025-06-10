import open from 'open';
import dotenv from 'dotenv';
import { getPassword, getToken, savePassword } from '../../utils/keyChain.js';
import { fileURLToPath } from 'url';
import path from 'path';
import inquirer from 'inquirer';
import { createSpinner } from 'nanospinner';
import chalk from 'chalk';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

class GridGitManager {
    constructor() {
        this.gitUrl = process.env.GIT_URL || 'https://git-app.ongrid.run/';
        this.gitConnector = process.env.GITHUB_APP_DEV || 'https://github.com/apps/grid-connector-github-cli';
        this.port = 4000;
    }

    getIdFromJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload).id;
        } catch (err) {
            console.error('Error decoding JWT:', err.message);
            return null;
        }
    }

    async postUser(installationId) {
        if (!installationId) return console.log('❌ Installation ID is required');

        const token = await getToken();
        if (!token) return console.log('❌ Authentication failed');

        const gridId = this.getIdFromJWT(token);
        if (!gridId) return console.log('❌ User authentication failed');

        await savePassword('userId', gridId);

        const response = await fetch(`${this.gitUrl}users/linkUser`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ installationId, grid_userId: gridId }),
        });

        if (!response.ok) return console.log('❌ Failed to link user account');
        const data = await response.json();
        if (!data.success) return console.log('❌ Failed to complete user setup');

        return data;
    }

    async redirectGit() {
        const server = http.createServer();
        const spinner = createSpinner('Waiting for GitHub installation to be completed').start();

        server.listen(this.port, '127.0.0.1', () => {
            console.log(chalk.blue('\nOpening GitHub installation page...'));
            open(this.gitConnector);
        });

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                server.close();
                spinner.error({ text: 'Timed out waiting for installation.' });
                reject('GitHub installation timed out.');
            }, 120000);

            server.once('request', async (req, res) => {
                clearTimeout(timeout);
                const url = new URL(req.url || '', `http://localhost:${this.port}`);
                const installationId = url.searchParams.get('installation_id');
                const setupAction = url.searchParams.get('setup_action');

                if (installationId && setupAction === 'install') {
                    await this.postUser(installationId);
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <html>
                            <head>
                                <title>Installation Successful</title>
                                <style>body{display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f5f5f5}.success{padding:2rem;background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);text-align:center}h1{color:#2ea44f}</style>
                            </head>
                            <body><div class="success"><h1>Installation Successful</h1><p>You can now close this window and return to the CLI.</p></div></body>
                        </html>`);
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
    }

    async getRepositories() {
        const id = await getPassword('userId');
        const response = await fetch(`${this.gitUrl}repos/getRepositories?gridUserId=${id}`);
        const data = await response.json();
        return data.message;
    }

    async selectRepo(repositories) {
        const choices = repositories.map(repo => ({
            name: repo.fullName,
            value: repo.fullName,
            installationId: repo.installationId,
        }));

        const { selectedRepo } = await inquirer.prompt([
            { type: 'list', name: 'selectedRepo', message: 'Select a repository:', choices }
        ]);

        const { branch } = await inquirer.prompt([
            { name: 'branch', type: 'input', message: 'Enter branch name:', default: 'main' }
        ]);

        const selectedChoice = choices.find(choice => choice.value === selectedRepo);

        return {
            repo: selectedRepo.split('/')[1],
            branch,
            owner: selectedRepo.split('/')[0].toLowerCase(),
            installationId: selectedChoice.installationId
        };
    }

    async gridWorkflow() {
        const spinner = createSpinner(`Fetching available repositories`).start();
        const repositoriesData = await this.getRepositories();
        spinner.stop();

        const { repo, branch, owner, installationId } = await this.selectRepo(repositoriesData);

        const response = await fetch(`${this.gitUrl}workflows/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ installationId, owner, repo, workflow: 'grid-ci.yml', branch }),
        });
        const data = await response.json();

        console.log(chalk.gray('\nWorkflow URL:'), chalk.underline.green(data.workflow_url));
        console.log(chalk.gray('(Opening workflow in your browser...)\n'));
        await open(data.workflow_url);

        await this.checkWorkFlow(installationId, owner, repo, data.runId);
    }

    checkWorkFlow(installationId, owner, repo, runId) {
        const spinner = createSpinner('Checking workflow status...').start();

        return new Promise((resolve, reject) => {
            const checkStatus = async () => {
                try {
                    const response = await fetch(
                        `${this.gitUrl}workflows/status?installationId=${installationId}&owner=${owner}&repo=${repo}&runId=${runId}`,
                        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
                    );
                    const data = await response.json();

                    if (data.workflow_run.status === 'completed') {
                        spinner.success({ text: 'Workflow completed successfully!' });
                        console.log(`Container URL: ghcr.io/${owner}/${repo}:latest`);
                        resolve(data);
                    } else if (data.workflow_run.status === 'error') {
                        spinner.error({ text: 'Workflow failed!' });
                        reject(new Error('Workflow failed'));
                    } else {
                        spinner.update({ text: `Workflow status: ${data.workflow_run.status}...` });
                        setTimeout(checkStatus, 3000);
                    }
                } catch (error) {
                    spinner.error({ text: 'Error checking workflow status' });
                    reject(error);
                }
            };

            checkStatus();
        });
    }
}

export default GridGitManager;
