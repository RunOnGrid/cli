import { Command } from "commander";
import { WebSocketServer } from "../../service/Websockets/websocketsService.js";
import { getTarget, saveTarget } from "../../utils/keyChain.js";
import chalk from "chalk";

export const shellCommand = new Command("shell")
    .description("Connect to container shell or execute commands")
    .argument("[dseq]", "Deployment sequence (dseq) - required for connection setup")
    .argument("[service]", "Service name (e.g., pgbouncer, redis) - required for connection setup")
    .argument("[providerName]", "Provider name or host (e.g., provider.akash-palmito.org) - required for connection setup")
    .option("-g, --gseq <gseq>", "Group sequence (default: 1)", "1")
    .option("-o, --oseq <oseq>", "Order sequence (default: 1)", "1")
    .option("-c, --command <command>", "Command to execute (e.g., 'psql -U admin -d mydb')")
    .allowUnknownOption() // Permitir opciones desconocidas para capturar el comando completo
    .allowExcessArguments() // Permitir argumentos adicionales cuando se usa -c
    .action(async (dseq, service, providerName, options) => {
        try {
            // Verificar que el JWT esté disponible
            const jwt = await getTarget("jwt");
            if (!jwt) {
                console.error(chalk.red("❌ Error: No JWT found. Please run 'grid jwt' first to create a JWT token."));
                process.exit(1);
            }

            // Si hay -c, capturar todo lo que viene después como un solo string
            let command = null;
            const args = process.argv;
            const shellIndex = args.findIndex(arg => arg === 'shell' || arg.endsWith('shell'));
            const cIndex = args.findIndex((arg, idx) => 
                idx > shellIndex && (arg === '-c' || arg === '--command')
            );
            
            if (cIndex !== -1 && cIndex + 1 < args.length) {
                // Capturar todo desde el siguiente argumento después de -c hasta el final
                command = args.slice(cIndex + 1).join(' ');
            } else if (options.command) {
                // Fallback: usar el valor de la opción si existe
                command = options.command;
            }

            const { gseq, oseq } = options;

            // Modo 1: Enviar comando (si -c está presente)
            if (command) {
                // Cargar configuración guardada
                const savedConfig = await getTarget("shell_config");
                if (!savedConfig) {
                    console.error(chalk.red("❌ Error: No shell connection configured. Please run 'grid shell <dseq> <service> <providerName>' first to establish connection."));
                    process.exit(1);
                }

                const config = JSON.parse(savedConfig);
                const wsServer = new WebSocketServer();
                await wsServer.executeCommand(
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

            // Modo 2: Establecer conexión (si dseq, service, providerName están presentes)
            if (!dseq || !service || !providerName) {
                console.error(chalk.red("❌ Error: Missing required arguments. Use either:"));
                console.error(chalk.yellow("  - To establish connection: grid shell <dseq> <service> <providerName>"));
                console.error(chalk.yellow("  - To execute command: grid shell -c <command>"));
                process.exit(1);
            }

            // Guardar configuración de conexión
            const config = {
                dseq,
                gseq,
                oseq,
                service,
                providerName
            };
            await saveTarget("shell_config", JSON.stringify(config));
            console.log(chalk.green(`✅ Shell connection configured:`));
            console.log(chalk.gray(`   Provider: ${providerName}`));
            console.log(chalk.gray(`   DSEQ: ${dseq}, GSEQ: ${gseq}, OSEQ: ${oseq}`));
            console.log(chalk.gray(`   Service: ${service}`));
            console.log(chalk.yellow(`\n💡 Now you can execute commands with: grid shell -c <command>`));

        } catch (error) {
            console.error(chalk.red(`❌ Error: ${error.message}`));
            if (error.stack) {
                console.error(chalk.gray(error.stack));
            }
            process.exit(1);
        }
    });

