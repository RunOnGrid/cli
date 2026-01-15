import { Command } from 'commander';
import { databaseCommand } from "./commands/database/database.js";
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
Grid CLI - Deploy databases on decentralized infrastructure

COMMANDS

  login <mnemonic...>
    Store your Akash mnemonic securely in the system keychain.
    Example: grid login word1 word2 word3 ... word12

  database [id]
    Manage your databases.
    grid database ls              List all databases
    grid database <id>            Get database details by ID
    grid database delete <id>     Delete database by ID
    grid database delete failed   Delete all failed databases
    grid database refund <id>     Refund and close deployment
    grid database bids <dseq>     List bids for a database

  create postgres [options]
    Create a PostgreSQL database on Akash.
    Tiers:
      --starter       0.5 CPU, 1GB RAM, 5GB storage (~$0.89/month)
      --standard      1 CPU, 2GB RAM, 10GB storage (~$1.79/month)
      --pro           2 CPU, 4GB RAM, 20GB storage (~$3.39/month)
      --production    2 CPU, 8GB RAM, 40GB storage (~$4.19/month)
    Options:
      --version <v>         PostgreSQL version: 14, 15, 16, 17 (default: 16)
      --pgbouncer           Enable pgBouncer connection pooler
      --s3-backup           Enable S3 backups
      -y, --yes             Auto-select first provider

  logs <dseq> [service] [providerUri]
    Stream container logs from deployments.
    Options:
      -t, --tail <lines>    Number of lines (default: 100)
      -f, --follow          Follow log output (default: true)
      --no-follow           Show logs and exit

  shell [options]
    Connect to container shell or execute commands.
    grid shell <dseq>                     Connect to deployment
    grid shell                            Reconnect with saved config
    grid shell -c <command>               Execute single command
    grid shell <dseq> <password> --psql   Connect directly to PostgreSQL
    Options:
      --psql                Connect directly to PostgreSQL (requires psql)
      -u, --user <user>     Database user (default: admin)
      -d, --database <db>   Database name (default: mydb)

  jwt [options]
    Manage JWT for provider communication (auto-generated when needed).
    grid jwt                Generate new JWT
    grid jwt -s, --status   Check JWT status
    grid jwt -r             Force regenerate JWT

QUICK START

  1. grid login <your mnemonic phrase>
  2. grid jwt
  3. grid create postgres --starter
  4. grid database ls
`);
  });

// Add commands
program.addCommand(databaseCommand)
program.addCommand(login);
// program.addCommand(logout);
program.addCommand(deployCommand);
program.addCommand(jwt);
program.addCommand(shellCommand);
program.addCommand(logs);
program.parse(process.argv);
