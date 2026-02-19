import noise from "../engine/perlin.js";
import { Vec2 } from "../engine/vec2.js";
import { World } from "../engine/world.js";
import { Item, ItemId } from "./items.js";
import { GrassTile, NaturalTile, SandTile, StoneTile, WaterTile } from "./tiles.js";
import { Enemy } from "./enemy.js";
import { Bush, PalmTree, Shipwreck, Tallgrass } from "./trees.js";

function subTileOffset(): Vec2 {
    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.random() * 0.4 + 0.1; // 0.1 to 0.5
    return new Vec2(Math.cos(angle) * radius, Math.sin(angle) * radius);
}

function getDryness(x: number, y: number): number {
    let dryness = noise.perlin2((x - 10) * 0.1, y * 0.1) / 2 + 0.5;
    if (y > -50) {
        dryness = Math.max(0, dryness * (1 - (y + 50) * 0.01));
    } else {
        dryness += (-50 - y) * 0.01;
    }
    return dryness;
}

export function generateTile(world: World, x: number, y: number): NaturalTile | null {
    const dryness = getDryness(x, y);

    // Enemy spawning (only in the north, y < -20)
    if (y < -20 && dryness > 0.2 && Math.random() < 0.005) {
        world.addEntity(new Enemy(new Vec2(x + 0.5, y + 0.5), world));
    }

    // Shipwreck spawning (water/sand boundary, y > 0)
    if (Math.abs(x) > 20 && y > 0 && Math.random() < 0.005) {
        const d00 = dryness;
        const d10 = getDryness(x + 1, y);
        const d01 = getDryness(x, y + 1);
        const d11 = getDryness(x + 1, y + 1);
        const values = [d00, d10, d01, d11];
        const hasWater = values.some(d => d < 0.2);
        const hasSand = values.some(d => d >= 0.2 && d < 0.8);
        if (hasWater && hasSand) {
            console.log(`Spawning shipwreck at (${x}, ${y}) with dryness values:`, values);
            world.addEntity(new Shipwreck(new Vec2(x + 1, y + 1), world));
        }
    }

    // Entity spawning
    if (dryness < 0.3 && dryness > 0.2 && Math.random() < 0.01) {
        world.addEntity(new Item(new Vec2(x + 0.5, y + 0.5), world, Math.random() < 0.3 ? ItemId.Rock : ItemId.Stick));
    } else if (dryness > 0.3 && Math.random() < 0.05 * (-y / 100)) {
        world.addEntity(new PalmTree(new Vec2(x + 0.5, y + 0.5), Math.random() < 0.2, world));
    } else if (dryness > 0.2 && Math.random() < 0.04 * (-y / 50)) {
        world.addEntity(new Bush(new Vec2(x + 0.5, y + 0.5).add(subTileOffset())));
    } else if (dryness > 0.8 && Math.random() < Math.max(0.5, 0.05 * (-y / 50))) {
        world.addEntity(new Tallgrass(new Vec2(x + 0.5, y + 0.5).add(subTileOffset())));
    }

    if (dryness < 0.2) {
        return new WaterTile(world, x, y);
    } else if (dryness < 0.8) {
        return new SandTile(world, x, y);
    } else if (dryness < 1.2) {
        return new GrassTile(world, x, y);
    } else {
        return new StoneTile(world, x, y);
    }
}
