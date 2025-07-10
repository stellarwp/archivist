#!/usr/bin/env bun
import { existsSync } from "fs";
import { $ } from "bun";

// Check if CLI is built
if (!existsSync("./dist/cli.js")) {
  console.log("CLI not built, building now...");
  await $`bun run build`.quiet();
}