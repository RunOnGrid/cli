import { getToken } from "../../utils/keyChain.js";
import path from "path";
import dotenv from "dotenv";
import chalk from "chalk";

dotenv.config({ path: path.resolve(process.cwd(), '.env') });


class DeploymentManager {
  constructor() {
    this.backendUrl = process.env.BACKEND_URL_DEV || "https://backend.ongrid.run/";
    this.jwt = getToken()
  }

  async getDeployments() {
    try {
      const jwt = await getToken();
      const response = await fetch(`${this.backendUrl}deployments`, {
        method: "GET",
        headers: {
          "Accept": "*/*",
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Error fetching deployments');
      }
      const data = response.json();
      return data
    } catch (error) {
      console.error("❌ Error fetching deployments. If the error persists, contact support@ongrid.run");
      process.exit(1);
    }
  }

  async getDeploymentById(id) {
    try {
      const jwt = await getToken();
      const response = await fetch(`${this.backendUrl}deployments/${id}`, {
        method: "GET",
        headers: {
          "Accept": "*/*",
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error fetching deployment');
      }

      return await response.json();
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
