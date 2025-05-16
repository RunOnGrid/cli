import { Command } from "commander";
import { deploymentsCommand } from "./commands/deployments/deployments.js";
import {login} from "./commands/login/login.js";
import { deployCommand } from "./commands/deploy/deploy.js";
import { logout } from "./commands/logout/logout.js";
import {gitCommands} from "./commands/git/git.js"


const program = new Command();
program.name("gridcli").description("CLI GRID").version("1.1.1");
program
  .command('help')
  .description('List all available commands')
  .action(() => {
    console.log(`
Available Commands

--login
  The login command is used to access your Grid account. This command will store your access token in your system keychain.
  grid login [options]
    Options:
      github
      google

--logout
  The logout command is used to logout your Grid account. This command will delete your access token from your system keychain.
  grid logout

--git
  The git command is used to manage GitHub repositories for Grid deployments.
  grid git [options]
    Options:
      connect     Connect your GitHub account to the Grid GitHub App.
      repos       List available repositories linked to your account.
      build       Select a repository and build it into a runnable container image.

--deployment
  Manage deployments
  grid deployment [options]
    Options:
      list                          List available deployments in your account.
      id [deployment-id]           List deployment by id.
      delete [deployment-id]       Delete deployment by id.
      update [deployment-id] [...] Update your deployment configuration
      refund [deployment-id]       Refund an akash deployment.

--deploy
  Deploy an application
  grid deploy [provider] [config-path]
    Providers:
      flux
      akash
`);
  });
// Agregar comandos
program.addCommand(deploymentsCommand);
program.addCommand(login);
program.addCommand(logout);
program.addCommand(deployCommand);
program.addCommand(gitCommands);
program.parse(process.argv);
