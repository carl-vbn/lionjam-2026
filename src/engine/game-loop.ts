export interface GameLoop {
  start(): void;
  stop(): void;
  readonly running: boolean;
}

/**
 * Create a game loop driven by requestAnimationFrame.
 * The callback receives the time elapsed since the last frame in seconds.
 * Delta time is capped at 100ms to avoid spiral-of-death when the tab is backgrounded.
 */
export function createGameLoop(callback: (dt: number) => void): GameLoop {
  let running = false;
  let lastTime = 0;
  let rafId = 0;

  function frame(time: number) {
    if (!running) return;
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;
    callback(dt);
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      lastTime = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
    get running() {
      return running;
    },
  };
}
