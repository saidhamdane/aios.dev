#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { authCommand } from "./commands/auth.js";
import { initCommand } from "./commands/init.js";
import { runCommand } from "./commands/run.js";
import { projectsCommand } from "./commands/projects.js";

const program = new Command();

program
  .name("aios")
  .description(
    chalk.bold("AIOS") +
      " — Agency OS for Claude Code\n" +
      chalk.dim("  Transform Claude Code into agency infrastructure.")
  )
  .version("0.1.0");

program.addCommand(authCommand);
program.addCommand(initCommand);
program.addCommand(runCommand);
program.addCommand(projectsCommand);

program
  .command("config")
  .description("Show current configuration")
  .action(async () => {
    const { config } = await import("./lib/config.js");
    const cfg = config.getAll();
    console.log(chalk.bold("\n  AIOS Configuration\n"));
    console.log(`  API URL:   ${chalk.cyan(cfg.apiUrl)}`);
    console.log(`  API Key:   ${cfg.apiKey ? chalk.green(cfg.apiKey.slice(0, 12) + "••••") : chalk.red("Not set")}`);
    console.log(`  Model:     ${chalk.cyan(cfg.defaultModel)}`);
    console.log(`  Config:    ${chalk.dim(config.configPath)}\n`);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
});
