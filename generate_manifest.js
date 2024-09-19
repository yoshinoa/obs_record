const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const filesToHash = ["monsters.xml", "index.js", "module.json", "README.md"];

function generateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

function generateManifest() {
  const manifest = { files: {} };

  filesToHash.forEach((file) => {
    const filePath = path.join(__dirname, file);
    const relativeFilePath = path.relative(__dirname, filePath);
    const normalizedPath = relativeFilePath.replace(/\\/g, "/");
    const fileHash = generateFileHash(filePath);
    manifest.files[normalizedPath] = fileHash;
  });

  const manifestPath = path.join(__dirname, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("Manifest file generated successfully!");
}

generateManifest();
