import { Command } from "commander";
import { getToken, deleteToken } from "../../utils/auth.js";

export const logout = new Command("logout")
  .description("Delete access token from system")
  .action(async () => {
    const token = await getToken();

    // Verifica si el token existe y no es una cadena vacía
    if (!token || token.length < 1) {
      console.log("Not currently logged in");
      return;
    }
    await deleteToken();
    console.log("Logout successful. Token deleted.");
  });