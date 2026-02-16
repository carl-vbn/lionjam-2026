/**
 * A flipbook animation backed by a horizontal sprite sheet.
 * Each frame occupies an equal-width region of the image, laid out left to right.
 * The image is loaded automatically from the provided path.
 */
export class Flipbook {
  readonly image: HTMLImageElement;
  readonly frameCount: number;
  /** Time in seconds between frames. */
  readonly interval: number;
  private _loaded: boolean = false;

  get loaded(): boolean {
    return this._loaded;
  }

  /** Width of a single frame in pixels (computed from image width / frameCount). */
  get frameWidth(): number {
    return this.image.width / this.frameCount;
  }

  /** Height of a single frame in pixels (full image height). */
  get frameHeight(): number {
    return this.image.height;
  }

  /** Total duration of one animation cycle in seconds. */
  get duration(): number {
    return this.frameCount * this.interval;
  }

  constructor(src: string, frameCount: number, interval: number) {
    this.frameCount = frameCount;
    this.interval = interval;
    this.image = new Image();
    this.image.onload = () => { this._loaded = true; };
    this.image.src = src;
  }

  /** Get the frame index for a given time (seconds). Loops automatically. */
  frameAt(time: number): number {
    const frame = Math.floor(time / this.interval) % this.frameCount;
    return ((frame % this.frameCount) + this.frameCount) % this.frameCount;
  }
}
