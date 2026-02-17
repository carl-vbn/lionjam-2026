import noise from "../engine/perlin.js";
import { Vec2 } from "../engine/vec2.js";
import { World } from "../engine/world.js";
import { Stick } from "./drops.js";
import { GrassTile, NaturalTile, SandTile, StoneTile, WaterTile } from "./tiles.js";

export function generateTile(world: World, x: number, y: number): NaturalTile | null {
    let dryness = noise.perlin2(x * 0.1, y * 0.1) / 2 + 0.5;

    if (y > -50) {
        dryness = Math.max(0, dryness * (1 - (y + 50) * 0.01));
    } else {
        dryness += (-50 - y) * 0.01;
    }

    // Entity spawning
    if (dryness < 0.3 && dryness > 0.2 && Math.random() < 0.01) {
        // Spawn stick
        world.addEntity(new Stick(new Vec2(x + 0.5, y + 0.5)));
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
