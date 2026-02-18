import { ParticleSource } from "./particles.js";
import { RenderContext } from "./render-context.js";
import { Vec2 } from "./vec2.js";

/**
 * Base class for tiles in the world grid.
 * Subclass this to create custom tile types with their own rendering and behavior.
 */
export abstract class Tile {
  /** The tile's position in the world grid (integer coordinates). */
  readonly position: Vec2;

  /** Draw layer for z-ordering. Higher values draw on top. Default is 0. */
  layer: number = 0;

  /** Whether this tile blocks entity movement. Default is false. */
  solid: boolean = false;

  constructor(x: number, y: number) {
    this.position = new Vec2(x, y);
  }

  /**
   * Draw this tile. The context is already positioned so that (0, 0) is
   * the top-left of this tile and (1, 1) is the bottom-right.
   */
  abstract draw(ctx: RenderContext): void;

  /**
   * Called every frame with the time elapsed since the last frame.
   * Override to add per-tile game logic or animation.
   */
  update(_dt: number): void {}

  /**
   * Called when this tile is clicked.
   * Override to add click behavior.
   */
  onClick(_worldPos: Vec2): void {}

  /**
   * Return the image source and region to sample particle chunks from.
   * Override to enable texture-based particle effects when this tile is clicked.
   */
  getParticleSource(): ParticleSource | null {
    return null;
  }
}
