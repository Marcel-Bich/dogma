import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { install } from "./install";

vi.mock("node:os", () => ({
  platform: vi.fn(() => "linux"),
  arch: vi.fn(() => "x64"),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  createWriteStream: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn(),
  })),
  chmodSync: vi.fn(),
}));

vi.mock("node:https", () => ({
  get: vi.fn(),
}));

import * as os from "node:os";
import * as fs from "node:fs";
import * as https from "node:https";
import { PassThrough } from "node:stream";

function createMockResponse(statusCode: number, headers: Record<string, string> = {}) {
  const response = new PassThrough() as PassThrough & { statusCode: number; headers: Record<string, string> };
  response.statusCode = statusCode;
  response.headers = headers;
  return response;
}

function setupSuccessfulDownload() {
  const response = createMockResponse(200);
  const writeStream = new PassThrough();
  (writeStream as unknown as { close: () => void }).close = vi.fn();

  vi.mocked(https.get).mockImplementation((_url: unknown, cb: unknown) => {
    (cb as (res: unknown) => void)(response);
    setTimeout(() => {
      response.emit("data", Buffer.from("binary-content"));
      response.end();
    }, 0);
    return { on: vi.fn() } as unknown as ReturnType<typeof https.get>;
  });

  vi.mocked(fs.createWriteStream).mockReturnValue(writeStream as unknown as ReturnType<typeof fs.createWriteStream>);
  vi.mocked(fs.existsSync).mockReturnValue(true);

  return { response, writeStream };
}

describe("install", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(os.platform).mockReturnValue("linux" as NodeJS.Platform);
    vi.mocked(os.arch).mockReturnValue("x64");
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls getPlatformKey with current os.platform() and os.arch()", async () => {
    setupSuccessfulDownload();

    await install("0.0.1");

    expect(os.platform).toHaveBeenCalled();
    expect(os.arch).toHaveBeenCalled();
  });

  it("constructs correct download URL from version", async () => {
    setupSuccessfulDownload();

    await install("0.0.1");

    expect(https.get).toHaveBeenCalledWith(
      "https://github.com/Marcel-Bich/dogma/releases/download/v0.0.1/dogma-linux-amd64",
      expect.any(Function)
    );
  });

  it("downloads binary to bin/ directory", async () => {
    setupSuccessfulDownload();

    await install("0.0.1");

    expect(fs.createWriteStream).toHaveBeenCalledWith(
      expect.stringContaining("bin/dogma")
    );
  });

  it("sets executable permission (chmod 755) on non-windows", async () => {
    setupSuccessfulDownload();
    vi.mocked(os.platform).mockReturnValue("linux" as NodeJS.Platform);

    await install("0.0.1");

    expect(fs.chmodSync).toHaveBeenCalledWith(
      expect.stringContaining("bin/dogma"),
      0o755
    );
  });

  it("skips chmod on windows", async () => {
    setupSuccessfulDownload();
    vi.mocked(os.platform).mockReturnValue("win32" as NodeJS.Platform);

    await install("0.0.1");

    expect(fs.chmodSync).not.toHaveBeenCalled();
  });

  it("creates bin/ directory if not exists", async () => {
    setupSuccessfulDownload();
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await install("0.0.1");

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining("bin"),
      { recursive: true }
    );
  });

  it("throws on HTTP error (non-200 response)", async () => {
    const response = createMockResponse(404);

    vi.mocked(https.get).mockImplementation((_url: unknown, cb: unknown) => {
      (cb as (res: unknown) => void)(response);
      return { on: vi.fn() } as unknown as ReturnType<typeof https.get>;
    });

    await expect(install("0.0.1")).rejects.toThrow("Download failed: HTTP 404");
  });

  it("follows redirects (302 responses)", async () => {
    const redirectResponse = createMockResponse(302, {
      location: "https://objects.githubusercontent.com/release-asset",
    });
    const finalResponse = createMockResponse(200);
    const writeStream = new PassThrough();
    (writeStream as unknown as { close: () => void }).close = vi.fn();

    let callCount = 0;
    vi.mocked(https.get).mockImplementation((_url: unknown, cb: unknown) => {
      callCount++;
      if (callCount === 1) {
        (cb as (res: unknown) => void)(redirectResponse);
      } else {
        (cb as (res: unknown) => void)(finalResponse);
        setTimeout(() => {
          finalResponse.emit("data", Buffer.from("binary"));
          finalResponse.end();
        }, 0);
      }
      return { on: vi.fn() } as unknown as ReturnType<typeof https.get>;
    });

    vi.mocked(fs.createWriteStream).mockReturnValue(writeStream as unknown as ReturnType<typeof fs.createWriteStream>);

    await install("0.0.1");

    expect(https.get).toHaveBeenCalledTimes(2);
    expect(https.get).toHaveBeenLastCalledWith(
      "https://objects.githubusercontent.com/release-asset",
      expect.any(Function)
    );
  });

  it("throws on network error with helpful message", async () => {
    vi.mocked(https.get).mockImplementation((_url: unknown, _cb: unknown) => {
      const req = { on: vi.fn() } as unknown as { on: (event: string, handler: (err: Error) => void) => typeof req };
      req.on = vi.fn((_event: string, handler: (err: Error) => void) => {
        setTimeout(() => handler(new Error("ECONNREFUSED")), 0);
        return req;
      }) as unknown as typeof req.on;
      return req as unknown as ReturnType<typeof https.get>;
    });

    await expect(install("0.0.1")).rejects.toThrow(
      "Network error downloading dogma: ECONNREFUSED"
    );
  });
});
