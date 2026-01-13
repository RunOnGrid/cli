import DeploymentManager from "../../service/deployments/deploymentAdmin.js";
import { Command } from "commander";
import { getTarget } from "../../utils/keyChain.js";
import { createChainNodeSDK, createStargateClient } from "@akashnetwork/chain-sdk";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";

const manager = new DeploymentManager();

const SECONDS_PER_BLOCK = 6.098;
const DAYS_PER_MONTH = 30;
const BLOCKS_PER_MONTH = Math.round((DAYS_PER_MONTH * 24 * 3600) / SECONDS_PER_BLOCK);
const UAKT_PER_AKT = 1_000_000;

export const deploymentsCommand = new Command("deployment")
    .description("Manage deployments")

const deploymentsLsCommand = new Command("list")
    .description("Get deployments")
    .action(async () => {
        const result = await manager.getDeploymentByUrl();
        console.log(result);
    });


const deploymentsByIdCommand = new Command("id")
    .description("Get deployments by id")
    .argument("<id>", "List deployment by id")
    .action(async (id) => {
        const deployment = await manager.getDeploymentById(id);
        console.dir(deployment, { depth: null });
    })

const deploymentRefund = new Command("refund")
    .description("Akash deployment refund")
    .argument("<id>", "ID of Akash deployment")
    .action(async (id) => {
        await manager.refundAkash(id)
    })

const deploymentDelete = new Command("delete")
    .description("Delete deployment by id or delete all failed deployments with 'failed'")
    .argument("<idOrKeyword>", "ID of deployment or 'failed' to delete all failed deployments")
    .action(async (idOrKeyword) => {
        if (!idOrKeyword) {
            console.log("Missing ID or keyword");
            return;
        }
        if (idOrKeyword === "failed") {
            await manager.deleteAllFailedDeployments();
        } else {
            await manager.deleteDeployment(idOrKeyword);
        }
    });

const deploymentBids = new Command("bids")
    .description("List bids for a deployment (by dseq)")
    .argument("<dseq>", "Deployment sequence (dseq)")
    .action(async (dseq) => {
        const result = await getBidsForDeployment(dseq);
        if (result.length === 0) {
            console.log("No bids found.");
            return;
        }
        console.dir(result, { depth: null });
    });

async function getBidsForDeployment(dseqInput) {
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
    const filteredBids = bids.filter((b) =>
        b.bid.state === 1 && b.bid.id.provider !== null
    );

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

    // Sort by uptime
    detailedBids.sort((a, b) => {
        if ((b.providerUptime30d ?? 0) > (a.providerUptime30d ?? 0)) return 1;
        if ((b.providerUptime30d ?? 0) < (a.providerUptime30d ?? 0)) return -1;
        return 0;
    });

    return detailedBids;
}

deploymentsCommand.addCommand(deploymentsLsCommand);
deploymentsCommand.addCommand(deploymentsByIdCommand);
deploymentsCommand.addCommand(deploymentRefund);
deploymentsCommand.addCommand(deploymentDelete);
deploymentsCommand.addCommand(deploymentBids);
