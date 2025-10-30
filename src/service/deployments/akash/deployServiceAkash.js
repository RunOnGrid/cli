import { getMnemonic } from "../../../utils/keyChain.js";
import path from 'path';
import dotenv from "dotenv";
import Long from "long";
import { createChainNodeSDK, createStargateClient, SDL } from "@akashnetwork/chain-sdk";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import fs from "fs"
import { calculateDeploymentMetrics } from "../../../helpers/akashHelper.js";



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
    const createRes = await chainSdk.akash.deployment.v1beta4.createDeployment(deploymentMsg)



    // 6) Send manifest to a provider afterwards (choose a provider URL)
    // const manifest = sdl.manifest();
    // await providerSdk.sendManifest({ dseq, manifest, ...auth });

    return createRes;
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

    const dseq = Long.fromString(String(dseqInput), true);
    const providersResp = await fetch("https://console-api.akash.network/v1/providers");
    
    const providersJson = await providersResp.json();
    const providers = Array.isArray(providersJson) ? providersJson : (providersJson?.providers ?? []);
    console.log(providers);
    
  

    const page = await chainSdk.akash.market.v1beta5.getBids({
      filters: { owner: address, dseq }, // optionally add: state: "open"
      pagination: { limit: 100 },
    });
    const bids = page?.bids ?? [];

    

    const latestBlockResp = await chainSdk.cosmos.base.tendermint.v1beta1.getLatestBlock();
    const latestHeight = Number(latestBlockResp?.block?.header?.height ?? 0);

    const detailedBids = await Promise.all(
      bids.map(async (b) => {
        const providerOwner = b?.bid.id.provider;
        console.log(b.bid);
        
        
        const provider = providers.find((p) => p.owner === providerOwner);
        console.log(provider);
        
        
        const dseqNum = Number(dseq.toString());
        
        const metrics = calculateDeploymentMetrics(dseqNum, latestHeight, b.bid.price.amount, b.escrowAccount.state.funds[0]);
        const attrs = provider?.attributes ?? [];
        const attrsMap = Object.fromEntries(attrs.map(a => [a.key, a.value]));
        
        
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
          bidId: b?.bid?.bidId,
          bid: b,
          bidPriceMonthly: metrics,
          pricePerBlock: metrics.pricePerBlockUakt,
        };
      }));


    // detailedBids.sort((a, b) => {
    //   if (a.providerIsAudited && !b.providerIsAudited) return -1;
    //   if (!a.providerIsAudited && b.providerIsAudited) return 1;
    //   if (a.pricePerBlock < b.pricePerBlock) return -1;
    //   if (a.pricePerBlock > b.pricePerBlock) return 1;
    //   return b.providerUptime30d - a.providerUptime30d;
    // });

    return { bids: detailedBids, pagination: { total: detailedBids.length } };
  }
}

export default deployManager;