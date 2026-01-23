const REPO = "Marcel-Bich/dogma";

const PLATFORM_MAP: Record<string, string> = {
  linux: "linux",
  darwin: "darwin",
  win32: "windows",
};

const ARCH_MAP: Record<string, string> = {
  x64: "amd64",
  arm64: "arm64",
};

export class UnsupportedPlatformError extends Error {
  constructor(platform: string) {
    super(`Unsupported platform: ${platform}. Supported: linux, darwin, win32`);
    this.name = "UnsupportedPlatformError";
  }
}

export class UnsupportedArchError extends Error {
  constructor(arch: string) {
    super(`Unsupported architecture: ${arch}. Supported: x64, arm64`);
    this.name = "UnsupportedArchError";
  }
}

export function getPlatformKey(platform: string, arch: string): string {
  const mappedPlatform = PLATFORM_MAP[platform];
  if (!mappedPlatform) {
    throw new UnsupportedPlatformError(platform);
  }

  const mappedArch = ARCH_MAP[arch];
  if (!mappedArch) {
    throw new UnsupportedArchError(arch);
  }

  return `${mappedPlatform}-${mappedArch}`;
}

export function getBinaryExtension(platformKey: string): string {
  return platformKey.startsWith("windows") ? ".exe" : "";
}

export function getDownloadUrl(version: string, platformKey: string): string {
  const ext = getBinaryExtension(platformKey);
  return `https://github.com/${REPO}/releases/download/v${version}/dogma-${platformKey}${ext}`;
}
