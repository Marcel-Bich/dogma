import * as os from "node:os";
import * as fs from "node:fs";
import * as path from "node:path";

export function uninstall(): void {
  const platform = os.platform();
  const ext = platform === "win32" ? ".exe" : "";
  const binName = `dogma${ext}`;

  const binDir = path.join(__dirname, "..", "bin");
  const binPath = path.join(binDir, binName);

  if (!fs.existsSync(binPath)) {
    return;
  }

  fs.unlinkSync(binPath);

  const remaining = fs.readdirSync(binDir);
  if (remaining.length === 0) {
    fs.rmdirSync(binDir);
  }
}

/* v8 ignore start: entry point */
if (typeof require !== "undefined" && require.main === module) {
  try {
    uninstall();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to uninstall dogma: ${message}`);
    process.exit(1);
  }
}
/* v8 ignore stop */
