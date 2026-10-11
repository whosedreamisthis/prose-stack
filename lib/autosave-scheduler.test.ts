import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosaveScheduler } from "@/lib/autosave-scheduler";

function setup() {
  const resolvers: ((ok: boolean) => void)[] = [];
  const save = vi.fn(() => new Promise<boolean>((resolve) => resolvers.push(resolve)));
  const onStatus = vi.fn();
  const scheduler = createAutosaveScheduler({ save, idleMs: 1500, maxWaitMs: 10_000, retryDelaysMs: [2000, 4000], onStatus });
  return { scheduler, save, onStatus, finish: (ok = true) => resolvers.shift()?.(ok) };
}

describe("createAutosaveScheduler", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("saves once typing has been idle", async () => {
    const { scheduler, save } = setup();
    scheduler.markDirty();
    await vi.advanceTimersByTimeAsync(1499);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("restarts the idle wait on each edit but forces a save at the max wait", async () => {
    const { scheduler, save } = setup();
    for (let t = 0; t < 10_000; t += 1000) {
      scheduler.markDirty();
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("does nothing when there is nothing to save", async () => {
    const { scheduler, save } = setup();
    await scheduler.flush();
    expect(save).not.toHaveBeenCalled();
  });

  it("runs one save at a time and saves again for edits made during a save", async () => {
    const { scheduler, save, finish, onStatus } = setup();
    scheduler.markDirty();
    await vi.advanceTimersByTimeAsync(1500);
    scheduler.markDirty();
    void scheduler.flush();
    expect(save).toHaveBeenCalledTimes(1);
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(2);
    expect(onStatus).not.toHaveBeenCalledWith("saved");
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(onStatus).toHaveBeenLastCalledWith("saved");
  });

  it("reports an error and retries with backoff", async () => {
    const { scheduler, save, finish, onStatus } = setup();
    scheduler.markDirty();
    await vi.advanceTimersByTimeAsync(1500);
    finish(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(onStatus).toHaveBeenLastCalledWith("error");
    expect(scheduler.dirty).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(2);
    finish(false);
    await vi.advanceTimersByTimeAsync(3999);
    expect(save).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(3);
    finish(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(onStatus).toHaveBeenLastCalledWith("saved");
  });

  it("treats a thrown save as a failure", async () => {
    const onStatus = vi.fn();
    const scheduler = createAutosaveScheduler({
      save: () => Promise.reject(new Error("offline")),
      idleMs: 10,
      maxWaitMs: 100,
      retryDelaysMs: [50],
      onStatus,
    });
    scheduler.markDirty();
    await vi.advanceTimersByTimeAsync(10);
    expect(onStatus).toHaveBeenLastCalledWith("error");
    scheduler.dispose();
  });

  it("saves on flush when starting dirty, and stops after dispose", async () => {
    const save = vi.fn().mockResolvedValue(true);
    const scheduler = createAutosaveScheduler({ save, idleMs: 10, maxWaitMs: 100, retryDelaysMs: [50], onStatus: vi.fn(), startDirty: true });
    await scheduler.flush();
    expect(save).toHaveBeenCalledTimes(1);
    scheduler.markDirty();
    scheduler.dispose();
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
