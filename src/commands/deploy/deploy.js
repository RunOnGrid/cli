#!/user/bin/env node
import { Command } from "commander";

import deployManager from "../../service/deployments/akash/deployServiceAkash.js";

const manager = new deployManager()

export const deployCommand = new Command("deploy")
  .description("Deploy a database on grid")

const redisSubcommand = new Command("redis")
  .description("Deploy a redis instance")
  .action(async (config) => {
      try {
        await manager.deployRedis()
      } catch (error) {
        console.error(error);
        process.exit(1)
      }
  })

deployCommand.addCommand(redisSubcommand);
