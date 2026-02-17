import { Vec2 } from "./vec2.js";
import { RenderContext } from "./render-context.js";

/**
 * Base class for free-positioned entities in the world.
 * Unlike tiles, entities are not locked to the grid — they can exist at any position.
 */
export abstract class Entity {
  position: Vec2;

  /** Draw layer for z-ordering relative to other entities. Default is 0. */
  layer: number = 0;

  /**
   * Whether this entity moves and needs its sort position updated each frame.
   * Set to true for entities like the player that change position.
   */
  dynamic: boolean = false;

  /**
   * Bounding size in tile units, used for visibility culling.
   * Defaults to 1x1. Override if the entity is larger.
   */
  size: Vec2 = new Vec2(1, 1);

  constructor(position: Vec2 = Vec2.zero()) {
    this.position = position;
  }

  /**
   * Draw this entity. The context is in world-space coordinates;
   * the entity's position is NOT pre-applied — use this.position to draw.
   */
  abstract draw(ctx: RenderContext): void;

  /**
   * Called every frame with the time elapsed since the last frame.
   * Override to add movement, animation, or game logic.
   */
  update(_dt: number): void {}
}
