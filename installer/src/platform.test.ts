import { describe, it, expect } from "vitest";
import {
  getPlatformKey,
  getDownloadUrl,
  getBinaryExtension,
  UnsupportedPlatformError,
  UnsupportedArchError,
} from "./platform";

describe("getPlatformKey", () => {
  it("maps linux x64 to linux-amd64", () => {
    expect(getPlatformKey("linux", "x64")).toBe("linux-amd64");
  });

  it("maps linux arm64 to linux-arm64", () => {
    expect(getPlatformKey("linux", "arm64")).toBe("linux-arm64");
  });

  it("maps darwin x64 to darwin-amd64", () => {
    expect(getPlatformKey("darwin", "x64")).toBe("darwin-amd64");
  });

  it("maps darwin arm64 to darwin-arm64", () => {
    expect(getPlatformKey("darwin", "arm64")).toBe("darwin-arm64");
  });

  it("maps win32 x64 to windows-amd64", () => {
    expect(getPlatformKey("win32", "x64")).toBe("windows-amd64");
  });

  it("maps win32 arm64 to windows-arm64", () => {
    expect(getPlatformKey("win32", "arm64")).toBe("windows-arm64");
  });

  it("throws UnsupportedPlatformError for freebsd", () => {
    expect(() => getPlatformKey("freebsd", "x64")).toThrow(
      UnsupportedPlatformError
    );
  });

  it("throws UnsupportedArchError for ia32", () => {
    expect(() => getPlatformKey("linux", "ia32")).toThrow(
      UnsupportedArchError
    );
  });
});

describe("getDownloadUrl", () => {
  it("constructs correct GitHub release URL", () => {
    expect(getDownloadUrl("0.1.0", "linux-amd64")).toBe(
      "https://github.com/Marcel-Bich/dogma/releases/download/v0.1.0/dogma-linux-amd64"
    );
  });

  it("includes .exe extension for windows platform key", () => {
    expect(getDownloadUrl("1.2.3", "windows-amd64")).toBe(
      "https://github.com/Marcel-Bich/dogma/releases/download/v1.2.3/dogma-windows-amd64.exe"
    );
  });
});

describe("getBinaryExtension", () => {
  it("returns .exe for windows-amd64", () => {
    expect(getBinaryExtension("windows-amd64")).toBe(".exe");
  });

  it("returns .exe for windows-arm64", () => {
    expect(getBinaryExtension("windows-arm64")).toBe(".exe");
  });

  it("returns empty string for linux-amd64", () => {
    expect(getBinaryExtension("linux-amd64")).toBe("");
  });

  it("returns empty string for darwin-arm64", () => {
    expect(getBinaryExtension("darwin-arm64")).toBe("");
  });
});
