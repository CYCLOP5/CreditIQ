import { execSync } from "child_process";

console.log("Installing cytoscape...");
execSync("pnpm add cytoscape@3.30.4", {
  cwd: "/vercel/share/v0-project",
  stdio: "inherit",
});
execSync("pnpm add -D @types/cytoscape@3.21.9", {
  cwd: "/vercel/share/v0-project",
  stdio: "inherit",
});
console.log("Done.");
