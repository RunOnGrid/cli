#!/user/bin/env node
import { Command } from "commander";
import { deployFlux } from "../../service/deployments/flux/deployServiceFlux.js";
import { deployAkash } from "../../service/deployments/akash/deployServiceAkash.js";

export const deployCommand = new Command("deploy")
  .description("Deployment commands"); // Descripción para el comando 'deploy'

const fluxSubcommand = new Command("flux")
  .description("Deploy on Flux")
  .argument("<config>", "Path to configuration JSON file (absolute path)")
  .action(async (config) => {
    try {
      await deployFlux(config);
    } catch (error) {
      console.error(error);
      process.exit(1); 
    }
  });

const akashSubcommand = new Command("akash")
  .description("Deploy on Akash")
  .argument("<config>", "Path to configuration Yaml file (absolute path)")
  .action(async (config) => {
      try {
        await deployAkash(config)
      } catch (error) {
        console.error(error);
        process.exit(1)
      }
  })

deployCommand.addCommand(akashSubcommand);
deployCommand.addCommand(fluxSubcommand);
