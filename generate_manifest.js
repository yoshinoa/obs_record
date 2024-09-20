const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const fileWhitelist = ["monsters.xml", "index.js", "module.json", "README.md"];
const dirWhitelist = ["node_modules"];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);

    if (fs.statSync(fullPath).isDirectory()) {
      const isInWhitelistedDir = dirWhitelist.some((whitelistedDir) =>
        fullPath.includes(whitelistedDir)
      );

      if (isInWhitelistedDir) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      const isWhitelistedFile = fileWhitelist.includes(file);
      const isInWhitelistedDir = dirWhitelist.some((whitelistedDir) =>
        fullPath.includes(whitelistedDir)
      );

      if (isWhitelistedFile || isInWhitelistedDir) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

function generateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

function generateManifest() {
  const manifest = { files: {} };

  const allFiles = getAllFiles(__dirname);

  allFiles.forEach((file) => {
    const relativeFilePath = path.relative(__dirname, file);
    const normalizedPath = relativeFilePath.replace(/\\/g, "/");
    const fileHash = generateFileHash(file);
    manifest.files[normalizedPath] = fileHash;
  });

  const manifestPath = path.join(__dirname, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("Manifest file generated successfully!");
}

generateManifest();
