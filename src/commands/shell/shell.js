import { Command } from "commander";
import { select } from "@inquirer/prompts";
import { spawn } from "child_process";
import { WebSocketClient } from "../../service/Websockets/websocketsService.js";
import { getTarget, saveTarget } from "../../utils/keyChain.js";
import DeploymentManager from "../../service/deployments/deploymentAdmin.js";
import chalk from "chalk";

// Helper to clean provider URI
function cleanProviderUri(uri) {
  if (!uri) return uri;
  let clean = uri;
  if (clean.startsWith("https://")) clean = clean.replace("https://", "");
  if (clean.startsWith("http://")) clean = clean.replace("http://", "");
  clean = clean.split(":")[0];
  return clean;
}

// Get available services from lease status
async function getAvailableServices(dseq) {
  try {
    const deploymentManager = new DeploymentManager();
    const leaseStatus = await deploymentManager.getLeaseStatusByDseq(dseq);

    if (!leaseStatus || !leaseStatus.forwarded_ports) {
      return ['postgres']; // Default fallback
    }

    const services = Object.keys(leaseStatus.forwarded_ports);
    return services.length > 0 ? services : ['postgres'];
  } catch (error) {

    return ['postgres']; 
  }
}

// Prompt user to select a service if multiple are available
async function selectService(services) {
  if (services.length === 1) {
    return services[0];
  }

  const choices = services.map(svc => ({
    name: svc,
    value: svc
  }));

  return await select({
    message: "Select a service:",
    choices
  });
}

export const shellCommand = new Command("shell")
    .description("Connect to container shell or database")
    .argument("[dseq]", "Deployment sequence (dseq)")
    .argument("[password]", "Database password (for --psql mode)")
    .option("-g, --gseq <gseq>", "Group sequence", "1")
    .option("-o, --oseq <oseq>", "Order sequence", "1")
    .option("-c, --command <command>", "Execute a single command")
    .option("-i, --interactive", "Start interactive shell session")
    .option("--psql", "Connect directly to PostgreSQL database")
    .option("-u, --user <user>", "Database user", "admin")
    .option("-d, --database <db>", "Database name", "mydb")
    .option("--provider <provider>", "Provider hostname (auto-detected if not provided)")
    .allowUnknownOption()
    .allowExcessArguments()
    .action(async (dseq, password, options) => {
        try {
            const jwt = await getTarget("jwt");
            if (!jwt) {
                console.error(chalk.red("No JWT found. Please login first with 'grid login'."));
                process.exit(1);
            }

            // Parse -c command from raw args
            let command = null;
            const args = process.argv;
            const shellIndex = args.findIndex(arg => arg === 'shell' || arg.endsWith('shell'));
            const cIndex = args.findIndex((arg, idx) =>
                idx > shellIndex && (arg === '-c' || arg === '--command')
            );

            if (cIndex !== -1 && cIndex + 1 < args.length) {
                command = args.slice(cIndex + 1).join(' ');
            } else if (options.command) {
                command = options.command;
            }

            const { gseq, oseq, interactive, psql, user, database, provider } = options;
            const wsClient = new WebSocketClient();
            const deploymentManager = new DeploymentManager();

            // Mode 0: Direct psql connection with --psql flag
            if (psql) {
                const dbPassword = password;
                if (!dbPassword) {
                    console.error(chalk.red("Database password required."));
                    console.error(chalk.yellow("Usage: grid shell <dseq> <password> --psql"));
                    process.exit(1);
                }

                if (!dseq) {
                    console.error(chalk.red("DSEQ required for --psql mode."));
                    console.error(chalk.yellow("Usage: grid shell <dseq> <password> --psql"));
                    process.exit(1);
                }

                console.log(chalk.gray("Fetching database connection info..."));

                // Get lease status to find the forwarded port
                const leaseStatus = await deploymentManager.getLeaseStatusByDseq(dseq, gseq, oseq);
                if (!leaseStatus) {
                    console.error(chalk.red("Could not fetch lease status."));
                    process.exit(1);
                }

                // Get postgres forwarded port
                const postgresPorts = leaseStatus.forwarded_ports?.postgres;
                if (!postgresPorts || postgresPorts.length === 0) {
                    console.error(chalk.red("No postgres port found in deployment."));
                    process.exit(1);
                }

                const externalPort = postgresPorts[0].externalPort;

                // Get provider host
                let providerHost = provider;
                if (!providerHost) {
                    providerHost = await deploymentManager.getProviderUriFromDseq(dseq);
                    if (!providerHost) {
                        console.error(chalk.red("Could not auto-detect provider."));
                        process.exit(1);
                    }
                }

                // Clean provider URI for psql connection
                let psqlHost = cleanProviderUri(providerHost);
                if (!psqlHost.startsWith("provider.")) {
                    psqlHost = `provider.${psqlHost}`;
                }

                console.log(chalk.cyan(`\nConnecting to PostgreSQL...`));
                console.log(chalk.gray(`  Host: ${psqlHost}`));
                console.log(chalk.gray(`  Port: ${externalPort}`));
                console.log(chalk.gray(`  Database: ${database}`));
                console.log(chalk.gray(`  User: ${user}\n`));

                // Execute psql directly in the terminal
                const psqlProcess = spawn('psql', [
                    '-h', psqlHost,
                    '-p', String(externalPort),
                    '-U', user,
                    '-d', database
                ], {
                    stdio: 'inherit',
                    env: { ...process.env, PGPASSWORD: dbPassword }
                });

                psqlProcess.on('error', (err) => {
                    if (err.code === 'ENOENT') {
                        console.error(chalk.red("\npsql not found. Please install PostgreSQL client."));
                        console.error(chalk.yellow("  brew install libpq && brew link --force libpq"));
                    } else {
                        console.error(chalk.red(`Error: ${err.message}`));
                    }
                    process.exit(1);
                });

                psqlProcess.on('close', (code) => {
                    process.exit(code || 0);
                });

                return;
            }

            // Mode 1: Execute single command with -c
            if (command) {
                const savedConfig = await getTarget("shell_config");
                if (!savedConfig) {
                    console.error(chalk.red("No shell connection configured."));
                    console.error(chalk.yellow("First run: grid shell <dseq>"));
                    process.exit(1);
                }

                const config = JSON.parse(savedConfig);
                await wsClient.executeCommand(
                    config.providerName,
                    config.dseq,
                    config.gseq,
                    config.oseq,
                    config.service,
                    jwt,
                    command
                );
                return;
            }

            // Mode 2: Interactive shell with -i or just "grid shell"
            if (interactive || !dseq) {
                const savedConfig = await getTarget("shell_config");
                if (!savedConfig) {
                    console.error(chalk.red("No shell connection configured."));
                    console.error(chalk.yellow("\nUsage:"));
                    console.error(chalk.gray("  grid shell <dseq>                      - Connect to deployment"));
                    console.error(chalk.gray("  grid shell <dseq> <password> --psql    - Connect to PostgreSQL"));
                    process.exit(1);
                }

                const config = JSON.parse(savedConfig);
                console.log(chalk.cyan("Starting interactive shell..."));
                await wsClient.startInteractiveShell(
                    config.providerName,
                    config.dseq,
                    config.gseq,
                    config.oseq,
                    config.service,
                    jwt
                );
                return;
            }

            // Mode 3: Connect to deployment with dseq
            console.log(chalk.gray("Fetching deployment info..."));

            // Auto-detect provider
            let providerHost = provider;
            if (!providerHost) {
                providerHost = await deploymentManager.getProviderUriFromDseq(dseq);
                if (!providerHost) {
                    console.error(chalk.red("Could not find provider for this deployment."));
                    console.error(chalk.yellow("Make sure the deployment exists and has an active lease."));
                    process.exit(1);
                }
            }

            const cleanProvider = cleanProviderUri(providerHost);

            // Get available services
            const availableServices = await getAvailableServices(dseq);

            // Select service (prompt if multiple)
            let selectedService;
            if (availableServices.length > 1) {
                console.log(chalk.cyan("\nMultiple services detected:"));
                selectedService = await selectService(availableServices);
            } else {
                selectedService = availableServices[0];
            }

            // Save configuration
            const config = {
                dseq,
                gseq,
                oseq,
                service: selectedService,
                providerName: cleanProvider
            };
            await saveTarget("shell_config", JSON.stringify(config));

            console.log(chalk.green("\nShell configured:"));
            console.log(chalk.gray(`  Provider: ${cleanProvider}`));
            console.log(chalk.gray(`  DSEQ: ${dseq}`));
            console.log(chalk.gray(`  Service: ${selectedService}`));
            console.log("");

            // Start interactive shell immediately
            await wsClient.startInteractiveShell(
                cleanProvider,
                dseq,
                gseq,
                oseq,
                selectedService,
                jwt
            );

        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });
