import appMethodService from "../../service/deployments/flux/appMethods";
import { Command } from "commander";

const appMethods = new appMethodService()

export const appCommand = new Command("app")
    .description("Application control & global control")

const startCommand = new Command("start")
    .description("Start instance")
    .action(async () => {
        await appMethods.startApp()
    })

const pauseCommand = new Command("pause")
    .description("Pause instance")
    .action(async () => {
        await appMethods.pauseApp()
    })

const restartCommand = new Command("restart")
    .description("Restart instance")
    .action(async () => {
        await appMethods.restartApp()
    })

const unPauseCommand = new Command("unpause")
    .description("unpause instance")
    .action(async () => {
        await appMethods.unPauseApp()
    })

const gSoftCommand = new Command("gsoft")
    .description("Global soft redeploy")
    .action(async () => {
        await appMethods.gSoftReDeploy()
    })


appCommand.addCommand(startCommand)
appCommand.addCommand(pauseCommand)
appCommand.addCommand(restartCommand)
appCommand.addCommand(unPauseCommand)
appCommand.addCommand(gSoftCommand)