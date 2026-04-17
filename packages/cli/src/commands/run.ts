import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { spawn } from "child_process";
import { api } from "../lib/api.js";
import { getProjectConfig, config } from "../lib/config.js";

export const runCommand = new Command("run")
  .description("Start a Claude Code session tracked by AIOS")
  .argument("[prompt]", "Prompt to run (non-interactive mode)")
  .option("--project <id>", "Override project ID")
  .option("--agent <id>", "Override agent ID")
  .option("--model <model>", "Override model")
  .option("--print", "Run claude with --print flag (non-interactive)")
  .action(async (promptArg: string | undefined, options) => {
    const projectConfig = getProjectConfig();
    const projectId = options.project ?? projectConfig?.projectId;
    const agentId = options.agent ?? projectConfig?.agentId;

    if (!projectId) {
      console.error(chalk.red("No project configured. Run `aios init` first."));
      process.exit(1);
    }

    // If a prompt is provided, run it via the AIOS API directly
    if (promptArg) {
      const spinner = ora("Running agent…").start();
      try {
        const res = await api.sessions.run({
          project_id: projectId,
          agent_id: agentId,
          messages: [{ role: "user", content: promptArg }],
          model: options.model ?? config.get("defaultModel"),
        });

        spinner.stop();

        const content = res.content as Array<{ type: string; text?: string }>;
        const text = content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("\n");

        console.log(chalk.dim("─".repeat(60)));
        console.log(text);
        console.log(chalk.dim("─".repeat(60)));

        const usage = res.usage as { input_tokens: number; output_tokens: number; cost_usd: number };
        console.log(
          chalk.dim(
            `\nTokens: ${usage.input_tokens + usage.output_tokens} · Cost: $${usage.cost_usd.toFixed(6)}`
          )
        );
      } catch (err) {
        spinner.fail(chalk.red(String(err)));
        process.exit(1);
      }
      return;
    }

    // Interactive mode — wrap the `claude` CLI
    const claudeArgs = ["--dangerously-skip-permissions"];
    if (options.print) claudeArgs.push("--print");

    console.log(chalk.dim(`\n📡 AIOS session • project: ${projectId.slice(0, 8)}…\n`));

    const child = spawn("claude", claudeArgs, {
      stdio: "inherit",
      env: { ...process.env },
    });

    child.on("exit", (code) => {
      if (code === 0) {
        console.log(chalk.dim("\n✓ Session ended. Synced to AIOS."));
      }
      process.exit(code ?? 0);
    });

    child.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        console.error(
          chalk.red(
            "claude CLI not found. Install it: npm i -g @anthropic-ai/claude-code"
          )
        );
      } else {
        console.error(chalk.red(`Error: ${err.message}`));
      }
      process.exit(1);
    });
  });
