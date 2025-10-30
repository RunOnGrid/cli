import { getMnemonic } from "../../../utils/keyChain.js";
import path from 'path';
import { select } from '@inquirer/prompts';
import dotenv from "dotenv";
import Long from "long";
import { createChainNodeSDK, createStargateClient, SDL } from "@akashnetwork/chain-sdk";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import fs from "fs"
import { calculateDeploymentMetrics } from "../../../helpers/akashHelper.js";


const SECONDS_PER_BLOCK = 6.098; // tune if chain varies
const DAYS_PER_MONTH = 30;   // or 30.44 for average month
const BLOCKS_PER_MONTH = Math.round((DAYS_PER_MONTH * 24 * 3600) / SECONDS_PER_BLOCK);



dotenv.config({ path: path.resolve(process.cwd(), '.env') });

class deployManager {
  constructor() {
    this.rpc = "https://rpc.akashnet.net:443"
    this.grpc = "https://akash-grpc.publicnode.com:443"
  }
  async deployRedis() {

    const mnemonic = await getMnemonic();
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "akash" });
    const [{ address }] = await wallet.getAccounts();

    const signer = createStargateClient({
      baseUrl: this.rpc,
      signerMnemonic: mnemonic
    });

    const chainSdk = createChainNodeSDK({
      query: { baseUrl: this.grpc },  // gRPC (host:port)
      tx: { signer }
    });

    const rawSDL = fs.readFileSync("/Users/benjaminaguirre/Documents/cli/redis.yaml", "utf8");
    const sdl = SDL.fromString(rawSDL);


    const groups = sdl.groups();
    const manifestHash = await sdl.manifestVersion();

    const latestBlock = await chainSdk.cosmos.base.tendermint.v1beta1.getLatestBlock();
    const dseq = Long.fromString(String(latestBlock.block?.header?.height ?? Date.now()), true);

    const deploymentMsg = {
      id: { owner: address, dseq },
      groups,
      hash: manifestHash,
      deposit: {
        amount: { denom: "uakt", amount: "500000" },
        sources: [1]
      }
    };

    // 5) Send tx to create deployment
    await chainSdk.akash.deployment.v1beta4.createDeployment(deploymentMsg)

    
    const bids = await this.getBidsForDeployment((dseq.low));
    console.log(bids);
    

    const UAKT_PER_AKT = 1_000_000;

    const choices = bids.map((b) => {
      const priceAKT = ((b.PricePerMonth ?? 0) * 0.7);
      
      const label = `${b.providerName ?? 'Unknown'} • ${b.providerIpCountry ?? ''} • ${b.providerIpRegion ?? ''} • $${priceAKT} month • Uptime30d ${b.providerUptime30d * 100}% `;
      return {
        name: label,
        value: {
          ...b,
          pricePerMonthAKT: priceAKT,
        },
      };
    });

    const answer = await select({
      message: 'Select a provider',
      choices,
    });

    // await chainSdk.akash.market.v1beta5.createLease(selectedBid);

    // 6) Send manifest to a provider afterwards (choose a provider URL)
    // const manifest = sdl.manifest();
    // await providerSdk.sendManifest({ dseq, manifest, ...auth });
  };

  async getBidsForDeployment(dseqInput) {

    const mnemonic = await getMnemonic();
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "akash" });
    const [{ address }] = await wallet.getAccounts();

    const signer = createStargateClient({
      baseUrl: this.rpc,
      signerMnemonic: mnemonic,
    });

    const chainSdk = createChainNodeSDK({
      query: { baseUrl: this.grpc },
      tx: { signer },
    });

    const providersResp = await fetch("https://console-api.akash.network/v1/providers");

    const providersJson = await providersResp.json();
    const providers = Array.isArray(providersJson) ? providersJson : (providersJson?.providers ?? []);


    const page = await chainSdk.akash.market.v1beta5.getBids({
      filters: { owner: address, dseqInput }, // optionally add: state: "open"
      pagination: { limit: 100 },
    });
    const bids = page?.bids ?? [];

    const latestBlockResp = await chainSdk.cosmos.base.tendermint.v1beta1.getLatestBlock();
    const latestHeight = Number(latestBlockResp?.block?.header?.height ?? 0);

    const detailedBids = await Promise.all(
      bids.map(async (b) => {
        const providerOwner = b?.bid.id.provider;

        const provider = providers.find((p) => p.owner === providerOwner);

        const metrics = calculateDeploymentMetrics(dseqInput, latestHeight, b.bid.price.amount, b.escrowAccount.state.funds[0]);

        return {
          providerName: provider?.name,
          providerHostUri: provider?.hostUri,
          providerIpRegion: provider?.ipRegion,
          providerIpRegionCode: provider?.ipRegionCode,
          providerIpCountry: provider?.ipCountry,
          providerIpCountryCode: provider?.ipCountryCode,
          providerIpLat: provider?.ipLat,
          providerIpLon: provider?.ipLon,
          providerUptime1d: provider?.uptime1d,
          providerUptime7d: provider?.uptime7d,
          providerUptime30d: provider?.uptime30d,
          providerIsOnline: provider?.isOnline,
          providerIsAudited: provider?.isAudited,
          providerOwner: provider?.owner,
          bidId: b?.bid?.id,
          bidPriceMonthly: metrics,
          pricePerBlock: metrics.pricePerBlockUakt,
        };
      }));


    detailedBids.sort((a, b) => {
      if (a.providerIsAudited && !b.providerIsAudited) return -1;
      if (!a.providerIsAudited && b.providerIsAudited) return 1;
      if (a.pricePerBlock < b.pricePerBlock) return -1;
      if (a.pricePerBlock > b.pricePerBlock) return 1;
      return b.providerUptime30d - a.providerUptime30d;
    });

    const projected = detailedBids.map((b) => {
      const pricePerMonthUAKT = (b.pricePerBlock ?? 0) * BLOCKS_PER_MONTH;
      const pricePerMonthAKT = pricePerMonthUAKT / UAKT_PER_AKT;
    
      return {
        providerName: b.providerName,
        providerRegion: b.providerIpRegion,
        providerCountry: b.providerIpCountry,
        providerUptime30d: b.providerUptime30d,
        providerIsAudited: b.providerIsAudited,
        PricePerMonth: pricePerMonthAKT,      // en AKT// opcional, en uakt
      };
    });

    return projected;
  }
}

export default deployManager;