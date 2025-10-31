import { getMnemonic } from "../../utils/keyChain.js";
import path from "path";
import dotenv from "dotenv";
import chalk from "chalk";
import { createChainNodeSDK, createStargateClient } from "@akashnetwork/chain-sdk";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import Long from "long";


dotenv.config({ path: path.resolve(process.cwd(), '.env') });


class DeploymentManager {
  constructor() {
    this.rpcEndpoint = process.env.BACKEND_URL_DEV || "https://rpc.akt.dev/rpc";
    this.wallet = getMnemonic()
  }

  async getDeployments() {
      const mnemonic = await getMnemonic();
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
      const mnemonic = await getMnemonic();
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

  async deleteDeployment(id) {
    try {
      const jwt = await getToken();
      const response = await fetch(`${this.backendUrl}deployments/${id}`, {
        method: "DELETE",
        headers: {
          "Accept": "*/*",
          Authorization: `Bearer ${jwt}`,
        },
      });

      const data = await response.json();

      if (data == 1) {
        console.log(chalk.green("✅ Deployment successfully deleted"));
        return
      } else {
        console.error(chalk.red("❌ Error deleting deployment. If the problem persists, contact support@ongrid.run"));
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error deleting deployment. If the error persists, contact support@ongrid.run");
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

  async refundAkash(id) {
    try {
      const jwt = await getToken();
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
