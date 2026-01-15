import DatabaseManager from "../../service/database/databaseAdmin.js";
import { Command } from "commander";
import { getTarget } from "../../utils/keyChain.js";
import { createChainNodeSDK, createStargateClient } from "@akashnetwork/chain-sdk";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";

const manager = new DatabaseManager();

const SECONDS_PER_BLOCK = 6.098;
const DAYS_PER_MONTH = 30;
const BLOCKS_PER_MONTH = Math.round((DAYS_PER_MONTH * 24 * 3600) / SECONDS_PER_BLOCK);
const UAKT_PER_AKT = 1_000_000;

export const databaseCommand = new Command("database")
  .description("Manage databases")
  .argument("[id]", "Database id to fetch details")
  .action(async (id) => {
    if (id) {
      const database = await manager.getDatabaseById(id);
      if (database) {
        displayDatabase(database);
      } else {
        console.log("Database not found.");
      }
      return;
    }
  });

const databaseLsCommand = new Command("ls")
  .description("List all databases")
  .action(async () => {
    const databases = await manager.getAllDatabases();
    if (databases.length === 0) {
      console.log("No databases found.");
      return;
    }
    displayDatabases(databases);
  });

const databaseRefund = new Command("refund")
  .description("Refund database and close deployment")
  .argument("<id>", "ID of database")
  .action(async (id) => {
    await manager.refundDatabase(id);
  });

const databaseDelete = new Command("delete")
  .description("Delete database by id or delete all failed databases with 'failed'")
  .argument("<idOrKeyword>", "ID of database or 'failed' to delete all failed databases")
  .action(async (idOrKeyword) => {
    if (!idOrKeyword) {
      console.log("Missing ID or keyword");
      return;
    }
    if (idOrKeyword === "failed") {
      await manager.deleteAllFailedDatabases();
    } else {
      await manager.deleteDatabase(idOrKeyword);
    }
  });

const databaseBids = new Command("bids")
  .description("List bids for a database (by dseq)")
  .argument("<dseq>", "Database sequence (dseq)")
  .action(async (dseq) => {
    const result = await getBidsForDatabase(dseq);
    if (result.length === 0) {
      console.log("No bids found.");
      return;
    }
    console.dir(result, { depth: null });
  });

async function getBidsForDatabase(dseqInput) {
  const mnemonic = await getTarget("mnemonic");
  if (!mnemonic) {
    console.error("No mnemonic found. Please login first.");
    return [];
  }

  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "akash" });
  const [{ address }] = await wallet.getAccounts();

  const signer = createStargateClient({
    baseUrl: "https://rpc.akashnet.net:443",
    signerMnemonic: mnemonic,
  });

  const chainSdk = createChainNodeSDK({
    query: { baseUrl: "https://akash-grpc.publicnode.com:443" },
    tx: { signer },
  });

  const providersResp = await fetch("https://console-api.akash.network/v1/providers");
  const providersJson = await providersResp.json();
  const providers = Array.isArray(providersJson) ? providersJson : (providersJson?.providers ?? []);

  const page = await chainSdk.akash.market.v1beta5.getBids({
    filters: { owner: address, dseq: dseqInput, state: "open" },
    pagination: { limit: 100 },
  });

  const bids = page?.bids ?? [];
  const filteredBids = bids.filter((b) => b.bid.state === 1 && b.bid.id.provider !== null);

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
      PricePerMonth: pricePerMonthAKT.toFixed(4),
      bidId: b?.bid?.id,
    };
  });

  detailedBids.sort((a, b) => {
    if ((b.providerUptime30d ?? 0) > (a.providerUptime30d ?? 0)) return 1;
    if ((b.providerUptime30d ?? 0) < (a.providerUptime30d ?? 0)) return -1;
    return 0;
  });

  return detailedBids;
}

function displayDatabase(db) {
  console.log("\n--- Database Details ---");
  console.log(`ID:              ${db.id}`);
  console.log(`Services:        ${db.services.join(", ")}`);
  console.log(`Host:            ${db.host || "N/A"}`);
  console.log(`Ports:           ${db.ports.length > 0 ? db.ports.join(", ") : "N/A"}`);
  console.log(`Time Left:       ${db.time_left}`);
  console.log(`Expiration Date: ${db.expiration_date ? db.expiration_date.toISOString() : "N/A"}`);

  if (db.resources.length > 0) {
    console.log("Resources:");
    db.resources.forEach((r, i) => {
      console.log(`  [${i + 1}] CPU: ${r.cpu} cores, RAM: ${r.ram.toFixed(2)} GB, Storage: ${r.storage.toFixed(2)} GB, Persistent: ${r.persistent_storage.toFixed(2)} GB`);
    });
  }
  console.log("");
}

function displayDatabases(databases) {
  console.log("\n=== Your Databases ===\n");

  databases.forEach((db, index) => {
    console.log(`[${index + 1}] Database ID: ${db.id}`);
    console.log(`    Services:        ${db.services.join(", ")}`);
    console.log(`    Host:            ${db.host || "N/A"}`);
    console.log(`    Ports:           ${db.ports.length > 0 ? db.ports.join(", ") : "N/A"}`);
    console.log(`    Time Left:       ${db.time_left}`);
    console.log(`    Expiration Date: ${db.expiration_date ? db.expiration_date.toISOString() : "N/A"}`);

    if (db.resources.length > 0) {
      console.log("    Resources:");
      db.resources.forEach((r, i) => {
        console.log(`      [${i + 1}] CPU: ${r.cpu} cores, RAM: ${r.ram.toFixed(2)} GB, Storage: ${r.storage.toFixed(2)} GB, Persistent: ${r.persistent_storage.toFixed(2)} GB`);
      });
    }
    console.log("");
  });

  console.log(`Total: ${databases.length} database(s)\n`);
}

databaseCommand.addCommand(databaseLsCommand);
databaseCommand.addCommand(databaseRefund);
databaseCommand.addCommand(databaseDelete);
databaseCommand.addCommand(databaseBids);
