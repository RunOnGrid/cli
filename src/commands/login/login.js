import { Command } from "commander";
import inquirer from "inquirer";
import { saveToken } from "../../utils/keyChain.js";
import { logInOAuth, gridLogin } from "../../service/authServer.js";

export const login = new Command("login")
  .description("Log in using email/password or google/github")
  .option("--google", "Log in with Google")
  .option("--github", "Log in with github")
  .action(async (options) => {
    if (options.google) {
      await logInOAuth("google");
      return;
    }if(options.github){
      await logInOAuth("github");
      return;
    }
     else {
      await loginWithUser();
      return;
    }
  });

async function loginWithUser() {
  const answers = await inquirer.prompt([
    {
      name: "email",
      type: "input",
      message: "Email:",
      default() {
        return "Email";
      },
    },
    {
      name: "password",
      type: "password",
      message: "Password:",
      default() {
        return "Password";
      },
    },
  ]);

  const response = await gridLogin(answers.email, answers.password);
  console.log(response);
  
  await saveToken(response);
  console.log("Token saved");
}
