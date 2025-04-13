import open from 'open';
import dotenv from "dotenv"
import {getPassword} from "../../utils/auth.js"
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const git_url = process.env.GIT_URL;

export const redirectGit = async() =>{
    try {
        console.log(process.env.GIT_URL);
        open("https://github.com/apps/grid-connector-for-github-alpha/installations/select_target")
    } catch (error) {
        throw new error()
    }
} 

export const getRepositories = async() =>{
    try {
        const id = await getPassword("userId");
        console.log(id);
        
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

export const gridWorkflow = async(owner, repo, branch) =>{
    try {
        const response = await fetch(`${git_url}/workflows/run`, {
            method:"POST",
            headers:{
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                installationId,
                owner,
                repo,
                workflow:"grid-ci.yml",
                branch,
              }),
        })
    } catch (error) {
        throw new Error(error)
    }
}