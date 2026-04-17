import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { config } from "../lib/config.js";

export const authCommand = new Command("auth")
  .description("Manage authentication");

authCommand
  .command("login")
  .description("Authenticate with your AIOS API key")
  .option("--key <key>", "API key (or set AIOS_API_KEY env var)")
  .action(async (options) => {
    const rawKey = options.key ?? process.env.AIOS_API_KEY;

    if (!rawKey) {
      const { default: chalk } = await import("chalk");
      console.log(chalk.yellow("Get your API key at: https://aios.dev/en/settings"));
      const { prompt } = await import("enquirer");
      const { key } = await prompt<{ key: string }>({
        type: "password",
        name: "key",
        message: "Paste your AIOS API key:",
      });

      if (!key?.startsWith("aios_")) {
        console.error(chalk.red("Invalid API key format. Keys start with aios_"));
        process.exit(1);
      }
      config.set("apiKey", key);
    } else {
      if (!rawKey.startsWith("aios_")) {
        console.error(chalk.red("Invalid API key format. Keys start with aios_"));
        process.exit(1);
      }
      config.set("apiKey", rawKey);
    }

    const spinner = ora("Verifying API key…").start();
    try {
      const { api } = await import("../lib/api.js");
      await api.projects.list();
      spinner.succeed(chalk.green("Authenticated successfully!"));
    } catch {
      spinner.fail(chalk.red("Invalid API key."));
      config.set("apiKey", null);
      process.exit(1);
    }
  });

authCommand
  .command("logout")
  .description("Remove stored credentials")
  .action(() => {
    config.set("apiKey", null);
    console.log(chalk.green("Logged out."));
  });

authCommand
  .command("status")
  .description("Show current auth status")
  .action(() => {
    const key = config.get("apiKey");
    if (!key) {
      console.log(chalk.yellow("Not authenticated. Run `aios auth login`"));
    } else {
      console.log(chalk.green(`Authenticated (key: ${key.slice(0, 12)}••••)`));
    }
  });
