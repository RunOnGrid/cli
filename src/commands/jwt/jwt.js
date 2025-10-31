import { Command } from "commander";
import jwtTokenGenerator from "../../utils/createJwt.js"
import { getTarget } from "../../utils/keyChain.js"


export const jwt = new Command("jwt")
  .description("Create Jwt for Provider secure communication")
  .action(async () => {
    const mnemonic = await getTarget("mnemonic");
    if (!mnemonic) {
      console.error("Error: No mnemonic found. Please login first using 'grid login [mnemonic]'");
      process.exit(1);
    }
    const jwt = await jwtTokenGenerator(mnemonic);
    if (jwt) {
      console.log(jwt);
      console.log("Jwt stored securely in your system keychain.")
    }
  })

