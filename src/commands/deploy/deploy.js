#!/user/bin/env node


import inquirer from "inquirer";
import { Command } from "commander";
import { createSpinner } from "nanospinner";
import {deployFlux } from "../../service/deployments/deployService.js";
import { getToken } from "../../utils/auth.js";
import {test} from "../../utils/deployInstances.js";

export const deployFluxCommand = new Command("deploy on flux")
  .description("Deploy on Flux")
  .command("deploy flux")
  .action(async ()=>{
    await DeployFlux();
  })

async function askDeployConfig() {
    return await inquirer.prompt([
        { name: "name", type: "input", message: "Service Name:" },
        { name: "image", type: "input", message: "Docker Image (repotag):" },
        { name: "containerPorts", type: "number", message: "Container Port (e.g. 8080):", default: 8080 },
    ]);
}

export async function DeployFlux(){
    let token = await getToken();
    const randomName = Math.random().toString(36).substring(7);
    
    if (!token) {
      console.error("No token found. Please login first.");
      return;
    }
    
    const answers = await askDeployConfig()
    const config = {
      name: answers.name,
      description: randomName,
      compose: [
        {
          name: randomName,
          description: randomName,
          repotag: answers.image,
          ports: [36522],
          domains: [""],
          environmentParameters: [],
          commands: [],
          containerPorts: [answers.containerPorts],
          containerData: "/data",
          cpu: test.cpu,
          ram: test.ram,
          hdd: test.hdd,
          tiered: false,
          secrets: "",
          repoauth: "",
        },
      ],
    } 
    
    const spinner = createSpinner('Deploying your service...').start();
    try {
      await deployFlux(token, config);
      spinner.success({ text: "Deploy successful, check your deployments for more information" });
    } catch (error) {
      spinner.error({ text: 'Failed to deploy service' });
      console.error(error.message);
    }
  }