import DeploymentManager from "../../service/deployments/deploymentAdmin.js";
import { Command } from "commander";
import DeployManager from "../../service/deployments/akash/deployServiceAkash.js";


const manager = new DeploymentManager();
const deployMgr = new DeployManager();

export const deploymentsCommand = new Command("deployment")
    .description("Manage deployments")

const deploymentsLsCommand = new Command("list")
    .description("Get deployments")
    .action(async () => {
        const result = await manager.getDeployments();
        const list = result?.deployments ?? [];
        if (list.length === 0) {
            console.log("No deployments found.");
            return;
        }
        console.dir({ deployments: list, pagination: result.pagination }, { depth: null });
    });


const deploymentsByIdCommand = new Command("id")
    .description("Get deployments by id")
    .argument("<id>", "List deployment by id")
    .action(async (id) => {
        const deployment = await manager.getDeploymentById(id);
        console.dir(deployment, { depth: null });
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

const deploymentBids = new Command("bids")
    .description("List bids for a deployment (by dseq)")
    .argument("<dseq>", "Deployment sequence (dseq)")
    .action(async (dseq) => {
        console.log("asd");
        
        const result = await deployMgr.getBidsForDeployment(dseq);
        const list = result?.bids ?? [];
        if (list.length === 0) {
            console.log("No bids found.");
            return;
        }
        console.dir({ bids: list, pagination: result.pagination }, { depth: null });
    });


deploymentsCommand.addCommand(deploymentsLsCommand);
deploymentsCommand.addCommand(deploymentsByIdCommand);
deploymentsCommand.addCommand(deploymentRefund);
deploymentsCommand.addCommand(deploymentDelete);
deploymentsCommand.addCommand(deploymentBids);
