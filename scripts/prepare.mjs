import { spawnSync } from "node:child_process";

// Best-effort: sets up the commit-msg hook for local contributor checkouts.
// Failing here (e.g. no .git directory, such as inside a package tarball)
// must never block the build below - npm's own git-dependency install flow
// depends on this script's exit code reflecting only the build.
spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  stdio: "inherit",
  shell: true,
});

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const build = spawnSync(npmCommand, ["run", "build:library"], {
  stdio: "inherit",
  shell: true,
});
if (build.error) throw build.error;
process.exit(build.status ?? 1);
