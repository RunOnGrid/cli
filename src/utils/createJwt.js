import { Secp256k1HdWallet } from "@cosmjs/amino";
import { JwtTokenManager } from "@akashnetwork/chain-sdk"
import {saveTarget} from "./keyChain.js"


const jwtTokenGenerator = async (mnemonic) => {
    try {
        const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "akash" })
        const accounts = await wallet.getAccounts();
        const tokenManager = new JwtTokenManager(wallet);

        const token = await tokenManager.generateToken({
            iss: accounts[0].address,
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000),
            version: "v1",
            leases: { access: "full" },
          });
       
        await saveTarget("jwt", token)
        
        return token

    } catch (error) {
        console.error("Error creating Jwt")
    }
} 

export default jwtTokenGenerator