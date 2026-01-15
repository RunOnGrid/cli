import path from "path";
import dotenv from "dotenv";
import { createChainNodeSDK, createStargateClient } from "@akashnetwork/chain-sdk";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import Long from "long";
import { getTarget } from "../../utils/keyChain.js";
import { calculateTimeLeft } from "../../helpers/akashHelper.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const SECONDS_PER_BLOCK = 6.098;

// Helper to decode Uint8Array to number
function decodeUint8ArrayValue(val) {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val) || 0;

  // Handle Uint8Array - decode as UTF-8 string then parse as number
  if (val instanceof Uint8Array || (val.buffer && val.byteLength !== undefined)) {
    try {
      const decoder = new TextDecoder("utf-8");
      const str = decoder.decode(val);
      return Number(str) || 0;
    } catch (e) {
      return 0;
    }
  }
  return Number(val) || 0;
}

class DatabaseManager {
  constructor() {
    this.rpcEndpoint = process.env.BACKEND_URL_DEV || "https://rpc.akt.dev/rpc";
  }

  async initChainSdk() {
    const mnemonic = await getTarget("mnemonic");
    if (!mnemonic) {
      console.error("No mnemonic found. Please run 'grid login' first.");
      return null;
    }

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "akash" });
    const [{ address }] = await wallet.getAccounts();

    const signer = createStargateClient({
      baseUrl: "https://rpc.akashnet.net:443",
      signerMnemonic: mnemonic,
    });

    const chainSdk = createChainNodeSDK({
      query: {
        baseUrl: "https://akash-grpc.publicnode.com/",
      },
      tx: {
        signer,
      },
    });

    return { chainSdk, address, mnemonic };
  }

  async getLastBlock(chainSdk) {
    try {
      const lastBlock = await chainSdk.cosmos.base.tendermint.v1beta1.getLatestBlock();
      const height = lastBlock.block?.header?.height || lastBlock.sdkBlock?.header?.height;
      
      
      return height ? Number(height.low) : 0;
    } catch (error) {
      console.error("Error fetching last block:", error.message);
      return 0;
    }
  }

  async getProviderUriFromLease(chainSdk, address, dseq) {
    try {
      const dseqLong = Long.fromString(String(dseq), true);
      const leases = await chainSdk.akash.market.v1beta5.getLeases({
        filters: {
          owner: address,
          dseq: dseqLong,
        },
        pagination: { limit: 100 },
      });

      if (!leases.leases || leases.leases.length === 0) {
        return null;
      }

      const providerAddress = leases.leases[0].lease.id.provider;
      const providersResp = await fetch("https://console-api.akash.network/v1/providers");
      const providersJson = await providersResp.json();
      const providers = Array.isArray(providersJson) ? providersJson : (providersJson?.providers ?? []);
      const provider = providers.find((p) => p.owner === providerAddress);

      return provider?.hostUri || provider?.name || null;
    } catch (error) {
      return null;
    }
  }

  buildProviderUrl(hostUri) {
    if (!hostUri) return null;

    if (hostUri.startsWith("http://") || hostUri.startsWith("https://")) {
      return hostUri;
    }
    if (hostUri.includes("provider.")) {
      return `https://${hostUri}:8443`;
    }
    const firstDot = hostUri.indexOf(".");
    const secondDot = hostUri.indexOf(".", firstDot + 1);
    if (secondDot === -1) {
      return `https://provider.${hostUri}:8443`;
    }
    return `https://provider${hostUri.slice(secondDot)}:8443`;
  }

  async getLeaseStatus(providerUrl, dseq, gseq = 1, oseq = 1) {
    try {
      const jwt = await getTarget("jwt");
      if (!jwt) {
        return null;
      }

      const apiUrl = `${providerUrl}/lease/${dseq}/${gseq}/${oseq}/status`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  buildDatabaseDTO(deployment, leaseStatus, lastBlock, dseq) {
    const services = [];
    const ports = [];
    const resources = [];

    // Extract services, ports and resources from lease status
    if (leaseStatus && leaseStatus.services) {
      for (const [serviceName, serviceInfo] of Object.entries(leaseStatus.services)) {
        services.push(serviceName);
      }
    }

    if (leaseStatus && leaseStatus.forwarded_ports) {
      for (const [serviceName, portList] of Object.entries(leaseStatus.forwarded_ports)) {
        if (Array.isArray(portList)) {
          portList.forEach((p) => {
            ports.push({
              service: serviceName,
              externalPort: p.externalPort,
              port: p.port,
            });
          });
        }
      }
    }
    // Extract resources from deployment groups
    if (deployment?.groups) {
      deployment.groups.forEach((group) => {
        if (group?.groupSpec?.resources) {
          group.groupSpec.resources.forEach((resWrapper) => {
            const r = resWrapper?.resource || resWrapper;

            // Decode Uint8Array values
            const cpuVal = decodeUint8ArrayValue(r?.cpu?.units?.val);
            const memVal = decodeUint8ArrayValue(r?.memory?.quantity?.val);

            // Handle storage array
            let storageVal = 0;
            let persistentStorageVal = 0;

            if (r?.storage && Array.isArray(r.storage)) {
              r.storage.forEach((s) => {
                const qty = decodeUint8ArrayValue(s?.quantity?.val);
                // Check if persistent by name or attribute
                const isPersistent = s.name === "data" ||
                  s.attributes?.some((attr) => attr.key === "persistent" && attr.value === "true");
                if (isPersistent) {
                  persistentStorageVal = qty;
                } else {
                  storageVal = qty;
                }
              });
            }

            resources.push({
              cpu: cpuVal / 1000,
              ram: memVal / (1024 * 1024 * 1024),
              storage: storageVal / (1024 * 1024 * 1024),
              persistent_storage: persistentStorageVal / (1024 * 1024 * 1024),
            });
          });
        }
      });
    }

    // Get host from forwarded ports
    let host = "";
    if (ports.length > 0 && leaseStatus?.forwarded_ports) {
      const firstPortInfo = Object.values(leaseStatus.forwarded_ports)[0];
      if (firstPortInfo && firstPortInfo[0]?.host) {
        host = firstPortInfo[0].host;
      }
    }

    // Calculate time left
    // Escrow balance from funds or deposits
    const escrowBalance =
      deployment?.escrowAccount?.state?.funds?.[0]?.amount ||
      deployment?.escrowAccount?.state?.deposits?.[0]?.balance?.amount ||
      "0";
    const pricePerBlock = deployment?.groups?.[0]?.groupSpec?.resources?.[0]?.price?.amount || "0";

    // Handle Long object for dseq
    const dseqNum = typeof dseq === "object" && dseq.low !== undefined ? dseq.low : Number(dseq);

    const timeMetrics = calculateTimeLeft(dseqNum, lastBlock, pricePerBlock, { amount: escrowBalance });

    return {
      id: dseq.toString(),
      services: services.length > 0 ? services : ["unknown"],
      host,
      resources,
      ports: ports.map((p) => `${p.service}(${p.externalPort}:${p.port})`),
      time_left: timeMetrics.timeRemainingFormatted,
      expiration_date: timeMetrics.expirationDate,
    };
  }

  async getAllDatabases() {
    try {
      const init = await this.initChainSdk();
      if (!init) return [];

      const { chainSdk, address } = init;

      // Get all active deployments
      const deployments = await chainSdk.akash.deployment.v1beta4.getDeployments({
        filters: {
          owner: address,
          state: "active",
        },
        pagination: { limit: 100 },
      });

      if (!deployments.deployments || deployments.deployments.length === 0) {
        return [];
      }

      const lastBlock = await this.getLastBlock(chainSdk);
      const databases = [];

      for (const dep of deployments.deployments) {
        const dseq = dep.deployment.id.dseq;
        const hostUri = await this.getProviderUriFromLease(chainSdk, address, dseq);
        const providerUrl = this.buildProviderUrl(hostUri);

        let leaseStatus = null;
        if (providerUrl) {
          leaseStatus = await this.getLeaseStatus(providerUrl, dseq);
        }
        
        const dto = this.buildDatabaseDTO(dep, leaseStatus, lastBlock, dseq);
        dto.host = hostUri || "";
        databases.push(dto);
      }

      return databases;
    } catch (error) {
      console.error("Error fetching databases:", error.message);
      return [];
    }
  }

  async getDatabaseById(id) {
    try {
      const init = await this.initChainSdk();
      if (!init) return null;

      const { chainSdk, address } = init;
      const dseq = Long.fromString(String(id), true);

      const result = await chainSdk.akash.deployment.v1beta4.getDeployment({
        id: { owner: address, dseq },
      });

      if (!result) return null;

      const lastBlock = await this.getLastBlock();
      const hostUri = await this.getProviderUriFromLease(chainSdk, address, id);
      const providerUrl = this.buildProviderUrl(hostUri);

      let leaseStatus = null;
      if (providerUrl) {
        leaseStatus = await this.getLeaseStatus(providerUrl, id);
      }

      const dto = this.buildDatabaseDTO(result, leaseStatus, lastBlock, dseq);
      dto.host = hostUri || "";
      return dto;
    } catch (error) {
      console.error("Error fetching database:", error.message);
      return null;
    }
  }

  async deleteDatabase(id) {
    try {
      const init = await this.initChainSdk();
      if (!init) return false;

      const { chainSdk, address } = init;
      const dseq = Long.fromString(String(id), true);

      await chainSdk.akash.deployment.v1beta4.closeDeployment({
        id: {
          owner: address,
          dseq: dseq,
        },
      });

      console.log(`Database ${id} deleted successfully.`);
      return true;
    } catch (error) {
      console.error("Error deleting database:", error.message);
      return false;
    }
  }

  async deleteAllFailedDatabases() {
    try {
      const init = await this.initChainSdk();
      if (!init) return;

      const { chainSdk, address } = init;

      const deployments = await chainSdk.akash.deployment.v1beta4.getDeployments({
        filters: {
          owner: address,
          state: "closed",
        },
        pagination: { limit: 100 },
      });

      if (!deployments.deployments || deployments.deployments.length === 0) {
        console.log("No failed databases found.");
        return;
      }

      for (const dep of deployments.deployments) {
        const dseq = dep.deployment.id.dseq;
        await this.deleteDatabase(dseq);
      }
    } catch (error) {
      console.error("Error deleting failed databases:", error.message);
    }
  }

  async refundDatabase(id) {
    try {
      const init = await this.initChainSdk();
      if (!init) return false;

      const { chainSdk, address } = init;
      const dseq = Long.fromString(String(id), true);

      const closeResult = await chainSdk.akash.deployment.v1beta4.closeDeployment({
        id: {
          owner: address,
          dseq: dseq,
        },
      });

      console.log("Database closed and refund initiated:", closeResult);
      return true;
    } catch (error) {
      console.error("Error refunding database:", error.message);
      return false;
    }
  }
}

export default DatabaseManager;
