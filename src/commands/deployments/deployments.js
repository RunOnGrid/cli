import { getDeployments, getDeploymentById, deleteDeployment, updateDeployment, refundAkash } from "../../service/deployments/deploymentAdmin.js";
import { Command } from "commander";
import { getToken } from '../../utils/keyChain.js';

export const deploymentsCommand = new Command("deployment")
    .description("Manage deployments")
    .action(async () => {
        const token = await getToken();
        // Implement deployments list logic here
        console.log('Deployments list');
    });

const deploymentsLsCommand = new Command("list")
    .description("Get deployments")
    .action(async () => {
        const deployments = await getDeployments();
        console.log(deployments);
    });


const deploymentsByIdCommand = new Command("id")
    .description("Get deployments by id")
    .argument("<id>", "List deployment by id")
    .action(async (id) => {
        const deployments = await getDeploymentById(id);
        console.log(deployments)
    })

const deploymentRefund = new Command("refund")
    .description("Akash deployment refund")
    .argument("<id>", "ID of Akash deployment")
    .action(async (id) => {
        await refundAkash(id)
    })

const deploymentDelete = new Command("delete")
    .description("Delete deployment by id")
    .argument("<id>", "ID of deployment")
    .action(async (id) => {
        if (!id) {
            console.log("Missing ID");
            return;
        }
        await deleteDeployment(id);
    });


export const deploymentUpdate = new Command("update")
    .description("Update a deployment")
    .argument("<provider>", "Cloud provider (flux or akash)")
    .argument("<id>", "Deployment ID")
    .argument("<config-path>", "Path to configuration file")
    .action(async (provider, id, configPath) => {
        const token = await getToken();
        // Implement update logic here
        console.log(`Updating deployment ${id} on ${provider} with config from ${configPath}`);
    });

deploymentsCommand.addCommand(deploymentsLsCommand);
deploymentsCommand.addCommand(deploymentsByIdCommand);
deploymentsCommand.addCommand(deploymentRefund);
deploymentsCommand.addCommand(deploymentDelete);
