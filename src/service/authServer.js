import open from 'open';
import dotenv from "dotenv"
import http from "http";
import { URL, fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { saveToken, savePassword } from "../utils/keyChain.js";
import { createSpinner } from "nanospinner";
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// URL de autenticación con Google
const BASE_URL = process.env.DEV_URL || "http://backend-dev.ongrid.run/oauth/cli"


export const logInOAuth = async (provider) => {
  const state = uuidv4();
  const server = http.createServer();


  const port = await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve(server.address().port);
    });
  });

  const url = new URL(`${BASE_URL}/${provider}`);
  url.searchParams.set("state", state);
  url.searchParams.set("next", `http://localhost:${port}`);

  console.log(`Opening browser for ${provider} authentication...`);
  await open(url.href);
  const spinner = createSpinner(`Waiting for ${provider} authentication to be completed`).start();

  return new Promise((resolve, reject) => {
    server.once("request", async (req, res) => {
      res.setHeader("connection", "close");
      const query = new URL(req.url, `http://localhost:${port}`).searchParams;
      const token = query.get("token");
      const userId = query.get("userId");
      const receivedState = query.get("state");

      if (receivedState !== state) {
        res.writeHead(400);
        res.end("Invalid state");
        reject(new Error("State mismatch"));
      } else if (token && userId) {
        res.writeHead(200);
        await saveToken(token);
        await savePassword("userId", userId);
        res.end("Authentication successful! You can close this window.");
        spinner.success({ text: "Authentication succesful" });
        resolve({ token, userId });
      } else {
        res.writeHead(400);
        res.end("Authentication failed");
        spinner.error({ text: `Authetication failed, try again if the problem persist contact support@ongrid.run` })
        reject(new Error("No token received"));
      }
      server.close();
    });

    server.once("error", (err) => {
      server.close();
      reject(new Error(`Server error: ${err.message}`));
    });
  });
};



export const gridLogin = async (email, password) => {
  try {
    const response = await fetch("http://localhost:8087/auth/login", {
      method: "POST",
      headers: {
        "Accept": "*/*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });
    const data = await response.json();
    console.log("Response:", data);
    return data.token
  } catch (error) {
    console.error("Error:", error);
  }
}