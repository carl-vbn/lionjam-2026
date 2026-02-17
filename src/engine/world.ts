import { Tile } from "./tile.js";
import { Entity } from "./entity.js";
import { RenderContext } from "./render-context.js";

/**
 * A 2D tile grid world.
 * Tiles are stored in a sparse map keyed by "x,y" for flexibility.
 */
export class World {
  private tiles: Map<string, Tile> = new Map();
  private entities: Set<Entity> = new Set();

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

  addEntity(entity: Entity): void {
    this.entities.add(entity);
  }

  removeEntity(entity: Entity): void {
    this.entities.delete(entity);
  }

  /** Iterate over all entities. */
  forEachEntity(callback: (entity: Entity) => void): void {
    for (const entity of this.entities) {
      callback(entity);
    }
  }

  /** Update all tiles and entities. */
  update(dt: number): void {
    for (const tile of this.tiles.values()) {
      tile.update(dt);
    }
    for (const entity of this.entities) {
      entity.update(dt);
    }
  }

  /**
   * Draw the world. Only tiles and entities within the camera's visible bounds
   * are drawn. Everything is sorted by layer for correct z-ordering.
   */
  draw(ctx: RenderContext): void {
    const bounds = ctx.getVisibleBounds();

    // Collect visible drawables: tiles and entities together for unified layer sorting
    const drawables: { layer: number; draw: () => void }[] = [];

    for (const tile of this.tiles.values()) {
      const tx = tile.position.x;
      const ty = tile.position.y;
      if (tx + 1 >= bounds.minX && tx <= bounds.maxX &&
          ty + 1 >= bounds.minY && ty <= bounds.maxY) {
        drawables.push({
          layer: tile.layer,
          draw: () => {
            ctx.pushTransform({ translation: tile.position });
            tile.draw(ctx);
            ctx.popTransform();
          },
        });
      }
    }

    for (const entity of this.entities) {
      const ex = entity.position.x;
      const ey = entity.position.y;
      if (ex + entity.size.x >= bounds.minX && ex <= bounds.maxX &&
          ey + entity.size.y >= bounds.minY && ey <= bounds.maxY) {
        drawables.push({
          layer: entity.layer,
          draw: () => entity.draw(ctx),
        });
      }
    }

    drawables.sort((a, b) => a.layer - b.layer);

    for (const d of drawables) {
      d.draw();
    }
  }
}
