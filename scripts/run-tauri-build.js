#!/usr/bin/env node

"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const tauriDir = path.join(projectRoot, "src-tauri");
const args = process.argv.slice(2);
const isLinux = process.platform === "linux";
const forceBuild = ["1", "true", "yes"].includes(
  String(process.env.FORCE_TAURI_BUILD || "").toLowerCase()
);

const requiredLinuxPackages = [
  { pkg: "glib-2.0", hint: "libglib2.0-dev" },
  { pkg: "gobject-2.0", hint: "libgobject-2.0-dev" },
  { pkg: "gio-2.0", hint: "libglib2.0-dev" },
  { pkg: "gtk+-3.0", hint: "libgtk-3-dev" },
  { pkg: "webkit2gtk-4.0", hint: "libwebkit2gtk-4.0-dev" }
];

function runCommand(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: projectRoot,
    stdio: "inherit",
    env: { ...process.env, ...options.env }
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 0;
}

function runCargoFallback() {
  const fallbackArgs = process.env.TAURI_FALLBACK_CARGO_ARGS
    ? process.env.TAURI_FALLBACK_CARGO_ARGS.split(" ").filter(Boolean)
    : ["build", "--locked"];

  console.warn("⚠️  Falling back to headless Rust build because required Linux GUI dependencies were not found.");
  const status = spawnSync("cargo", fallbackArgs, {
    cwd: tauriDir,
    stdio: "inherit",
    env: process.env
  }).status;

  if (status !== 0) {
    console.error("❌ Fallback headless build failed.");
    process.exit(status || 1);
  }

  console.log("✅ Fallback headless build completed successfully.");
  process.exit(0);
}

function pkgConfigExists(pkg) {
  const result = spawnSync("pkg-config", ["--exists", pkg], {
    cwd: projectRoot,
    stdio: "ignore"
  });

  return result.status === 0;
}

function hasPkgConfig() {
  const result = spawnSync("pkg-config", ["--version"], {
    cwd: projectRoot,
    stdio: "ignore"
  });

  return result.status === 0;
}

function gatherMissingLinuxPackages() {
  if (!hasPkgConfig()) {
    return [
      { pkg: "pkg-config", hint: "pkg-config" },
      ...requiredLinuxPackages
    ];
  }

  return requiredLinuxPackages.filter((entry) => !pkgConfigExists(entry.pkg));
}

if (isLinux) {
  const missingPackages = gatherMissingLinuxPackages();

  if (missingPackages.length > 0) {
    const missingNames = missingPackages.map((entry) => entry.pkg).join(", ");
    const installHints = Array.from(
      new Set(missingPackages.flatMap((entry) => entry.hint.split(/\s+/)))
    ).join(" ");

    console.warn("⚠️  Required Linux system libraries for the Tauri WebView were not detected.");
    console.warn(`   Missing packages: ${missingNames}`);
    if (installHints.length > 0) {
      console.warn(`   Install them with: sudo apt-get install ${installHints}`);
    }
    console.warn(
      "   Set FORCE_TAURI_BUILD=1 to bypass this check once the dependencies are installed."
    );

    if (!forceBuild) {
      runCargoFallback();
    } else {
      console.warn("⚠️  FORCE_TAURI_BUILD set. Attempting full Tauri build despite missing dependencies.");
    }
  }
}

// Fix for npx not found in CI environment
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const status = runCommand(npmCmd, ["run", "tauri", "build", ...args]);
process.exit(status);
