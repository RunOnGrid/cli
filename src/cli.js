import { Command } from "commander";
import { deploymentsCommand } from "./commands/deployments/deployments.js";
import {login} from "./commands/login/login.js";
import { deployCommand } from "./commands/deploy/deploy.js";
import { logout } from "./commands/logout/logout.js";
import {gitCommands} from "./commands/git/git.js"


const program = new Command();
program.name("grid").description("CLI GRID").version("1.0.3");

// Agregar comandos
program.addCommand(deploymentsCommand);
program.addCommand(login);
program.addCommand(logout);
program.addCommand(deployCommand);
program.addCommand(gitCommands);
program.parse(process.argv);
