export interface AutosaveSchedulerOptions {
  /** Saves the current content. Resolves true when the server confirmed it. */
  save: () => Promise<boolean>;
  idleMs: number;
  maxWaitMs: number;
  /** Delays between retries after a failed save; the last one repeats. */
  retryDelaysMs: number[];
  onStatus: (status: "saving" | "saved" | "error") => void;
  /** True when the editor opened with edits the server has not seen. */
  startDirty?: boolean;
}

/**
 * Decides when to save: after `idleMs` without edits, at least every `maxWaitMs` while edits keep coming, and on
 * demand. One save runs at a time; edits made during a save trigger another once it finishes. Failed saves retry.
 */
export function createAutosaveScheduler(options: AutosaveSchedulerOptions) {
  const { save, idleMs, maxWaitMs, retryDelaysMs, onStatus } = options;
  let dirty = options.startDirty ?? false;
  let saving = false;
  let failures = 0;
  let disposed = false;
  let idle: ReturnType<typeof setTimeout> | undefined;
  let max: ReturnType<typeof setTimeout> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;

  function clearTimers() {
    clearTimeout(idle);
    clearTimeout(max);
    clearTimeout(retry);
    idle = max = retry = undefined;
  }

  async function flush(): Promise<void> {
    if (disposed) return;
    clearTimers();
    if (!dirty || saving) return;
    dirty = false;
    saving = true;
    onStatus("saving");
    let ok = false;
    try {
      ok = await save();
    } catch {
      ok = false;
    }
    saving = false;
    if (disposed) return;
    if (ok) {
      failures = 0;
      if (dirty) void flush();
      else onStatus("saved");
      return;
    }
    dirty = true;
    onStatus("error");
    retry = setTimeout(() => void flush(), retryDelaysMs[Math.min(failures, retryDelaysMs.length - 1)]);
    failures += 1;
  }

  return {
    /** Call on every edit. */
    markDirty() {
      if (disposed) return;
      dirty = true;
      clearTimeout(idle);
      idle = setTimeout(() => void flush(), idleMs);
      max ??= setTimeout(() => void flush(), maxWaitMs);
    },
    flush,
    get dirty() {
      return dirty;
    },
    get saving() {
      return saving;
    },
    /** Stops all timers; no further saves or status updates happen. */
    dispose() {
      disposed = true;
      clearTimers();
    },
  };
}
