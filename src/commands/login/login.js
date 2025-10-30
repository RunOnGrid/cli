import { Command } from "commander";
// import inquirer from "inquirer";
import validateAndStoreMnemonic from "../../service/validateMnemonic.js"


export const login = new Command("login")
  .description("Login to your Grid account")
  .argument("<mnemonic>")
  .action(async (mnemonic) => {
    await validateAndStoreMnemonic(mnemonic)
    console.log("Mnemonic stored securely in your system keychain.")
  })

