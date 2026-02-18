import { Vec2 } from "./vec2.js";
import { RenderContext } from "./render-context.js";
import { World } from "./world.js";

export type MouseButton = "left" | "middle" | "right";
export type MouseEventType = "click" | "down" | "up" | "move";

export interface MouseEvent {
  type: MouseEventType;
  button: MouseButton;
  screenPos: Vec2;
  worldPos: Vec2;
}

export type MouseListener = (event: MouseEvent) => void;
export type KeyListener = (key: string, down: boolean) => void;

function toMouseButton(button: number): MouseButton {
  if (button === 1) return "middle";
  if (button === 2) return "right";
  return "left";
}

/**
 * Handles mouse and keyboard input for the engine.
 * Provides screen-to-world coordinate conversion and tile click detection.
 */
export class InputHandler {
  private static instance: InputHandler | null = null;

  static init(renderCtx: RenderContext, world: World): InputHandler {
    if (InputHandler.instance) {
      InputHandler.instance.dispose();
    }
    InputHandler.instance = new InputHandler(renderCtx, world);
    return InputHandler.instance;
  }

  static getInstance(): InputHandler {
    if (!InputHandler.instance) {
      throw new Error("InputHandler not initialized. Call InputHandler.init() first.");
    }
    return InputHandler.instance;
  }

  private mouseListeners: MouseListener[] = [];
  private keyListeners: KeyListener[] = [];
  private keysDown: Set<string> = new Set();
  private cleanupFns: (() => void)[] = [];
  private lastMousePos: { screenPos: Vec2; worldPos: Vec2 } = {
    screenPos: new Vec2(0, 0),
    worldPos: new Vec2(0, 0),
  };

  private constructor(private renderCtx: RenderContext, private world: World) {
    this.attach();
  }

  onMouse(listener: MouseListener): () => void {
    this.mouseListeners.push(listener);
    return () => {
      const idx = this.mouseListeners.indexOf(listener);
      if (idx >= 0) this.mouseListeners.splice(idx, 1);
    };
  }

  onKey(listener: KeyListener): () => void {
    this.keyListeners.push(listener);
    return () => {
      const idx = this.keyListeners.indexOf(listener);
      if (idx >= 0) this.keyListeners.splice(idx, 1);
    };
  }

  isKeyDown(key: string): boolean {
    return this.keysDown.has(key);
  }

  /** Get the current mouse position in both screen and world coordinates. */
  getMousePos(): { screenPos: Vec2; worldPos: Vec2 } {
    return this.lastMousePos;
  }

  private attach(): void {
    const canvas = this.renderCtx.canvas;

    const onMouseEvent = (type: MouseEventType) => (e: globalThis.MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const screenPos = new Vec2(e.clientX - rect.left, e.clientY - rect.top);
      const worldPos = this.renderCtx.screenToWorld(screenPos.x, screenPos.y);
      const button = toMouseButton(e.button);

      const event: MouseEvent = { type, button, screenPos, worldPos };

      // Update the last mouse position
      this.lastMousePos = { screenPos, worldPos };

      // Click detection for tiles and entities
      if (type === "click" && this.world) {
        const tileX = Math.floor(worldPos.x);
        const tileY = Math.floor(worldPos.y);
        const tile = this.world.getTile(tileX, tileY);
        if (tile) {
          tile.onClick(worldPos);
        }

        const entity = this.world.getClickableEntityAt(worldPos);
        if (entity) {
          entity.onClick!(worldPos);
        }
      }

      for (const listener of this.mouseListeners) {
        listener(event);
      }
    };

    const onClick = onMouseEvent("click");
    const onDown = onMouseEvent("down");
    const onUp = onMouseEvent("up");
    const onMove = onMouseEvent("move");

    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("mousemove", onMove);

    const onKeyDown = (e: KeyboardEvent) => {
      this.keysDown.add(e.key);
      for (const listener of this.keyListeners) {
        listener(e.key, true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keysDown.delete(e.key);
      for (const listener of this.keyListeners) {
        listener(e.key, false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Prevent right-click context menu on canvas
    const onContextMenu = (e: Event) => e.preventDefault();
    canvas.addEventListener("contextmenu", onContextMenu);

    this.cleanupFns.push(
      () => canvas.removeEventListener("click", onClick),
      () => canvas.removeEventListener("mousedown", onDown),
      () => canvas.removeEventListener("mouseup", onUp),
      () => canvas.removeEventListener("mousemove", onMove),
      () => window.removeEventListener("keydown", onKeyDown),
      () => window.removeEventListener("keyup", onKeyUp),
      () => canvas.removeEventListener("contextmenu", onContextMenu),
    );
  }

  dispose(): void {
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
    this.mouseListeners = [];
    this.keyListeners = [];
  }
}
