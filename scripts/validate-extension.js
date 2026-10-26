const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "manifest.json");

function fail(message) {
  console.error(`Extension validation failed: ${message}`);
  process.exitCode = 1;
}

function checkFile(relativePath, context) {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    fail(`${context} must be a non-empty path.`);
    return;
  }

  const resolvedPath = path.resolve(root, relativePath);
  if (!resolvedPath.startsWith(`${root}${path.sep}`) || !fs.existsSync(resolvedPath)) {
    fail(`${context} references a missing or invalid file: ${relativePath}`);
  }
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (error) {
  fail(`manifest.json is not valid JSON: ${error.message}`);
  process.exit(1);
}

if (manifest.manifest_version !== 3) {
  fail("manifest_version must be 3.");
}

if (!manifest.name || !manifest.version) {
  fail("name and version are required.");
}

for (const [index, contentScript] of (manifest.content_scripts || []).entries()) {
  for (const file of contentScript.js || []) {
    checkFile(file, `content_scripts[${index}].js`);
  }
  for (const file of contentScript.css || []) {
    checkFile(file, `content_scripts[${index}].css`);
  }
}

for (const [size, iconPath] of Object.entries(manifest.icons || {})) {
  checkFile(iconPath, `icons[${size}]`);
}

for (const [size, iconPath] of Object.entries(manifest.action?.default_icon || {})) {
  checkFile(iconPath, `action.default_icon[${size}]`);
}

if (manifest.action?.default_popup) {
  checkFile(manifest.action.default_popup, "action.default_popup");
}

for (const [index, resourceGroup] of (manifest.web_accessible_resources || []).entries()) {
  for (const resource of resourceGroup.resources || []) {
    checkFile(resource, `web_accessible_resources[${index}].resources`);
  }
}

if (process.exitCode !== 1) {
  console.log(`Validated ${manifest.name} ${manifest.version} extension manifest and referenced files.`);
}
