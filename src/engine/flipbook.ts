import { createOutlinedImage } from "./image.js";

/**
 * A flipbook animation backed by a horizontal sprite sheet.
 * Each frame occupies an equal-width region of the image, laid out left to right.
 * The image is loaded automatically from the provided path.
 */
export class Flipbook {
  image: HTMLImageElement;
  frameCount: number;
  /** Time in seconds between frames. */
  interval: number;
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

  constructor(src: HTMLImageElement | string, frameCount: number, interval: number, outline: { color: string; width: number } | null = null) {
    this.frameCount = frameCount;
    this.interval = interval;
    
    if (typeof src === "string") {
      this.image = new Image();
      this.image.src = src;
    } else {
      this.image = src;
    }

    if (outline) {
      this._loaded = false;
      createOutlinedImage(this.image, outline.width, outline.color).then((outlinedImg) => {
        this.image = outlinedImg;
        this._loaded = true;
      });
    } else {
      if (this.image.complete) {
        this._loaded = true;
      } else {
        this.image.onload = () => { this._loaded = true; };
      }
    }
  }

  /** Get the frame index for a given time (seconds). Loops automatically. */
  frameAt(time: number): number {
    const frame = Math.floor(time / this.interval) % this.frameCount;
    return ((frame % this.frameCount) + this.frameCount) % this.frameCount;
  }
}
