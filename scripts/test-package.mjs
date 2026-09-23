import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const projectRoot = resolve(import.meta.dirname, "..");
const consumerRoot = await mkdtemp(join(tmpdir(), "compas-threejs-consumer-"));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const cleanEnvironment = {
  ...process.env,
  npm_config_cache: join(consumerRoot, ".npm-cache"),
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: consumerRoot,
    encoding: "utf8",
    stdio: "pipe",
    env: cleanEnvironment,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(" ")}`,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  return result.stdout;
}

try {
  const packed = JSON.parse(
    run(
      npmCommand,
      [
        "pack",
        projectRoot,
        "--json",
        "--ignore-scripts",
        "--pack-destination",
        consumerRoot,
      ],
      { cwd: projectRoot },
    ),
  );
  const archive = join(consumerRoot, packed[0].filename);

  await writeFile(
    join(consumerRoot, "package.json"),
    JSON.stringify({
      name: "package-smoke-test",
      private: true,
      type: "module",
    }),
  );
  run(npmCommand, ["install", "--ignore-scripts", archive]);

  const packageName = "@compas-dev/compas-threejs-ts";
  const installed = JSON.parse(
    await readFile(
      join(
        consumerRoot,
        "node_modules",
        "@compas-dev",
        "compas-threejs-ts",
        "package.json",
      ),
      "utf8",
    ),
  );
  assert.equal(installed.name, packageName);
  assert.equal(installed.private, undefined);

  const installedRoot = join(
    consumerRoot,
    "node_modules",
    "@compas-dev",
    "compas-threejs-ts",
  );
  const library = await import(
    pathToFileURL(join(installedRoot, "dist-lib", "index.js")).href
  );
  assert.equal(typeof library.createViewer, "function");
  assert.equal(typeof library.CompasViewerError, "function");
  assert.ok(
    (await readFile(join(installedRoot, "dist-lib", "style.css"))).length > 0,
  );

  await writeFile(
    join(consumerRoot, "consumer.ts"),
    `import { createViewer, CompasViewerError, type CompasViewerOptions, type ViewerPlugin } from "${packageName}";\n` +
      `const plugin: ViewerPlugin = {\n` +
      `  id: "consumer",\n` +
      `  install(context) {\n` +
      `    const session = context.beginInteraction({ onKeyDown: (event) => void event.key });\n` +
      `    void context.pointerOnPlane({ clientX: 0, clientY: 0 }, 0)?.z;\n` +
      `    void context.objectBounds()[0]?.guid;\n` +
      `    const stop = context.onSelectionChange((guid) => {\n` +
      `      if (guid) void context.getMaterial(guid)?.color;\n` +
      `    });\n` +
      `    context.send({ dispatch: "create_geometry", type: "point", point: [0, 0, 0] });\n` +
      `    return () => { stop(); session.release(); };\n` +
      `  },\n` +
      `};\n` +
      `const options: CompasViewerOptions = { mode: "embedded", plugins: [plugin] };\n` +
      `void createViewer; void CompasViewerError; void options;\n`,
  );
  await writeFile(
    join(consumerRoot, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        target: "ES2022",
        lib: ["ES2022", "DOM"],
        strict: true,
        noEmit: true,
        skipLibCheck: true,
      },
      files: ["consumer.ts"],
    }),
  );
  run(process.execPath, [
    resolve(projectRoot, "node_modules/typescript/bin/tsc"),
    "--project",
    join(consumerRoot, "tsconfig.json"),
  ]);

  console.log(
    `Verified ${installed.name}@${installed.version} from ${basename(archive)}`,
  );
} finally {
  await rm(consumerRoot, { recursive: true, force: true });
}
