import { spawn } from "node:child_process";
import { open, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import chokidar from "chokidar";

const root = path.resolve(import.meta.dirname, "..");
const vault = path.resolve(process.env.OBSIDIAN_VAULT ?? "/Users/ayumad/Documents/Main");
const lockPath = path.join(root, ".sync.lock");
const watchMode = process.argv.includes("--watch");
const shouldPush = process.env.SYNC_PUSH !== "0";
let running = false;
let queued = false;
let timer: NodeJS.Timeout | undefined;

function run(command: string, args: string[], allowFailure = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += String(chunk); process.stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { output += String(chunk); process.stderr.write(chunk); });
    child.on("close", (code) => {
      if (code === 0 || allowFailure) resolve(output.trim());
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function synchronize() {
  if (running) {
    queued = true;
    return;
  }
  running = true;
  try {
    const lock = await open(lockPath, "wx");
    await lock.writeFile(`${process.pid}\n`);
    await lock.close();
  } catch {
    console.log("Another vault synchronization is already running; this pass was skipped.");
    running = false;
    return;
  }

  try {
    console.log(`[${new Date().toISOString()}] Synchronizing vault…`);
    await run("npm", ["run", "content"]);
    await run("npm", ["run", "check"]);
    await run("npm", ["test"]);
    await run("npm", ["run", "build"]);
    const changes = await run("git", ["status", "--porcelain"]);
    if (!changes) {
      console.log("No public-site changes detected.");
      return;
    }
    await run("git", ["add", "src/generated/manifest.json", "public/search.json", "public/robots.txt", "export-report.json"]);
    const staged = await run("git", ["diff", "--cached", "--quiet"], true);
    const hasStagedChanges = (await run("git", ["diff", "--cached", "--name-only"])).length > 0;
    if (!hasStagedChanges) {
      console.log("Only non-generated workspace changes were present; nothing was published.");
      return;
    }
    await run("git", ["commit", "-m", "chore: synchronize public knowledge base"]);
    if (shouldPush) await run("git", ["push", "origin", "HEAD:main"]);
    console.log(shouldPush ? "Published vault changes to GitHub." : "Created a local synchronization commit.");
    void staged;
  } catch (error) {
    console.error(`Synchronization failed; the current production site was left unchanged.\n${String(error)}`);
    process.exitCode = 1;
  } finally {
    await rm(lockPath, { force: true });
    running = false;
    if (queued) {
      queued = false;
      await synchronize();
    }
  }
}

if (watchMode) {
  console.log(`Watching ${vault} for publishable knowledge changes.`);
  const watcher = chokidar.watch(vault, {
    ignored: /(^|[/\\])\../,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 1800, pollInterval: 150 },
  });
  watcher.on("all", (_event, changedPath) => {
    if (!/\.(md|png|jpe?g|gif|webp|pdf)$/i.test(changedPath)) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void synchronize(), 5000);
  });
  await synchronize();
} else {
  await synchronize();
}
