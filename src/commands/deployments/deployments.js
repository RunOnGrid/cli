
import { getDeployments, getDeploymentById, refundAkash } from "../../service/deployments/deploymentAdmin.js";
import { Command } from "commander";

export const deploymentsCommand = new Command("deployment")
  .description("Deployment commands"); 

const deploymentsLsCommand = new Command("ls")
    .description("Get deployments")
    .action(async () => {
        const deployments = await getDeployments();
        console.log(deployments);
    });


const deploymentsByIdCommand = new Command("id")
    .description("Get deployments by id")
    .option("--id <id>", "List deployment by id")
    .action(async (options) =>{
        const deployments = await getDeploymentById(options.id);
        console.log(deployments)
    })

const deploymentRefund = new Command("refund")
.description("Akash deployment refund")
.option("--id <id>", "id of akash deployment")
.action(async (options) =>{
    const response = await refundAkash(options.id)
    console.log(response);
    
})

deploymentsCommand.addCommand(deploymentsLsCommand);
deploymentsCommand.addCommand(deploymentsByIdCommand);
deploymentsCommand.addCommand(deploymentRefund);