#!/user/bin/env node
import { Command } from "commander";
import { deployFlux } from "../../service/deployments/flux/deployServiceFlux.js";

export const deployCommand = new Command("deploy")
  .description("Deployment commands"); // Descripción para el comando 'deploy'

const fluxSubcommand = new Command("flux")
  .description("Deploy on Flux")
  .option("--config <path>", "Path to configuration JSON file (absolute path)")
  .action(async (options) => {
    try {
      await deployFlux(options.config);
    } catch (error) {
      console.error(error);
      process.exit(1); // Salir con un código de error si falla el despliegue
    }
  });


deployCommand.addCommand(fluxSubcommand);
