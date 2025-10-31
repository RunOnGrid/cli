import * as bip39 from 'bip39';
import { saveTarget } from "../utils/keyChain.js";

const validateAndStoreMnemonic = async (mnemonic) => {
    try {
        const validate = bip39.validateMnemonic(mnemonic)
        if (!validate) {
            process.exit(0)
        }
        await saveTarget("mnemonic", mnemonic)
        return "✅ Wallet stored successfully!";
    } catch (error) {
        console.error("Error validating recovery phrase")
    }
}

export default validateAndStoreMnemonic;