import * as os from "node:os";
import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";
import { getPlatformKey, getDownloadUrl, getBinaryExtension } from "./platform";

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          download(redirectUrl, dest).then(resolve, reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(dest);
      response.pipe(file);
      response.on("end", () => {
        resolve();
      });
    });

    req.on("error", (err: Error) => {
      reject(new Error(`Network error downloading dogma: ${err.message}`));
    });
  });
}

export async function install(version: string): Promise<void> {
  const platform = os.platform();
  const arch = os.arch();
  const platformKey = getPlatformKey(platform, arch);
  const url = getDownloadUrl(version, platformKey);
  const ext = getBinaryExtension(platformKey);
  const binName = `dogma${ext}`;

  const binDir = path.join(__dirname, "..", "bin");
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const binPath = path.join(binDir, binName);
  await download(url, binPath);

  if (platform !== "win32") {
    fs.chmodSync(binPath, 0o755);
  }
}

/* v8 ignore start: entry point */
if (typeof require !== "undefined" && require.main === module) {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf-8")
  );
  install(pkg.version).catch((err: Error) => {
    console.error(`Failed to install dogma: ${err.message}`);
    process.exit(1);
  });
}
/* v8 ignore stop */
