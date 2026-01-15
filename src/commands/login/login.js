import { Command } from "commander";
import validateAndStoreMnemonic from "../../service/validateMnemonic.js"


export const login = new Command("login")
  .description("Login to your Grid account")
  .argument("<words...>", "Your 12 or 24 word mnemonic phrase")
  .action(async (words) => {
    const mnemonic = words.join(" ");
    await validateAndStoreMnemonic(mnemonic);
    console.log("Mnemonic stored securely in your system keychain.");
  })

