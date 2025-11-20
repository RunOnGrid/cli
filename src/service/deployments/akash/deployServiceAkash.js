import { getTarget } from "../../../utils/keyChain.js";
import path from 'path';
import { select } from '@inquirer/prompts';
import dotenv from "dotenv";
import Long from "long";
import { createChainNodeSDK, createStargateClient, SDL } from "@akashnetwork/chain-sdk";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import fs from "fs"
import { calculateDeploymentMetrics } from "../../../helpers/akashHelper.js";
import DeploymentManager from "../deploymentAdmin.js"

const SECONDS_PER_BLOCK = 6.098; // tune if chain varies
const DAYS_PER_MONTH = 30;   // or 30.44 for average month
const BLOCKS_PER_MONTH = Math.round((DAYS_PER_MONTH * 24 * 3600) / SECONDS_PER_BLOCK);
const deploymentService = new DeploymentManager();

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

class deployManager {
  constructor() {
    this.rpc = "https://rpc.akashnet.net:443"
    this.grpc = "https://akash-grpc.publicnode.com:43"
  }
  async deployRedis(flag) {

    const mnemonic = await getTarget("mnemonic");
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

    // Wait a moment for deployment to be confirmed on chain
    // This ensures sequence numbers are properly updated
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Wait for providers to post OPEN bids
    const bids = await this.waitForOpenBids(dseq, 12, 5000);


    const choices = bids.map((b) => {
      const priceAKT = ((b.PricePerMonth ?? 0) * 0.7);

      const label = `$${priceAKT} month  • ${b.providerName ?? 'Unknown'} • ${b.providerRegion ?? ''} • ${b.providerCountry ?? ''} • Uptime30d ${(b.providerUptime30d * 100).toFixed(3)}%`;
      return {
        name: label,
        value: {
          ...b,
          pricePerMonthAKT: priceAKT,
        },
      };
    });

    let answer;
    if (flag) {
      answer = choices[0].value;
      console.log(`Auto-selecting first provider: ${answer.providerName ?? 'Unknown'}`);
    } else {
      answer = await select({
        message: 'Select a provider',
        choices,
      });
    }

    await chainSdk.akash.market.v1beta5.createLease({ bidId: answer.bidId });


    await this.sendManifest(sdl, answer.providerName, dseq);
    const leaseData = await deploymentService.getDeploymentByUrl(answer.bidId, answer.providerName)

    console.log(leaseData);
    
    return;
  };

  async sendManifest(sdl, hostUri, dseq) {
    try {
      const jwt = await getTarget("jwt");
      const manifest = await sdl.manifestSortedJSON();
      
      const response = await fetch(`https://${hostUri}:8443/deployment/${dseq}/manifest`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: manifest,
        signal: AbortSignal.timeout(60000)
      });
      
      if (response.status !== 200) {
          throw new Error("Error sending manifest");
      }
      
      return await response.json();
    }
    catch (error) {
      console.error("Error sending manifest");
    }
  }



  async getBidsForDeployment(dseqInput) {

    const mnemonic = await getTarget("mnemonic");
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
      filters: { owner: address, dseq: dseqInput, state: "open" },
      pagination: { limit: 100 },
    });

    const bids = page?.bids ?? [];
    const filteredBids = bids.filter((b) =>
      b.bid.state === 1 &&
      b.bid.id.provider !== null
    );

    const latestBlockResp = await chainSdk.cosmos.base.tendermint.v1beta1.getLatestBlock();
    const latestHeight = Number(latestBlockResp?.block?.header?.height ?? 0);

    const detailedBids = await Promise.all(
      filteredBids.map(async (b) => {
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

    const MIN_UPTIME = 0.98
    const filteredByUptime = detailedBids.filter((b) => b.providerUptime30d >= MIN_UPTIME)


    filteredByUptime.sort((a, b) => {
      if ((b.providerUptime30d ?? 0) > (a.providerUptime30d ?? 0)) return 1
      if ((b.providerUptime30d ?? 0) < (a.providerUptime30d ?? 0)) return -1


      if (a.providerIsAudited && !b.providerIsAudited) return -1;
      if (!a.providerIsAudited && b.providerIsAudited) return 1;

      if (a.pricePerBlock < b.pricePerBlock) return -1;
      if (a.pricePerBlock > b.pricePerBlock) return 1;
      return 0;
    });



    const UAKT_PER_AKT = 1_000_000;

    const projected = filteredByUptime.map((b) => {
      const pricePerMonthUAKT = (b.pricePerBlock ?? 0) * BLOCKS_PER_MONTH;
      const pricePerMonthAKT = pricePerMonthUAKT / UAKT_PER_AKT;

      return {
        providerName: b.providerName,
        providerRegion: b.providerIpRegion,
        providerCountry: b.providerIpCountry,
        providerUptime30d: b.providerUptime30d,
        providerIsAudited: b.providerIsAudited,
        PricePerMonth: pricePerMonthAKT,
        bidId: b.bidId
      };
    });

    return projected;
  }

  async waitForOpenBids(dseq, maxAttempts = 12, delayMs = 5000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const bids = await this.getBidsForDeployment(dseq);
      if (Array.isArray(bids) && bids.length > 0) return bids;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return [];
  }
}

export default deployManager;


