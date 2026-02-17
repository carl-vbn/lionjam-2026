import noise from "../engine/perlin.js";
import { World } from "../engine/world.js";
import { GrassTile, NaturalTile, SandTile, StoneTile, WaterTile } from "./tiles.js";

export function generateTile(world: World, x: number, y: number): NaturalTile | null {
    let isWater = false;

    if (y > 0) {
        isWater = noise.perlin2(x * 0.1, y * 0.1) > 1 - y * 0.05;
    } else {
        isWater = noise.perlin2(x * 0.1, y * 0.1) > 0.3;
    }

    if (isWater) {
        return new WaterTile(world, x, y);
    }

    const tileNoise = noise.perlin2(x * 0.1 + 100, y * 0.1 + 100);
    if (tileNoise < -0.2) {
        return new SandTile(world, x, y);
    } else if (tileNoise < 0.2) {
        return new GrassTile(world, x, y);
    } else {
        return new StoneTile(world, x, y);
    }
}
