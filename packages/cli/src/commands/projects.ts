import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { api } from "../lib/api.js";

export const projectsCommand = new Command("projects")
  .description("Manage projects");

projectsCommand
  .command("list")
  .alias("ls")
  .description("List all projects")
  .action(async () => {
    const spinner = ora("Fetching projects…").start();
    try {
      const res = await api.projects.list();
      const projects = res.projects as Array<{
        id: string;
        name: string;
        status: string;
        description?: string;
        created_at: string;
      }>;
      spinner.stop();

      if (projects.length === 0) {
        console.log(chalk.yellow("No projects yet. Run `aios projects create`."));
        return;
      }

      console.log(chalk.bold(`\n  Projects (${projects.length})\n`));
      projects.forEach((p) => {
        const status =
          p.status === "active"
            ? chalk.green("●")
            : p.status === "paused"
            ? chalk.yellow("●")
            : chalk.gray("●");
        console.log(`  ${status} ${chalk.bold(p.name.padEnd(30))} ${chalk.dim(p.id)}`);
        if (p.description) {
          console.log(`     ${chalk.dim(p.description)}`);
        }
      });
      console.log();
    } catch (err) {
      spinner.fail(chalk.red(String(err)));
      process.exit(1);
    }
  });

projectsCommand
  .command("create")
  .description("Create a new project")
  .requiredOption("--name <name>", "Project name")
  .option("--description <desc>", "Project description")
  .action(async (options) => {
    const spinner = ora("Creating project…").start();
    try {
      const res = await api.projects.create({
        name: options.name,
        description: options.description,
      });
      const project = res.project as { id: string; name: string };
      spinner.succeed(
        `Project created: ${chalk.cyan(project.name)} ${chalk.dim(project.id)}`
      );
    } catch (err) {
      spinner.fail(chalk.red(String(err)));
      process.exit(1);
    }
  });
