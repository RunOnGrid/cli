
import { getDeployments, getDeploymentById } from "../../service/deployments/deploymentService.js";
import { getToken } from "../../utils/auth.js";
import { Command } from "commander";

export const deploymentsCommand = new Command("deployments")
    .description("Get deployments")
    .command("deployments ls")
    .action(async () => {
        const token = await getToken();
        console.log(token);
        const deployments = await getDeployments(token);
        console.log(deployments);

    });


export const deploymentsByIdCommand = new Command("deploymentId")
    .description("Get deployments by id")
    .command("id")
    .action(async () =>{
        const token = await getToken();
        const deployments = await getDeploymentById(token, id)
        console.log(deployments)
    })


// export default {
//     deploymentsCommand,
//     deploymentsByIdCommand

// };
