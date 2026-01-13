#!/user/bin/env node
import { Command } from "commander";
import { input, password, confirm, select } from "@inquirer/prompts";
import chalk from "chalk";
import Long from "long";
import { getTarget } from "../../utils/keyChain.js";
import { buildPostgresSDL } from "../../helpers/sdlBuilder.js";
import { createChainNodeSDK, createStargateClient, SDL } from "@akashnetwork/chain-sdk";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";

const SECONDS_PER_BLOCK = 6.098;
const DAYS_PER_MONTH = 30;
const BLOCKS_PER_MONTH = Math.round((DAYS_PER_MONTH * 24 * 3600) / SECONDS_PER_BLOCK);
const UAKT_PER_AKT = 1_000_000;

export const deployCommand = new Command("deploy")
  .description("Deploy a database on grid");

// Resource tiers matching frontend
const RESOURCE_TIERS = {
  starter: { cpu: 0.5, memory: 1024, storage: 5, label: "Starter", price: "$0.89/month" },
  standard: { cpu: 1, memory: 2048, storage: 10, label: "Standard", price: "$1.79/month" },
  pro: { cpu: 2, memory: 4096, storage: 20, label: "Pro", price: "$3.39/month" },
  production: { cpu: 2, memory: 8192, storage: 40, label: "Production", price: "$4.19/month" },
};

const postgresSubcommand = new Command("postgres")
  .description("Deploy a PostgreSQL database with optional pgbouncer and S3 backups")
  .option("--starter", "Starter tier: 0.5 CPU, 1GB RAM, 5GB storage (~$0.89/month)")
  .option("--standard", "Standard tier: 1 CPU, 2GB RAM, 10GB storage (~$1.79/month)")
  .option("--pro", "Pro tier: 2 CPU, 4GB RAM, 20GB storage (~$3.39/month)")
  .option("--production", "Production tier: 2 CPU, 8GB RAM, 40GB storage (~$4.19/month)")
  .option("--version <version>", "PostgreSQL version (14, 15, 16, 17)", "16")
  .option("--pgbouncer", "Enable pgBouncer connection pooler")
  .option("--pgbouncer-port <port>", "PgBouncer port", "6432")
  .option("--s3-backup", "Enable S3 backups")
  .option("--s3-access-key <key>", "AWS Access Key ID")
  .option("--s3-secret-key <key>", "AWS Secret Access Key")
  .option("--s3-bucket <bucket>", "S3 bucket name")
  .option("--s3-region <region>", "S3 region", "us-east-2")
  .option("--backup-schedule <cron>", "Backup cron schedule", "0 5 * * *")
  .option("-y, --yes", "Skip provider selection and choose the first one automatically")
  .action(async (options) => {
    try {
      console.log(chalk.cyan("\nPostgreSQL Deployment Configuration\n"));

      // Determine resource tier
      let selectedTier;
      if (options.starter) {
        selectedTier = RESOURCE_TIERS.starter;
      } else if (options.standard) {
        selectedTier = RESOURCE_TIERS.standard;
      } else if (options.pro) {
        selectedTier = RESOURCE_TIERS.pro;
      } else if (options.production) {
        selectedTier = RESOURCE_TIERS.production;
      } else {
        // Prompt user to select a tier
        const tierChoices = Object.entries(RESOURCE_TIERS).map(([key, tier]) => ({
          name: `${tier.label} - ${tier.cpu} CPU, ${tier.memory / 1024}GB RAM, ${tier.storage}GB storage (${tier.price})`,
          value: tier,
        }));

        selectedTier = await select({
          message: "Select a resource tier:",
          choices: tierChoices,
        });
      }

      console.log(chalk.green(`Selected: ${selectedTier.label} tier`));

      // Get root password
      const rootPassword = await password({
        message: "Enter PostgreSQL root password:",
        mask: "*",
      });

      if (!rootPassword || rootPassword.length < 8) {
        console.error(chalk.red("Password must be at least 8 characters"));
        process.exit(1);
      }

      // Confirm pgBouncer if not set via flag
      let enablePgBouncer = options.pgbouncer;
      if (!enablePgBouncer) {
        enablePgBouncer = await confirm({
          message: "Enable pgBouncer (connection pooler)?",
          default: false,
        });
      }

      // Confirm S3 backup if not set via flag
      let enableS3Backup = options.s3Backup;
      let s3Config = {};

      if (!enableS3Backup) {
        enableS3Backup = await confirm({
          message: "Enable S3 backups?",
          default: false,
        });
      }

      if (enableS3Backup) {
        s3Config = {
          awsAccessKeyId: options.s3AccessKey || await input({
            message: "AWS Access Key ID:",
          }),
          awsSecretAccessKey: options.s3SecretKey || await password({
            message: "AWS Secret Access Key:",
            mask: "*",
          }),
          s3Bucket: options.s3Bucket || await input({
            message: "S3 Bucket name:",
          }),
          s3Region: options.s3Region,
          backupCronSchedule: options.backupSchedule,
          dbPassword: rootPassword,
        };

        if (!s3Config.awsAccessKeyId || !s3Config.awsSecretAccessKey || !s3Config.s3Bucket) {
          console.error(chalk.red("S3 configuration requires access key, secret key, and bucket name"));
          process.exit(1);
        }
      }

      // Build SDL with selected tier resources
      const sdlParams = {
        rootPassword,
        cpu: selectedTier.cpu,
        memory: selectedTier.memory,
        storage: selectedTier.storage,
        version: options.version,
        enablePersistence: true,
        enablePgBouncer,
        pgBouncerPort: parseInt(options.pgbouncerPort),
        enableS3Backup,
        s3Config,
      };

      console.log(chalk.gray("\nBuilding deployment manifest..."));
      const sdlYaml = buildPostgresSDL(sdlParams);
      const sdl = SDL.fromString(sdlYaml);

      // Display configuration
      console.log(chalk.cyan("\nDeployment Configuration:"));
      console.log(chalk.gray(`  Tier: ${selectedTier.label} (${selectedTier.price})`));
      console.log(chalk.gray(`  PostgreSQL: v${options.version}`));
      console.log(chalk.gray(`  CPU: ${selectedTier.cpu} units`));
      console.log(chalk.gray(`  Memory: ${selectedTier.memory} MB`));
      console.log(chalk.gray(`  Storage: ${selectedTier.storage} GB`));
      console.log(chalk.gray(`  PgBouncer: ${enablePgBouncer ? "Enabled" : "Disabled"}`));
      console.log(chalk.gray(`  S3 Backup: ${enableS3Backup ? "Enabled" : "Disabled"}`));

      // Get mnemonic and create wallet
      const mnemonic = await getTarget("mnemonic");
      if (!mnemonic) {
        console.error(chalk.red("No mnemonic found. Please run 'grid login' first."));
        process.exit(1);
      }

      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "akash" });
      const [{ address }] = await wallet.getAccounts();

      console.log(chalk.gray(`\nWallet: ${address}`));

      const signer = createStargateClient({
        baseUrl: "https://rpc.akashnet.net:443",
        signerMnemonic: mnemonic,
      });

      const chainSdk = createChainNodeSDK({
        query: { baseUrl: "https://akash-grpc.publicnode.com:443" },
        tx: { signer },
      });

      // Get manifest hash and groups
      const groups = sdl.groups();
      const manifestHash = await sdl.manifestVersion();

      // Get latest block for dseq
      const latestBlock = await chainSdk.cosmos.base.tendermint.v1beta1.getLatestBlock();
      const dseq = Long.fromString(String(latestBlock.block?.header?.height ?? Date.now()), true);

      console.log(chalk.gray(`\nCreating deployment (DSEQ: ${dseq})...`));

      // Create deployment message
      const deploymentMsg = {
        id: { owner: address, dseq },
        groups,
        hash: manifestHash,
        deposit: {
          amount: { denom: "uakt", amount: "500000" },
          sources: [1],
        },
      };

      // Send deployment transaction
      await chainSdk.akash.deployment.v1beta4.createDeployment(deploymentMsg);
      console.log(chalk.green("Deployment created successfully!"));

      // Wait for bids
      console.log(chalk.gray("\nWaiting for provider bids..."));
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const bids = await waitForOpenBids(chainSdk, address, dseq);

      if (bids.length === 0) {
        console.error(chalk.red("No bids received from providers"));
        process.exit(1);
      }

      console.log(chalk.green(`\nReceived ${bids.length} bid(s)`));

      // Build choices for provider selection
      const choices = bids.map((b) => {
        const priceAKT = (b.PricePerMonth ?? 0) * 0.7;
        const label = `$${priceAKT.toFixed(2)}/month - ${b.providerName ?? "Unknown"} (${b.providerRegion ?? ""}, ${b.providerCountry ?? ""}) - Uptime: ${((b.providerUptime30d ?? 0) * 100).toFixed(1)}%`;
        return {
          name: label,
          value: {
            ...b,
            pricePerMonthAKT: priceAKT,
          },
        };
      });

      let selectedBid;
      if (options.yes) {
        selectedBid = choices[0].value;
        console.log(chalk.gray(`Auto-selecting first provider: ${selectedBid.providerName ?? "Unknown"}`));
      } else {
        selectedBid = await select({
          message: "Select a provider:",
          choices,
        });
      }

      // Create lease
      console.log(chalk.gray("\nCreating lease..."));
      await chainSdk.akash.market.v1beta5.createLease({ bidId: selectedBid.bidId });
      console.log(chalk.green("Lease created!"));

      // Send manifest
      console.log(chalk.gray("\nSending manifest to provider..."));
      await sendManifest(sdl, selectedBid.providerName, dseq);

      console.log(chalk.green("\nDeployment successful!"));
      console.log(chalk.cyan("\nConnection Details:"));
      console.log(chalk.gray(`  DSEQ: ${dseq}`));
      console.log(chalk.gray(`  Provider: ${selectedBid.providerName}`));
      console.log(chalk.gray(`  Database: mydb`));
      console.log(chalk.gray(`  User: admin`));

      if (enablePgBouncer) {
        console.log(chalk.gray(`  PgBouncer Port: ${options.pgbouncerPort}`));
      }

      console.log(chalk.yellow("\nTo view logs:"));
      console.log(chalk.gray(`  grid logs ${dseq} postgres ${selectedBid.providerName}`));

      console.log(chalk.yellow("\nTo connect via shell:"));
      console.log(chalk.gray(`  grid shell ${dseq} postgres ${selectedBid.providerName}`));
      console.log(chalk.gray(`  grid shell -c "psql -U admin -d mydb"`));

    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      if (error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

async function waitForOpenBids(chainSdk, address, dseq, maxAttempts = 12, delayMs = 5000) {
  const providersResp = await fetch("https://console-api.akash.network/v1/providers");
  const providersJson = await providersResp.json();
  const providers = Array.isArray(providersJson) ? providersJson : (providersJson?.providers ?? []);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    process.stdout.write(`\rWaiting for bids... (${attempt}/${maxAttempts})`);

    const page = await chainSdk.akash.market.v1beta5.getBids({
      filters: { owner: address, dseq, state: "open" },
      pagination: { limit: 100 },
    });

    const bids = page?.bids ?? [];
    const filteredBids = bids.filter((b) =>
      b.bid.state === 1 && b.bid.id.provider !== null
    );

    if (filteredBids.length > 0) {
      console.log(""); // New line after progress

      const latestBlockResp = await chainSdk.cosmos.base.tendermint.v1beta1.getLatestBlock();
      const latestHeight = Number(latestBlockResp?.block?.header?.height ?? 0);

      const detailedBids = filteredBids.map((b) => {
        const providerOwner = b?.bid.id.provider;
        const provider = providers.find((p) => p.owner === providerOwner);
        const pricePerBlock = Number(b.bid.price.amount) / UAKT_PER_AKT;
        const pricePerMonthAKT = pricePerBlock * BLOCKS_PER_MONTH;

        return {
          providerName: provider?.hostUri || provider?.name,
          providerRegion: provider?.ipRegion,
          providerCountry: provider?.ipCountry,
          providerUptime30d: provider?.uptime30d,
          providerIsAudited: provider?.isAudited,
          PricePerMonth: pricePerMonthAKT,
          bidId: b?.bid?.id,
        };
      });

      // Filter by uptime and sort
      const MIN_UPTIME = 0.98;
      const filtered = detailedBids.filter((b) => (b.providerUptime30d ?? 0) >= MIN_UPTIME);

      filtered.sort((a, b) => {
        if ((b.providerUptime30d ?? 0) > (a.providerUptime30d ?? 0)) return 1;
        if ((b.providerUptime30d ?? 0) < (a.providerUptime30d ?? 0)) return -1;
        if (a.providerIsAudited && !b.providerIsAudited) return -1;
        if (!a.providerIsAudited && b.providerIsAudited) return 1;
        return 0;
      });

      return filtered.length > 0 ? filtered : detailedBids;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  console.log(""); // New line after progress
  return [];
}

async function sendManifest(sdl, hostUri, dseq) {
  const jwt = await getTarget("jwt");
  if (!jwt) {
    throw new Error("No JWT found. Please run 'grid jwt' first.");
  }

  const manifest = await sdl.manifestSortedJSON();

  const response = await fetch(`https://${hostUri}:8443/deployment/${dseq}/manifest`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: manifest,
    signal: AbortSignal.timeout(60000),
  });

  if (response.status !== 200) {
    const body = await response.text();
    throw new Error(`Failed to send manifest: ${response.status} ${body}`);
  }

  return await response.json();
}

deployCommand.addCommand(postgresSubcommand);
