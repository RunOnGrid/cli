import path from "path";
import fs from "fs/promises";
import yaml from "js-yaml";
import { getSuitableNodeIps } from "../service/deployments/flux/fluxNodeService.js";

class ConfigFileManager {
  constructor() {}

  async readConfigFile(filePath, provider) {
    try {
      const normalizedPath = filePath.replace(/\\/g, '/');

      if (!path.isAbsolute(normalizedPath)) {
        console.error('❌ Only absolute paths are allowed. Please provide the full path to your config file.');
        process.exit(1);
      }

      await fs.access(normalizedPath);
      const fileContent = await fs.readFile(normalizedPath, 'utf8');

      if (provider === "FLUX") {
        return await this.#processFluxConfig(fileContent);
      }

      if (provider === "AKASH") {
        return this.#processAkashConfig(fileContent);
      }

      console.error(`❌ Unsupported provider: ${provider}. Supported providers are "FLUX" and "AKASH".`);
      process.exit(1);

    } catch (error) {
      console.error('❌ Error accessing config file');
      process.exit(1);
    }
  }

  async #processFluxConfig(fileContent) {
    let parsed;
    try {
      parsed = JSON.parse(fileContent);
    } catch {
      console.error("❌ Invalid config format: Expected JSON for FLUX but received invalid format or YAML.");
      process.exit(1);
    }

    if (parsed.repoAuth && parsed.repoAuth.trim() !== "" && parsed.tierd === true) {
      return await this.#enhancedComposeFlux(fileContent);
    }

    return parsed;
  }

  #processAkashConfig(fileContent) {
    try {
      return yaml.load(fileContent);
    } catch {
      console.error("❌ Invalid config format: Expected YAML for AKASH but received invalid or malformed content.");
      process.exit(1);
    }
  }

  async #enhancedComposeFlux(fileContent) {
    try {
      const selectedNodes = await getSuitableNodeIps();
      const config = this.#parseJSON(fileContent);

      config.nodes = selectedNodes;

      return config;
    } catch (error) {
      console.error(`❌ Error reading config file: ${error.message}`);
      process.exit(1);
    }
  }

  #parseJSON(fileContent) {
    try {
      return JSON.parse(fileContent);
    } catch (error) {
      console.error(`❌ Invalid JSON format: ${error.message}`);
      process.exit(1);
    }
  }
}

export default ConfigFileManager;
