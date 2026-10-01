const RELOAD_FLAG = "stale-chunk-reloaded-at";
const RELOAD_COOLDOWN_MS = 30_000;

const readLastReload = (): number => {
  try {
    return Number(sessionStorage.getItem(RELOAD_FLAG)) || 0;
  } catch {
    return 0;
  }
};

/**
 * After a new deploy, a tab still running the old build requests lazy chunks
 * whose hashed filenames no longer exist (404). Reload once to pick up the new
 * build; the cooldown prevents a reload loop when the chunk is truly missing.
 */
export const installStaleChunkReload = (): void => {
  window.addEventListener("vite:preloadError", (event) => {
    if (Date.now() - readLastReload() < RELOAD_COOLDOWN_MS) return;
    try {
      sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
    } catch {
      return;
    }
    event.preventDefault();
    window.location.reload();
  });
};
