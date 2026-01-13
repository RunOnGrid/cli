import keytar from "keytar";
import { Secp256k1HdWallet } from "@cosmjs/amino";
import { JwtTokenManager } from "@akashnetwork/chain-sdk";

const SERVICE = "cligrid-cli";
const JWT_EXPIRY_BUFFER = 300; // Regenerate if less than 5 minutes left

export async function savePassword(account, password) {
    await keytar.setPassword(SERVICE, account, password);
}

export async function getPassword(account) {
    return await keytar.getPassword(SERVICE, account);
}

export async function deletePassword(account) {
    return await keytar.deletePassword(SERVICE, account);
}

export async function saveTarget(target, token) {
    await savePassword(target, token);
}

export async function getTarget(target) {
    // For JWT, auto-generate if missing or expired
    if (target === "jwt") {
        return await getOrGenerateJwt();
    }
    return await getPassword(target);
}

export async function deleteTarget(target) {
    return await deletePassword(target);
}

/**
 * Check if JWT is valid (exists and not expired)
 */
function isJwtValid(token) {
    if (!token) return false;

    try {
        // Decode JWT payload (base64)
        const parts = token.split(".");
        if (parts.length !== 3) return false;

        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        const now = Math.floor(Date.now() / 1000);

        // Check if expired (with buffer)
        return payload.exp && payload.exp > now + JWT_EXPIRY_BUFFER;
    } catch {
        return false;
    }
}

/**
 * Get existing JWT or generate a new one if expired/missing
 */
async function getOrGenerateJwt() {
    const existingJwt = await getPassword("jwt");

    if (isJwtValid(existingJwt)) {
        return existingJwt;
    }

    // JWT is missing or expired, generate new one
    const mnemonic = await getPassword("mnemonic");
    if (!mnemonic) {
        return null; // No mnemonic, can't generate JWT
    }

    try {
        const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "akash" });
        const accounts = await wallet.getAccounts();
        const tokenManager = new JwtTokenManager(wallet);

        const token = await tokenManager.generateToken({
            iss: accounts[0].address,
            exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
            iat: Math.floor(Date.now() / 1000),
            version: "v1",
            leases: { access: "full" },
        });

        await savePassword("jwt", token);
        return token;
    } catch (error) {
        console.error("Error auto-generating JWT:", error.message);
        return null;
    }
}
