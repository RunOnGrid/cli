// En stripePayment.js

import { getToken } from '../utils/keyChain.js';
import open from 'open';
import ora from 'ora';
import dotenv from "dotenv";
import path from 'path';


dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BACKEND_URL = process.env.BACKEND_URL_DEV || "https://backend.ongrid.run/"

export const stripePayment = async () => {
  try {
    const JWT_TOKEN = await getToken();
    const response = await fetch(`${BACKEND_URL}payment/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currency: "USD"
      }),
    });

    const data = await response.json();
    await open(data.url);
    await checkoutSession(data.url, JWT_TOKEN);
    return;
    
  } catch (error) {
    console.error('Error:', error);
  }
};

const checkoutSession = async (sessionUrl, jwt) => {
  const match = sessionUrl.match(/\/c\/pay\/(cs_(?:test|live)_[a-zA-Z0-9]{58})/);
  const sessionId = match?.[1];

  if (!sessionId) {
    throw new Error("Invalid Stripe session URL");
  }

  const poll = async (retries = 30, interval = 3000) => {
    const spinner = ora('Checking payment status').start();

    for (let i = 0; i < retries; i++) {
      const res = await fetch(`${BACKEND_URL}payment/retrieve-checkout-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, status: "" }), // status vacío por default
      });

      const data = await res.json();
      const status = data?.data?.status;

      spinner.text = `Checking payment status: ${status}`;

      if (status === "complete" || status === "expired") {
        spinner.succeed(`Payment ${status}`);
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    // Si agotó los intentos, intentamos cerrarlo manualmente
    spinner.warn('Polling timeout. Attempting to close session...');

    const finalRes = await fetch(`${BACKEND_URL}payment/retrieve-checkout-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, status: "close" }), // ahora sí se intenta cerrar
    });

    const finalData = await finalRes.json();
    const finalStatus = finalData?.data?.status;

    spinner.fail(`Session closed with status: ${finalStatus}`);
    return finalStatus || "unknown";
  };

  return await poll();
};




