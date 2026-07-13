import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const sentinel = "__RAIN_SHELTER_E2E__";
const assetsDirectory = join(process.cwd(), "dist", "assets");
const files = await readdir(assetsDirectory);
const javascriptFiles = files.filter((file) => file.endsWith(".js"));

for (const file of javascriptFiles) {
  const contents = await readFile(join(assetsDirectory, file), "utf8");
  if (contents.includes(sentinel)) {
    throw new Error(`Production bundle contains the E2E sentinel in ${file}`);
  }
}

console.log(`Verified ${javascriptFiles.length} production JavaScript bundle(s).`);
