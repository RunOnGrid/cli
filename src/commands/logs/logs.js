import { Command } from "commander";
import { getTarget } from "../../utils/keyChain.js";
import chalk from "chalk";
import WebSocket from "ws";

export const logs = new Command("logs")
  .description("Stream container logs from Akash deployments")
  .argument("<dseq>", "Deployment sequence (dseq)")
  .argument("[service]", "Service name (postgres, pgbouncer, s3backup)", "postgres")
  .argument("[providerUri]", "Provider URI (e.g., provider.akash-palmito.org)")
  .option("-g, --gseq <gseq>", "Group sequence", "1")
  .option("-o, --oseq <oseq>", "Order sequence", "1")
  .option("-t, --tail <lines>", "Number of lines to show from the end", "100")
  .option("-f, --follow", "Follow log output (stream continuously)", true)
  .option("--no-follow", "Disable following (show logs and exit)")
  .action(async (dseq, service, providerUri, options) => {
    try {
      const jwt = await getTarget("jwt");
      if (!jwt) {
        console.error(chalk.red("No JWT found. Please run 'grid jwt' first to create a JWT token."));
        process.exit(1);
      }

      // If no providerUri provided, try to get from saved shell config
      if (!providerUri) {
        const savedConfig = await getTarget("shell_config");
        if (savedConfig) {
          const config = JSON.parse(savedConfig);
          providerUri = config.providerName;
          console.log(chalk.gray(`Using provider from shell config: ${providerUri}`));
        }
      }

      if (!providerUri) {
        console.error(chalk.red("Missing provider URI. Please provide it as argument or configure shell first."));
        console.error(chalk.yellow("Usage: grid logs <dseq> [service] <providerUri>"));
        console.error(chalk.yellow("   or: grid shell <dseq> <service> <providerUri> (to save config)"));
        process.exit(1);
      }

      const { gseq, oseq, tail, follow } = options;

      // Build WebSocket URL for logs
      let wsUrl = `wss://${providerUri}:8443/lease/${dseq}/${gseq}/${oseq}/logs?follow=${follow}&tail=${tail}`;
      if (service) {
        wsUrl += `&service=${encodeURIComponent(service)}`;
      }

      console.log(chalk.gray(`Connecting to ${providerUri}...`));
      console.log(chalk.gray(`Service: ${service || 'all'}`));
      console.log(chalk.gray(`Follow: ${follow}, Tail: ${tail} lines\n`));

      const ws = new WebSocket(wsUrl, {
        headers: { Authorization: `Bearer ${jwt}` },
        rejectUnauthorized: false,
      });

      let connected = false;
      let reconnectAttempts = 0;
      const MAX_RECONNECT_ATTEMPTS = 5;

      ws.on("open", () => {
        connected = true;
        reconnectAttempts = 0;
        console.log(chalk.green("Connected to logs stream\n"));
      });

      ws.on("message", (data) => {
        try {
          const message = data.toString();

          // Try to parse as JSON (standard Akash log format)
          try {
            const payload = JSON.parse(message);

            if (payload.name && payload.message !== undefined) {
              // Standard format: { name: "service-xxx", message: "..." }
              const serviceName = payload.name.split('-')[0];
              const timestamp = new Date().toISOString().split('T')[1].split('.')[0];

              console.log(
                chalk.gray(`[${timestamp}]`) +
                chalk.cyan(` [${serviceName}] `) +
                chalk.white(payload.message)
              );
            } else if (payload.message) {
              // Just message
              console.log(chalk.white(payload.message));
            } else {
              // Fallback: stringify
              console.log(chalk.white(JSON.stringify(payload)));
            }
          } catch {
            // Not JSON, print as-is
            if (message.trim()) {
              console.log(chalk.white(message));
            }
          }
        } catch (error) {
          console.error(chalk.red(`Error processing log: ${error.message}`));
        }
      });

      ws.on("error", (error) => {
        console.error(chalk.red(`WebSocket error: ${error.message}`));
        if (!connected) {
          process.exit(1);
        }
      });

      ws.on("close", (code, reason) => {
        const reasonStr = reason?.toString() || "Connection closed";

        if (!follow) {
          // Non-follow mode: exit normally
          console.log(chalk.gray("\nLogs stream ended."));
          process.exit(0);
        }

        if (connected && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(chalk.yellow(`\nConnection lost. Reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`));
          // Note: For reconnection, you'd need to create a new WebSocket
          // For simplicity, we exit and let user reconnect
        }

        console.log(chalk.yellow(`\nConnection closed: ${code} - ${reasonStr}`));
        process.exit(0);
      });

      // Handle Ctrl+C
      process.on("SIGINT", () => {
        console.log(chalk.yellow("\n\nDisconnecting..."));
        ws.close();
        process.exit(0);
      });

      // Connection timeout
      setTimeout(() => {
        if (!connected) {
          console.error(chalk.red("Connection timeout. Check provider URI and network."));
          ws.close();
          process.exit(1);
        }
      }, 15000);

    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });
