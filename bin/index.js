#!/usr/bin/env node

// import chalk from "chalk";
// import gradient from "gradient-string";
// import chalkAnimation from "chalk-animation";
// import figlet from "figlet";
// import { createSpinner } from "nanospinner";

// import { getToken, saveToken } from "../utils/auth.js";
// import {deployments, deploymentsById} from "../commands/deployments.js";
// import {DeployFlux} from "../commands/deploy.js"


import "../src/cli.js";

// async function question() {
//   const answers = await inquirer.prompt({
//     name: "question 1",
//     type: "list",
//     message: "Choose an option\n",
//     choices: [
//       "Register",
//       "Log In",
//       "Get Jwt Token",
//       "Deploy",
//       "Get deployments",
//       "Get deployment by ID"
//     ]
//   });
//   switch (answers["question 1"]) {
//     case "Register":
//       // console.log(Registrar);
//       // // Llamar a la función de login
//       break;

//     case "Log In":
//       await user();
//       break;
    
//     case "Deploy":
//       await DeployFlux();
//       break;

//     case "Get Jwt Token":
//       const response = await getToken();
//       console.log(response);

//       break;

//     case "Get deployments":
//       await deployments()
//       break;

//     case "Get deployment by ID":
//       await askId()
//       break;
//   }
// }

// 

// async function askId(){
//     const answer =  await inquirer.prompt({
//       name:"id", type:"input", message:"Deployment Id"
//     })
//     await deploymentsById(answer.id)
// }


// async function getOrRequestToken() {
//   let token = await getToken();

//   if (!token) {
//       console.log("⚠️ No se encontró un token guardado.");
//       const { manualToken } = await inquirer.prompt([
//           { name: "manualToken", type: "input", message: "Ingresa tu token manualmente:" }
//       ]);
//       token = manualToken;
//   }

//   return token;
// }



// await question();