
import path from "path";
import dotenv from "dotenv";
import chalk from "chalk";
import { createChainNodeSDK, createStargateClient } from "@akashnetwork/chain-sdk";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import Long from "long";
import { getTarget } from "../../utils/keyChain.js"


dotenv.config({ path: path.resolve(process.cwd(), '.env') });


class DeploymentManager {
  constructor() {
    this.rpcEndpoint = process.env.BACKEND_URL_DEV || "https://rpc.akt.dev/rpc";
  }

  async getDeployments() {
    const mnemonic = await getTarget("mnemonic");
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "akash" });
    const [{ address }] = await wallet.getAccounts();
    console.log(address);

    const signer = createStargateClient({
      baseUrl: 'https://rpc.akashnet.net:443', // blockchain rpc endpoint
      signerMnemonic: mnemonic
    });

    // endpoints can be found in https://github.com/akash-network/net
    const chainSdk = createChainNodeSDK({
      query: {
        baseUrl: "https://akash-grpc.publicnode.com/", // blockchain gRPC endpoint url
      },
      tx: {
        signer,
      },
    });

    // Query deployments
    const dseq = Long.fromString(String("23981433"), true);
    const result = await chainSdk.akash.deployment.v1beta4.getDeployment({
      id: { owner: address, dseq },
    });
    console.log(result);

    return result
  }

  async getDeploymentById(id) {
    try {
      const mnemonic = await getTarget("mnemonic");
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "akash" });
      const [{ address }] = await wallet.getAccounts();

      const signer = createStargateClient({
        baseUrl: 'https://rpc.akashnet.net:443', // blockchain rpc endpoint
        signerMnemonic: mnemonic
      });

      // endpoints can be found in https://github.com/akash-network/net
      const chainSdk = createChainNodeSDK({
        query: {
          baseUrl: "https://akash-grpc.publicnode.com/", // blockchain gRPC endpoint url
        },
        tx: {
          signer,
        },
      });

      const dseq = Long.fromString(String("23981433"), true);
      const result = await chainSdk.akash.deployment.v1beta4.getDeployment({
        id: { owner: address, dseq },
      });
      return result;
    } catch (error) {
      console.error("❌ Error fetching deployment. If the error persists, contact support@ongrid.run");
      process.exit(1);
    }
  }

  async deleteAllFailedDeployments() {
    try {
      const data = await this.getDeployments(); // o como obtengas los deployments
      const failedDeployments = data
        .filter(deployment => deployment.status === "Failed")
        .map(deployment => deployment.id);
      console.log(failedDeployments);

      for (let index = 0; index < failedDeployments.length; index++) {
        console.log(failedDeployments[index]);
        await this.deleteDeployment(failedDeployments[index])
      }

    } catch (error) {
      console.error("❌ Error deleting deployment. If the error persists, contact support@ongrid.run")
    }
  }
  async getDeploymentByUrl(bidId, hostUri) {
    try {
      if (!bidId || !hostUri) {
        console.error("❌ Error: Missing bidId or hostUri parameters");
        return null;
      }

      if (!bidId.dseq || bidId.gseq === undefined || bidId.oseq === undefined) {
        console.error("❌ Error: bidId missing required fields (dseq, gseq, oseq)");
        return null;
      }

      const jwt = await getTarget("jwt");
      if (!jwt) {
        console.error("❌ Error: No JWT found. Please run 'grid jwt' first to create a JWT token.");
        return null;
      }

      // Construct provider URL from hostUri
      // hostUri might be like "hurricane.akash.pub" or already be a full URL
      let providerUrl;
      if (hostUri.startsWith('http')) {
        providerUrl = hostUri;
      } else if (hostUri.includes('provider.')) {
        providerUrl = `https://${hostUri}:8443`;
      } else {
        // Convert provider hostname to provider URL format
        // e.g., "hurricane.akash.pub" -> "https://provider.hurricane.akash.pub:8443"
        const firstDot = hostUri.indexOf('.');
        const secondDot = hostUri.indexOf('.', firstDot + 1);
        if (secondDot === -1) {
          providerUrl = `https://provider.${hostUri}:8443`;
        } else {
          providerUrl = `https://provider${hostUri.slice(secondDot)}:8443`;
        }
      }
      
      const url = `https://${providerUrl}/lease/${bidId.dseq}/${bidId.gseq}/${bidId.oseq}/status`;
      console.log(url);
      
      console.log(`Fetching lease status from: ${url}`);

      
      const leaseDetails = await fetch(providerUrl, {
        headers: {
          Authorization: `Bearer ${jwt}`
        },
      });
     
      return await leaseDetails.json();
    } catch (error) {
      console.error("❌ Error fetching deployment. If the error persists, contact support@ongrid.run");
      console.error(error.message);
      return null;
    }
  }


  async refundAkash(id) {
    try {
      const jwt = await getTarget("jwt");
      const response = await fetch(`${this.backendUrl}akash/refund/${id}`, {
        method: "POST",
        headers: {
          "Accept": "*/*",
          Authorization: `Bearer ${jwt}`,
        },
      });

      const data = await response.json();

      if (data.status === 'success') {
        console.log(chalk.green(`✅ Refund completed successfully. Refund amount: ${data.refundAmount}`));
        process.exit(0);
      } else {
        console.error(chalk.red("❌ Error: Please verify that the deployment has not already been refunded or failed."));
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error refunding deployment. If the error persists, contact support@ongrid.run");
      process.exit(1);
    }
  }
}

export default DeploymentManager;
