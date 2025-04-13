import { Command } from "commander";
import {deploymentsCommand, deploymentsByIdCommand} from "./commands/listDeployments/deployments.js";
import {login} from "./commands/login/login.js";
import { deployFluxCommand } from "./commands/deploy/deploy.js";
import { logout } from "./commands/logout/logout.js";
import {gitCommand} from "./commands/git/git.js"


const program = new Command();
program.name("grid").description("CLI GRID").version("1.0.0");

// Agregar comandos
program.addCommand(deploymentsCommand);
program.addCommand(deploymentsByIdCommand);
program.addCommand(login);
program.addCommand(logout);
program.addCommand(deployFluxCommand);
program.addCommand(gitCommand);

program.parse(process.argv);
