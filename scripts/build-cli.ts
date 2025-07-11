#!/usr/bin/env bun
import { build } from "bun";
import { existsSync, mkdirSync } from "fs";

// Ensure dist directory exists
if (!existsSync("./dist")) {
  mkdirSync("./dist", { recursive: true });
}

console.log("Building CLI...");

const result = await build({
  entrypoints: ["./src/cli.ts"],
  outdir: "./dist",
  target: "bun",
  format: "esm",
  minify: false,
  splitting: false,
  sourcemap: "none",
  // Bundle everything including dependencies
  external: [],
  define: {
    // Ensure decorators work properly
    "global.Reflect": "Reflect",
  },
});

if (!result.success) {
  console.error("Build failed!");
  process.exit(1);
}

// Add shebang to the output file
const fs = await import("fs");
const cliPath = "./dist/cli.js";
const content = await fs.promises.readFile(cliPath, "utf-8");

// Check if shebang already exists
const withShebang = content.startsWith("#!/usr/bin/env bun") 
  ? content 
  : `#!/usr/bin/env bun\n${content}`;
  
await fs.promises.writeFile(cliPath, withShebang);
await fs.promises.chmod(cliPath, 0o755);

console.log("✅ CLI built successfully to dist/cli.js");