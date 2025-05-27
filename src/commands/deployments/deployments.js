import { getDeployments, getDeploymentById, deleteDeployment, updateDeployment, refundAkash } from "../../service/deployments/deploymentAdmin.js";
import { Command } from "commander";

export const deploymentsCommand = new Command("deployment")
    .description("Deployment commands")

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
    .description("Update deployment")
    .argument("<provider>", "Provider declaration")
    .argument("<id>", "ID of deployment")
    .argument("<path>", "Path of deployment")
    .action(async (provider, id, path) => {
        console.log("ID:", id);
        console.log("Path:", path);
        provider = provider.toUpperCase();
        await updateDeployment(id, path, provider);
        return;
    });

deploymentsCommand.addCommand(deploymentsLsCommand);
deploymentsCommand.addCommand(deploymentsByIdCommand);
deploymentsCommand.addCommand(deploymentRefund);
deploymentsCommand.addCommand(deploymentDelete);
