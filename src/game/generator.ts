import noise from "../engine/perlin.js";
import { Vec2 } from "../engine/vec2.js";
import { World } from "../engine/world.js";
import { Stick } from "./drops.js";
import { GrassTile, NaturalTile, SandTile, StoneTile, WaterTile } from "./tiles.js";
import { Bush, PalmTree, Tallgrass } from "./trees.js";

function subTileOffset(): Vec2 {
    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.random() * 0.4 + 0.1; // 0.1 to 0.5
    return new Vec2(Math.cos(angle) * radius, Math.sin(angle) * radius);
}

export function generateTile(world: World, x: number, y: number): NaturalTile | null {
    let dryness = noise.perlin2(x * 0.1, y * 0.1) / 2 + 0.5;

    if (y > -50) {
        dryness = Math.max(0, dryness * (1 - (y + 50) * 0.01));
    } else {
        dryness += (-50 - y) * 0.01;
    }

    // Entity spawning
    if (dryness < 0.3 && dryness > 0.2 && Math.random() < 0.01) {
        world.addEntity(new Stick(new Vec2(x + 0.5, y + 0.5)));
    } else if (dryness > 0.3 && Math.random() < 0.05 * (-y / 100)) {
        world.addEntity(new PalmTree(new Vec2(x + 0.5, y + 0.5)));
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
