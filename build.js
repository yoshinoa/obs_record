const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: ["pre_index.js"], // Replace with the entry point of your module
    bundle: true,
    platform: "node", // Since this is a Node.js module
    outfile: "index.js", // The bundled output file
    minify: true, // Optional: Minify the output
    external: ["tera-toolbox"], // Prevent TERA Toolbox modules from being bundled
  })
  .then(() => {
    console.log("Bundling completed successfully!");
  })
  .catch((err) => {
    console.error("Error during bundling:", err);
  });
