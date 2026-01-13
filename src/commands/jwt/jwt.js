import { Command } from "commander";
import { getTarget, getPassword, savePassword } from "../../utils/keyChain.js";
import { Secp256k1HdWallet } from "@cosmjs/amino";
import { JwtTokenManager } from "@akashnetwork/chain-sdk";
import chalk from "chalk";

export const jwt = new Command("jwt")
  .description("Manage JWT for provider secure communication (auto-generated when needed)")
  .option("-s, --status", "Show current JWT status")
  .option("-r, --regenerate", "Force regenerate JWT")
  .action(async (options) => {
    const mnemonic = await getPassword("mnemonic");
    if (!mnemonic) {
      console.error(chalk.red("No mnemonic found. Please login first using 'grid login [mnemonic]'"));
      process.exit(1);
    }

    if (options.status) {
      // Show JWT status
      const existingJwt = await getPassword("jwt");
      if (!existingJwt) {
        console.log(chalk.yellow("No JWT stored. Will be auto-generated when needed."));
        return;
      }

      try {
        const parts = existingJwt.split(".");
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = payload.exp - now;

        if (expiresIn <= 0) {
          console.log(chalk.red("JWT expired. Will be auto-regenerated when needed."));
        } else {
          const minutes = Math.floor(expiresIn / 60);
          const seconds = expiresIn % 60;
          console.log(chalk.green(`JWT valid for ${minutes}m ${seconds}s`));
          console.log(chalk.gray(`Issuer: ${payload.iss}`));
        }
      } catch {
        console.log(chalk.red("Invalid JWT stored. Will be auto-regenerated when needed."));
      }
      return;
    }

    if (options.regenerate) {
      // Force regenerate
      console.log(chalk.gray("Regenerating JWT..."));
    }

    // Generate new JWT
    try {
      const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "akash" });
      const accounts = await wallet.getAccounts();
      const tokenManager = new JwtTokenManager(wallet);

      const token = await tokenManager.generateToken({
        iss: accounts[0].address,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        version: "v1",
        leases: { access: "full" },
      });

      await savePassword("jwt", token);
      console.log(chalk.green("JWT generated and stored securely."));
      console.log(chalk.gray(`Address: ${accounts[0].address}`));
      console.log(chalk.gray("Expires in: 1 hour"));
      console.log(chalk.yellow("\nNote: JWT is now auto-generated when needed. This command is optional."));
    } catch (error) {
      console.error(chalk.red(`Error generating JWT: ${error.message}`));
      process.exit(1);
    }
  });
