import { Command } from "commander";
import inquirer from "inquirer";
import { saveToken } from "../../utils/keyChain.js";
import { logInOAuth, gridLogin } from "../../service/authServer.js";

export const login = new Command("login")
  .description("Log in using email/password or google/github")



const googlelog = new Command("google")
.description("Access Grid via google authentication")
.action(async ()=>{
    await logInOAuth("google");
    return;
})
const githublog = new Command("github")
.description("Access Grid via github authentication")
.action(async ()=>{
    await logInOAuth("github");
    return;
})

login.addCommand(googlelog);
login.addCommand(githublog);


// async function loginWithUser() {
//   const answers = await inquirer.prompt([
//     {
//       name: "email",
//       type: "input",
//       message: "Email:",
//       default() {
//         return "Email";
//       },
//     },
//     {
//       name: "password",
//       type: "password",
//       message: "Password:",
//       default() {
//         return "Password";
//       },
//     },
//   ]);

//   const response = await gridLogin(answers.email, answers.password);
//   console.log(response);
  
//   await saveToken(response);
//   console.log("Token saved");
// }
