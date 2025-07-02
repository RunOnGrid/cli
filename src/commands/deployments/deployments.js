import DeploymentManager from "../../service/deployments/deploymentAdmin.js";
import { Command } from "commander";


const manager = new DeploymentManager();

export const deploymentsCommand = new Command("deployment")
    .description("Manage deployments")

const deploymentsLsCommand = new Command("list")
    .description("Get deployments")
    .action(async () => {
        const deployments = await manager.getDeployments();
        console.log(deployments);
    });


const deploymentsByIdCommand = new Command("id")
    .description("Get deployments by id")
    .argument("<id>", "List deployment by id")
    .action(async (id) => {
        const deployments = await manager.getDeploymentById(id);
        console.log(deployments)
    })

const deploymentRefund = new Command("refund")
    .description("Akash deployment refund")
    .argument("<id>", "ID of Akash deployment")
    .action(async (id) => {
        await manager.refundAkash(id)
    })

const deploymentDelete = new Command("delete")
    .description("Delete deployment by id or delete all failed deployments with 'failed'")
    .argument("<idOrKeyword>", "ID of deployment or 'failed' to delete all failed deployments")
    .action(async (idOrKeyword) => {
        if (!idOrKeyword) {
            console.log("Missing ID or keyword");
            return;
        }
        if (idOrKeyword === "failed") {
            await manager.deleteAllFailedDeployments();
        } else {
            await manager.deleteDeployment(idOrKeyword);
        }
    });


deploymentsCommand.addCommand(deploymentsLsCommand);
deploymentsCommand.addCommand(deploymentsByIdCommand);
deploymentsCommand.addCommand(deploymentRefund);
deploymentsCommand.addCommand(deploymentDelete);
