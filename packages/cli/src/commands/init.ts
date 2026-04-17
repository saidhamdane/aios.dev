import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { prompt } from "enquirer";
import { api } from "../lib/api.js";
import { writeProjectConfig, config } from "../lib/config.js";

export const initCommand = new Command("init")
  .description("Initialize AIOS in the current directory")
  .option("--project-id <id>", "Use an existing project ID")
  .action(async (options) => {
    console.log(chalk.bold("\n🚀 AIOS Init\n"));

    const spinner = ora("Fetching your projects…").start();
    let projects: { id: string; name: string }[] = [];

    try {
      const res = await api.projects.list();
      projects = res.projects as { id: string; name: string }[];
      spinner.stop();
    } catch (err) {
      spinner.fail(chalk.red(String(err)));
      process.exit(1);
    }

    let projectId: string;

    if (options.projectId) {
      projectId = options.projectId;
    } else if (projects.length === 0) {
      // Create new project
      console.log(chalk.yellow("No projects found. Let's create one.\n"));
      const { name } = await prompt<{ name: string }>({
        type: "input",
        name: "name",
        message: "Project name:",
      });
      const { description } = await prompt<{ description: string }>({
        type: "input",
        name: "description",
        message: "Description (optional):",
      });

      const creating = ora("Creating project…").start();
      try {
        const res = await api.projects.create({
          name,
          description: description || undefined,
        });
        projectId = (res.project as { id: string }).id;
        creating.succeed(`Project created: ${chalk.cyan(name)}`);
      } catch (err) {
        creating.fail(String(err));
        process.exit(1);
      }
    } else {
      const choices = projects.map((p) => ({ name: p.name, value: p.id }));
      const { choice } = await prompt<{ choice: string }>({
        type: "select",
        name: "choice",
        message: "Select a project:",
        choices,
      } as Parameters<typeof prompt>[0]);
      projectId = choice;
    }

    // Optionally select an agent
    const agentSpinner = ora("Fetching agents…").start();
    let agentId: string | undefined;

    try {
      const res = await api.agents.list(projectId);
      const agents = res.agents as { id: string; name: string }[];
      agentSpinner.stop();

      if (agents.length > 0) {
        const { useAgent } = await prompt<{ useAgent: boolean }>({
          type: "confirm",
          name: "useAgent",
          message: "Attach a default agent?",
          initial: true,
        });

        if (useAgent) {
          const agentChoices = agents.map((a) => ({ name: a.name, value: a.id }));
          const { choice } = await prompt<{ choice: string }>({
            type: "select",
            name: "choice",
            message: "Select an agent:",
            choices: agentChoices,
          } as Parameters<typeof prompt>[0]);
          agentId = choice;
        }
      } else {
        agentSpinner.stop();
      }
    } catch {
      agentSpinner.stop();
    }

    writeProjectConfig({ projectId, agentId });
    console.log(chalk.green("\n✓ .aios.json created"));
    console.log(chalk.dim(`  Project: ${projectId}`));
    if (agentId) console.log(chalk.dim(`  Agent:   ${agentId}`));
    console.log(chalk.dim("\n  Run `aios run` to start a session.\n"));
  });
