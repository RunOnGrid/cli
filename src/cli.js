import { Command } from 'commander';
import { deploymentsCommand } from "./commands/deployments/deployments.js";
import { login } from "./commands/login/login.js";
import { deployCommand } from "./commands/deploy/deploy.js";
import { jwt } from "./commands/jwt/jwt.js";
import { shellCommand } from "./commands/shell/shell.js";
import { logs } from "./commands/logs/logs.js";
// import { logout } from "./commands/logout/logout.js";

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
  Deploy a database on grid
  grid deploy [options]

--logs
  Stream container logs from Akash deployments
  grid logs <dseq> [service] [providerUri]
    Options:
      -g, --gseq <gseq>    Group sequence (default: 1)
      -o, --oseq <oseq>    Order sequence (default: 1)
      -t, --tail <lines>   Number of lines to show (default: 100)
      -f, --follow         Follow log output (default: true)
      --no-follow          Show logs and exit

--shell
  Connect to container shell or execute commands
  grid shell <dseq> <service> <providerUri>   Configure connection
  grid shell -c <command>                     Execute command

--jwt
  Manage JWT for provider communication (auto-generated when needed)
  grid jwt                                    Generate new JWT
  grid jwt -s, --status                       Check JWT status
  grid jwt -r, --regenerate                   Force regenerate JWT
`);
  });

// Add commands
program.addCommand(deploymentsCommand)
program.addCommand(login);
// program.addCommand(logout);
program.addCommand(deployCommand);
program.addCommand(jwt);
program.addCommand(shellCommand);
program.addCommand(logs);
program.parse(process.argv);
