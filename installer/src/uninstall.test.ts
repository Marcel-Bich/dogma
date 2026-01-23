import { describe, it, expect, vi, beforeEach } from "vitest";
import { uninstall } from "./uninstall";

vi.mock("node:os", () => ({
  platform: vi.fn(() => "linux"),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => true),
  unlinkSync: vi.fn(),
  readdirSync: vi.fn(() => []),
  rmdirSync: vi.fn(),
}));

import * as os from "node:os";
import * as fs from "node:fs";

describe("uninstall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(os.platform).mockReturnValue("linux" as NodeJS.Platform);
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([]);
  });

  it("removes bin/dogma file if it exists", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    uninstall();

    expect(fs.unlinkSync).toHaveBeenCalledWith(
      expect.stringContaining("bin/dogma")
    );
  });

  it("removes bin/dogma.exe on windows if it exists", () => {
    vi.mocked(os.platform).mockReturnValue("win32" as NodeJS.Platform);
    vi.mocked(fs.existsSync).mockReturnValue(true);

    uninstall();

    expect(fs.unlinkSync).toHaveBeenCalledWith(
      expect.stringContaining("bin/dogma.exe")
    );
  });

  it("does not throw if binary file does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    expect(() => uninstall()).not.toThrow();
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  it("removes bin/ directory if empty after removal", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([]);

    uninstall();

    expect(fs.rmdirSync).toHaveBeenCalledWith(
      expect.stringContaining("bin")
    );
  });

  it("does not remove bin/ directory if it still contains files", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue(["other-file"] as unknown as ReturnType<typeof fs.readdirSync>);

    uninstall();

    expect(fs.rmdirSync).not.toHaveBeenCalled();
  });
});
