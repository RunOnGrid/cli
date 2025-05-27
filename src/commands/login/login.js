import { Command } from "commander";
// import inquirer from "inquirer";
// import { saveToken } from "../../utils/keyChain.js";
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
