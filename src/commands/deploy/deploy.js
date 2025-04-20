#!/user/bin/env node

import inquirer from "inquirer";
import { Command } from "commander";
import path from 'path';
import { fileURLToPath } from 'url';
import {deployFlux} from "../../service/deployments/deployService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const deployFluxCommand = new Command("deploy on flux")
  .description("Deploy on Flux")
  .command("deploy")
  .option("--config <path>", "Path to configuration JSON file (absolute or relative path)")
  .action(async (options)=>{
    await deployFlux(options.config);
  })



