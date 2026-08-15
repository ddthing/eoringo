import { afterEach, describe, expect, it } from "vitest";
import {
  pauseRemoteSync,
  registerRemoteSyncController,
} from "./remoteSyncControl";

describe("remote sync control", () => {
  afterEach(async () => {
    await pauseRemoteSync();
  });

  it("waits for the active runtime to pause before local replacement", async () => {
    let resolvePause: (() => void) | undefined;
    const pause = new Promise<void>((resolve) => {
      resolvePause = resolve;
    });
    let paused = false;
    const unregister = registerRemoteSyncController({
      async pause() {
        await pause;
        paused = true;
      },
    });

    const waiting = pauseRemoteSync();
    expect(paused).toBe(false);
    resolvePause?.();
    await waiting;
    expect(paused).toBe(true);

    unregister();
  });
});
