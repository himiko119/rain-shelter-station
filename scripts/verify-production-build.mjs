import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const sentinels = ["__RAIN_SHELTER_E2E__", "__RAIN_SHELTER_DEV_PANEL__"];
const assetsDirectory = join(process.cwd(), "dist", "assets");
const files = await readdir(assetsDirectory);
const javascriptFiles = files.filter((file) => file.endsWith(".js"));

for (const file of javascriptFiles) {
  const contents = await readFile(join(assetsDirectory, file), "utf8");
  const sentinel = sentinels.find((candidate) => contents.includes(candidate));
  if (sentinel) {
    throw new Error(`Production bundle contains development sentinel ${sentinel} in ${file}`);
  }
}

console.log(`Verified ${javascriptFiles.length} production JavaScript bundle(s).`);
