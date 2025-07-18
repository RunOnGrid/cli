import { Command } from 'commander';
import { deploymentsCommand } from "./commands/deployments/deployments.js";
import { login } from "./commands/login/login.js";
import { deployCommand } from "./commands/deploy/deploy.js";
import { logout } from "./commands/logout/logout.js";
import { gitCommands } from "./commands/git/git.js";
import { stripeCommand } from "./commands/payment/stripe.js";
import {logs} from "./commands/logs/logs.js"
import {appCommand} from "./commands/appMethods/appMethods.js"

const program = new Command();
program.name("gridcli").description("CLI GRID").version("2.6.6");
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
      refund [deployment-id]       Refund an akash deployment.

--deploy
  Deploy an application
  grid deploy [provider] [config-path]
    Providers:
      flux
      akash
--app methods
  Control applications & deployments
  grid app <method>
  methods:
      start
      pause
      restart
      unpause
      gsoft
--logs
  Charge credits via stripe
  grid logs [provider]
  Providers:
      flux
      akash(Soon)
--stripe
  Charge credits via stripe
  grid stripe
`);
  });
// Agregar comandos

program.addCommand(logs)
program.addCommand(deploymentsCommand)
program.addCommand(login);
program.addCommand(logout);
program.addCommand(deployCommand);
program.addCommand(gitCommands);
program.addCommand(stripeCommand);
program.addCommand(appCommand)
program.parse(process.argv);
