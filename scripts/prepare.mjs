import { spawnSync } from "node:child_process";

// Best-effort: sets up the commit-msg hook for local contributor checkouts.
// Failing here (e.g. no .git directory, such as inside a package tarball)
// must never block the build below - npm's own git-dependency install flow
// depends on this script's exit code reflecting only the build. Captured
// (not inherited) for the same reason as the build step below.
spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  stdio: "pipe",
  shell: true,
});

// Captured rather than inherited: some npm versions still run `prepare`
// during `npm pack --ignore-scripts` (that flag reliably skips it in newer
// npm, but not consistently across versions - confirmed by CI using an
// older bundled npm than this repo's pinned packageManager). When that
// happens, anything this script prints to stdout gets interleaved into
// `npm pack --json`'s own stdout and breaks JSON.parse for whoever's
// consuming it (scripts/test-package.mjs). Only surface output - on
// stderr, never stdout - if the build actually fails.
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const build = spawnSync(npmCommand, ["run", "build:library"], {
  stdio: "pipe",
  shell: true,
  encoding: "utf8",
});
if (build.error) throw build.error;
if (build.status !== 0) {
  process.stderr.write(build.stdout ?? "");
  process.stderr.write(build.stderr ?? "");
}
process.exit(build.status ?? 1);
