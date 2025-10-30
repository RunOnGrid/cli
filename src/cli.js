import { Command } from 'commander';
import { deploymentsCommand } from "./commands/deployments/deployments.js";
import { login } from "./commands/login/login.js";
import { deployCommand } from "./commands/deploy/deploy.js";
// import { logout } from "./commands/logout/logout.js";
// import {logs} from "./commands/logs/logs.js"

const program = new Command();
program.name("gridcli").description("CLI GRID").version("2.6.6");
program
  .command('help')
  .description('List all available commands')
  .action(() => {
    console.log(`
Available Commands

--login
  The  command is used to store your mnemonic on keychain.
  grid login [mnemonic]

--logout
  The logout command is used to logout your Grid account. This command will delete your access token from your system keychain.
  grid logout

--deployment
  Manage deployments
  grid deployment [options]
    Options:
      list                          List available deployments in your account.
      id [deployment-id]           List deployment by id.
      delete [deployment-id]       Delete deployment by id.
      refund [deployment-id]       Refund an akash deployment.

--deploy
  Deploy a postgre or redis
  grid [database] [config-path]

--logs(Soon)
  grid logs [id]
`);
  });

// Agregar comandos
// program.addCommand(logs)
program.addCommand(deploymentsCommand)
program.addCommand(login);
// program.addCommand(logout);
program.addCommand(deployCommand);
program.parse(process.argv);
