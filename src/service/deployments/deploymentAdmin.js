
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

      const dseq = Long.fromString(String(id), true);
      const result = await chainSdk.akash.deployment.v1beta4.getDeployment({
        id: { owner: address, dseq },
      });

      const leaseData = await this.getLeaseStatusByDseq(dseq);

      const structureData = {
        service: leaseData.services.postgres,
        ports: [
          {
            port: leaseData.forwarded_ports.postgres[0].port,
            externalPort: leaseData.forwarded_ports.postgres[0].externalPort
          }
        ]
      };
      console.log(structureData);



    } catch (error) {
      console.error("❌ Error fetching deployment. If the error persists, contact support@ongrid.run");
      console.error(error.message);
      return null;
    }
  }

  async getProviderUriFromDseq(dseq) {
    try {
      const mnemonic = await getTarget("mnemonic");
      if (!mnemonic) {
        console.error("❌ Error: No mnemonic found. Please run 'grid login' first.");
        return null;
      }

      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "akash" });
      const [{ address }] = await wallet.getAccounts();

      const signer = createStargateClient({
        baseUrl: 'https://rpc.akashnet.net:443',
        signerMnemonic: mnemonic
      });

      const chainSdk = createChainNodeSDK({
        query: {
          baseUrl: "https://akash-grpc.publicnode.com/",
        },
        tx: {
          signer,
        },
      });

      const dseqLong = Long.fromString(String(dseq), true);

      // Get leases for this deployment
      const leases = await chainSdk.akash.market.v1beta5.getLeases({
        filters: {
          owner: address,
          dseq: dseqLong
        },
        pagination: { limit: 100 }
      });

      if (!leases.leases || leases.leases.length === 0) {
        console.error("❌ No leases found for this deployment");
        return null;
      }

      // Get provider address from the first lease
      const providerAddress = leases.leases[0].lease.id.provider;


      const providersResp = await fetch("https://console-api.akash.network/v1/providers");
      const providersJson = await providersResp.json();
      const providers = Array.isArray(providersJson) ? providersJson : (providersJson?.providers ?? []);

      const provider = providers.find((p) => p.owner === providerAddress);


      if (!provider) {
        console.error("❌ Could not find provider information");
        return null;
      }

      const hostUri = provider.hostUri || provider.name;

      if (!hostUri) {
        console.error("❌ Could not find provider hostUri");
        return null;
      }

      return hostUri;
    } catch (error) {
      console.error("❌ Error getting provider URI from dseq");
      console.error(error.message);
      return null;
    }
  }

  async getLeaseStatusByDseq(dseq, gseq = 1, oseq = 1) {
    try {
      const jwt = await getTarget("jwt");
      if (!jwt) {
        console.error("❌ Error: No JWT found. Please run 'grid jwt' first to create a JWT token.");
        return null;
      }

      // Get provider URI from dseq
      const hostUri = await this.getProviderUriFromDseq(dseq);
      if (!hostUri) {
        return null;
      }

      // Construct provider URL from hostUri
      let providerUrl;
      if (hostUri.startsWith('http://') || hostUri.startsWith('https://')) {
        providerUrl = hostUri;
      } else if (hostUri.includes('provider.')) {
        providerUrl = `https://${hostUri}:8443`;
      } else {

        const firstDot = hostUri.indexOf('.');
        const secondDot = hostUri.indexOf('.', firstDot + 1);
        if (secondDot === -1) {
          providerUrl = `https://provider.${hostUri}:8443`;
        } else {
          providerUrl = `https://provider${hostUri.slice(secondDot)}:8443`;
        }
      }

      // Construct the API endpoint
      const apiUrl = `${providerUrl}/lease/${dseq}/${gseq}/${oseq}/status`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      });

      if (!response.ok) {

        if (response.status !== 404) {
          console.error(`❌ Error: HTTP ${response.status} - ${response.statusText}`);
        }
        return null;
      }

      const leaseStatus = await response.json();
      return leaseStatus;
    } catch (error) {
      console.error("❌ Error fetching lease status. If the error persists, contact support@ongrid.run");
      console.error(error.message);
      return null;
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

      // Query deployments
      const dseq = Long.fromString(String(id), true);
      

      const closeDeployment = await chainSdk.akash.deployment.v1beta4.closeDeployment({
        id: {
          owner: address,
          dseq: dseq
        }
      })  

      console.log(closeDeployment);
      

      // if (data.status === 'success') {
      //   console.log(chalk.green(`✅ Refund completed successfully. Refund amount: ${data.refundAmount}`));
      //   process.exit(0);
      // } else {
      //   console.error(chalk.red("❌ Error: Please verify that the deployment has not already been refunded or failed."));
      //   process.exit(1);
      // }
    } catch (error) {
      console.error("❌ Error refunding deployment. If the error persists, contact support@ongrid.run");
      process.exit(1);
    }
  }
}

export default DeploymentManager;
