import { getToken } from '../utils/keyChain.js';
import open from 'open';
import ora from 'ora';
import dotenv from "dotenv";
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BACKEND_URL = process.env.BACKEND_URL_DEV || "https://backend.ongrid.run/";

class StripePaymentManager {
  constructor() {
    this.backendUrl = BACKEND_URL;
  }

  async createCheckoutSession() {
    try {
      const jwt = await getToken();

      const response = await fetch(`${this.backendUrl}payment/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currency: "USD" }),
      });

      const data = await response.json();

      if (!data?.url) throw new Error('No checkout URL received');

      await open(data.url);
      await this._checkoutSession(data.url, jwt);

      return;
    } catch (error) {
      console.error('❌ Error in createCheckoutSession:', error.message);
      throw error;
    }
  }

  async _checkoutSession(sessionUrl, jwt) {
    const match = sessionUrl.match(/\/c\/pay\/(cs_(?:test|live)_[a-zA-Z0-9]{58})/);
    const sessionId = match?.[1];

    if (!sessionId) {
      throw new Error("Invalid Stripe session URL");
    }

    return await this._pollSessionStatus(sessionId, jwt);
  }

  async _pollSessionStatus(sessionId, jwt, retries = 30, interval = 3000) {
    const spinner = ora('Checking payment status').start();

    for (let i = 0; i < retries; i++) {
      const status = await this._getSessionStatus(sessionId, jwt);

      spinner.text = `Checking payment status: ${status}`;

      if (status === "complete" || status === "expired") {
        spinner.succeed(`Payment ${status}`);
        return status;
      }

      await this._sleep(interval);
    }

    spinner.warn('Polling timeout. Attempting to close session...');
    const finalStatus = await this._getSessionStatus(sessionId, jwt, "close");
    spinner.fail(`Session closed with status: ${finalStatus}`);
    return finalStatus || "unknown";
  }

  async _getSessionStatus(sessionId, jwt, closeStatus = "") {
    const res = await fetch(`${this.backendUrl}payment/retrieve-checkout-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, status: closeStatus }),
    });

    const data = await res.json();
    return data?.data?.status;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default StripePaymentManager;
