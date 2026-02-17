import { Camera } from "./camera.js";
import { Vec2 } from "./vec2.js";
import { Transform } from "./transform.js";
import { Flipbook } from "./flipbook.js";

export interface CreateContextOptions {
  canvas: HTMLCanvasElement;
  camera: Camera;
  tileSize?: number;
}

export class RenderContext {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private _camera: Camera;
  private _tileSize: number;
  private resizeObserver: ResizeObserver;
  private transformDepth: number = 0;
  private _time: number = 0;

  get camera(): Camera {
    return this._camera;
  }

  set camera(camera: Camera) {
    this._camera = camera;
  }

  get tileSize(): number {
    return this._tileSize;
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  /** Central clock time in seconds, advanced each frame. Used to sync flipbook animations. */
  get time(): number {
    return this._time;
  }

  constructor(options: CreateContextOptions) {
    this.canvas = options.canvas;
    this._camera = options.camera;
    this._tileSize = options.tileSize ?? 64;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D rendering context");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.resizeCanvas();

    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObserver.observe(this.canvas.parentElement ?? document.body);
  }

  private resizeCanvas(): void {
    const parent = this.canvas.parentElement ?? document.body;
    const rect = parent.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.canvas.style.width = rect.width + "px";
    this.canvas.style.height = rect.height + "px";
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Begin a frame: advances the clock, clears the canvas, and applies the camera transform. */
  beginFrame(dt: number = 0): void {
    this._time += dt;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.transformDepth = 0;

    // Camera transform: center the camera position on screen, apply zoom and tile size.
    // The scale is rounded so one tile always spans a whole number of pixels,
    // and the offset is rounded so tile edges land on pixel boundaries.
    // Together these eliminate sub-pixel seams between tiles at any zoom level.
    const scale = Math.round(this._tileSize * this._camera.zoom);
    const offsetX = Math.round(this.canvas.width / 2 - this._camera.position.x * scale);
    const offsetY = Math.round(this.canvas.height / 2 - this._camera.position.y * scale);
    this.ctx.translate(offsetX, offsetY);
    this.ctx.scale(scale, scale);
  }

  /** End a frame. Resets the transform. */
  endFrame(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.transformDepth = 0;
  }

  /**
   * Push a local transform onto the stack.
   * All drawing between pushTransform and popTransform is affected.
   */
  pushTransform(transform: Transform): void {
    this.ctx.save();
    this.transformDepth++;

    const tx = transform.translation?.x ?? 0;
    const ty = transform.translation?.y ?? 0;
    const s = transform.scale ?? 1;
    const r = transform.rotation ?? 0;
    const cx = transform.center?.x ?? 0;
    const cy = transform.center?.y ?? 0;

    this.ctx.translate(tx, ty);
    this.ctx.translate(cx, cy);
    this.ctx.rotate(r);
    this.ctx.scale(s, s);
    this.ctx.translate(-cx, -cy);
  }

  /** Pop the most recently pushed transform. */
  popTransform(): void {
    if (this.transformDepth <= 0) return;
    this.ctx.restore();
    this.transformDepth--;
  }

  /**
   * Convert screen pixel coordinates to world tile coordinates.
   */
  screenToWorld(screenX: number, screenY: number): Vec2 {
    const scale = this._tileSize * this._camera.zoom;
    const worldX = (screenX - this.canvas.width / 2) / scale + this._camera.position.x;
    const worldY = (screenY - this.canvas.height / 2) / scale + this._camera.position.y;
    return new Vec2(worldX, worldY);
  }

  /**
   * Convert world tile coordinates to screen pixel coordinates.
   */
  worldToScreen(worldX: number, worldY: number): Vec2 {
    const scale = this._tileSize * this._camera.zoom;
    const screenX = (worldX - this._camera.position.x) * scale + this.canvas.width / 2;
    const screenY = (worldY - this._camera.position.y) * scale + this.canvas.height / 2;
    return new Vec2(screenX, screenY);
  }

  /**
   * Get the visible tile bounds (min/max tile indices visible on screen).
   * Returns { minX, minY, maxX, maxY } in tile coordinates.
   */
  getVisibleBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.canvas.width, this.canvas.height);
    return {
      minX: Math.floor(topLeft.x),
      minY: Math.floor(topLeft.y),
      maxX: Math.ceil(bottomRight.x),
      maxY: Math.ceil(bottomRight.y),
    };
  }

  // --- Drawing helpers (all in tile coordinate space) ---

  drawImage(
    image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    x: number,
    y: number,
    width: number = 1,
    height: number = 1,
  ): void {
    this.ctx.drawImage(image, x, y, width, height);
  }

  drawImageRegion(
    image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    sx: number, sy: number, sw: number, sh: number,
    dx: number, dy: number, dw: number, dh: number,
  ): void {
    this.ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  /**
   * Draw a flipbook animation at the given position and size.
   * The frame is selected automatically based on the context's central clock.
   */
  drawFlipbook(
    flipbook: Flipbook,
    x: number,
    y: number,
    width: number = 1,
    height: number = 1,
  ): void {
    if (!flipbook.loaded) return;
    const frame = flipbook.frameAt(this._time);
    const fw = flipbook.frameWidth;
    const fh = flipbook.frameHeight;
    this.ctx.drawImage(flipbook.image, frame * fw, 0, fw, fh, x, y, width, height);
  }

  fillRect(x: number, y: number, width: number, height: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  strokeRect(x: number, y: number, width: number, height: number, color: string, lineWidth: number = 0.02): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(x, y, width, height);
  }

  drawText(
    text: string,
    x: number,
    y: number,
    options: {
      font?: string;
      size?: number;
      color?: string;
      align?: CanvasTextAlign;
      baseline?: CanvasTextBaseline;
    } = {},
  ): void {
    const size = options.size ?? 0.5;
    const font = options.font ?? "sans-serif";
    // Font size is in tile units — we need to convert to the current coordinate system.
    // Since the canvas is already scaled by (tileSize * zoom), a font size of 0.5 means
    // half a tile. We set the font size in the current unit and let the canvas transform handle it.
    this.ctx.font = `${size}px ${font}`;
    this.ctx.fillStyle = options.color ?? "white";
    this.ctx.textAlign = options.align ?? "left";
    this.ctx.textBaseline = options.baseline ?? "top";
    this.ctx.fillText(text, x, y);
  }

  setAlpha(alpha: number): void {
    this.ctx.globalAlpha = alpha;
  }

  resetAlpha(): void {
    this.ctx.globalAlpha = 1;
  }

  dispose(): void {
    this.resizeObserver.disconnect();
  }
}

export function createContext(options: CreateContextOptions): RenderContext {
  return new RenderContext(options);
}
