import { Tile } from "./tile.js";
import { Entity } from "./entity.js";
import { RenderContext } from "./render-context.js";
import { Vec2 } from "./vec2.js";

function compareEntities(a: Entity, b: Entity): number {
  if (a.layer !== b.layer) return a.layer - b.layer;
  return a.position.y - b.position.y;
}

/**
 * A 2D tile grid world.
 * Tiles are stored in a sparse map keyed by "x,y" for flexibility.
 * Entities are kept in a sorted array (by layer, then y) for efficient draw-order.
 */
export class World {
  private tiles: Map<string, Tile> = new Map();
  private entities: Entity[] = [];
  private dynamicEntities: Set<Entity> = new Set();

  private static key(x: number, y: number): string {
    return `${x},${y}`;
  }

  setTile(x: number, y: number, tile: Tile | null): void {
    const k = World.key(x, y);
    if (tile === null) {
      this.tiles.delete(k);
    } else {
      this.tiles.set(k, tile);
    }
  }

  getTile(x: number, y: number): Tile | null {
    return this.tiles.get(World.key(x, y)) ?? null;
  }

  getNeighbors(x: number, y: number): (Tile | null)[] {
    return [
      this.getTile(x, y - 1), // up
      this.getTile(x + 1, y), // right
      this.getTile(x, y + 1), // down
      this.getTile(x - 1, y), // left
      this.getTile(x - 1, y - 1), // up-left
      this.getTile(x + 1, y - 1), // up-right
      this.getTile(x + 1, y + 1), // down-right
      this.getTile(x - 1, y + 1), // down-left
    ];
  }

  /** Iterate over all tiles. */
  forEachTile(callback: (tile: Tile) => void): void {
    for (const tile of this.tiles.values()) {
      callback(tile);
    }
  }

  /** Binary-insert an entity into the sorted array. */
  private insertEntitySorted(entity: Entity): void {
    let lo = 0, hi = this.entities.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (compareEntities(this.entities[mid], entity) <= 0) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    this.entities.splice(lo, 0, entity);
  }

  addEntity(entity: Entity): void {
    this.insertEntitySorted(entity);
    if (entity.dynamic) {
      this.dynamicEntities.add(entity);
    }
  }

  removeEntity(entity: Entity): void {
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) {
      this.entities.splice(idx, 1);
    }
    this.dynamicEntities.delete(entity);
  }

  /** Iterate over all entities. */
  forEachEntity(callback: (entity: Entity) => void): void {
    for (const entity of this.entities) {
      callback(entity);
    }
  }

  /** Update all tiles and entities, then re-sort dynamic entities. */
  update(dt: number): void {
    for (const tile of this.tiles.values()) {
      tile.update(dt);
    }
    for (const entity of this.entities) {
      entity.update(dt);
    }

    // Re-sort only dynamic entities (e.g. the player) by removing and re-inserting
    for (const entity of this.dynamicEntities) {
      const idx = this.entities.indexOf(entity);
      if (idx !== -1) {
        this.entities.splice(idx, 1);
        this.insertEntitySorted(entity);
      }
    }
  }

  /**
   * Find the clickable entity at the given world position with the highest y (closest to camera).
   * Only considers entities where clickable is true.
   */
  getClickableEntityAt(worldPos: Vec2): Entity | null {
    let best: Entity | null = null;
    for (const entity of this.entities) {
      if (!entity.clickable) continue;
      const ex = entity.position.x - entity.size.x / 2;
      const ey = entity.position.y - entity.size.y;
      if (worldPos.x >= ex && worldPos.x <= ex + entity.size.x &&
          worldPos.y >= ey && worldPos.y <= ey + entity.size.y) {
        if (!best || entity.layer > best.layer || (entity.layer === best.layer && entity.position.y > best.position.y)) {
          best = entity;
        }
      }
    }
    return best;
  }

  /**
   * Draw the world. Tiles are drawn first (all layer 0), then entities
   * are drawn in their pre-sorted order (by layer, then y) for correct
   * depth ordering without per-frame sorting.
   */
  draw(ctx: RenderContext): void {
    const bounds = ctx.getVisibleBounds();

    // Draw visible tiles (all layer 0, order within layer doesn't matter)
    for (const tile of this.tiles.values()) {
      const tx = tile.position.x;
      const ty = tile.position.y;
      if (tx + 1 >= bounds.minX && tx <= bounds.maxX &&
          ty + 1 >= bounds.minY && ty <= bounds.maxY) {
        ctx.pushTransform({ translation: tile.position });
        tile.draw(ctx);
        ctx.popTransform();
      }
    }

    // Draw visible entities in pre-sorted order (layer, then y)
    for (const entity of this.entities) {
      const ex = entity.position.x - entity.size.x / 2;
      const ey = entity.position.y - entity.size.y / 2;
      if (ex + entity.size.x >= bounds.minX && ex <= bounds.maxX &&
          ey + entity.size.y >= bounds.minY && ey <= bounds.maxY) {
        entity.draw(ctx);
      }
    }
  }
}
