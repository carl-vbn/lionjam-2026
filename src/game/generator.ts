import noise from "../engine/perlin.js";
import { Vec2 } from "../engine/vec2.js";
import { World } from "../engine/world.js";
import { Item, ItemId } from "./items.js";
import { GrassTile, NaturalTile, SandTile, GroundTile, WaterTile } from "./tiles.js";
import { Enemy } from "./enemy.js";
import { Bush, Jetwreck, MangoTree, PalmTree, Shipwreck, Suitcase, Tallgrass } from "./trees.js";

// A reserved tile is one that has not yet been generated, but where no new
// entity may be spawned when the tile is generated
let reservedTiles = new Set<string>();

// Keep track of large structures (like shipwrecks and jetwrecks) to avoid spawning entities too close to them
let largeStructures: Vec2[] = [new Vec2(0, 0)]; // Spawn point counts as a large structure

function subTileOffset(): Vec2 {
    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.random() * 0.4 + 0.1; // 0.1 to 0.5
    return new Vec2(Math.cos(angle) * radius, Math.sin(angle) * radius);
}

export function getDryness(x: number, y: number): number {
    let dryness = noise.perlin2((x - 10) * 0.1, y * 0.1) / 2 + 0.5;
    if (y > -50) {
        dryness = Math.max(0, dryness * (1 - (y + 50) * 0.01));
    } else {
        dryness += (-50 - y) * 0.01;
    }
    return dryness;
}

function findJetwreckLocation(world: World, x: number, y: number): Vec2 | null {
    // Check for existing large structures nearby to avoid spawning too close
    for (const structPos of largeStructures) {
        if (structPos.distanceTo(new Vec2(x, y)) < 40) {
            return null; // Too close to another large structure
        }
    }

    // Within 10 tiles of the specified location, find an 8 by 8 area of ungenerated tiles
    for (let dx = -10; dx <= 10; dx++) {
        for (let dy = -10; dy <= 10; dy++) {
            const centerX = x + dx;
            const centerY = y + dy;
            let canSpawn = true;
            let freeTiles = [];
            for (let ox = -4; ox <= 4; ox++) {
                for (let oy = -4; oy <= 4; oy++) {
                    if (world.getTile(centerX + ox, centerY + oy) !== null) {
                        canSpawn = false;
                        break;
                    }
                    freeTiles.push(new Vec2(centerX + ox, centerY + oy));
                }
                if (!canSpawn) break;
            }
            if (canSpawn) {
                for (const tilePos of freeTiles) {
                    reservedTiles.add(`${tilePos.x},${tilePos.y}`);
                }

                return new Vec2(centerX + 0.5, centerY + 0.5);
            }
        }
    }
    return null;
}

export function generateTile(world: World, x: number, y: number): NaturalTile | null {
    const dryness = getDryness(x, y);

    if (!reservedTiles.has(`${x},${y}`)) {
        // Enemy spawning (only in the north, y < -20)
        if (y < -20 && dryness > 0.2 && Math.random() < 0.005) {
            world.addEntity(new Enemy(new Vec2(x + 0.5, y + 0.5), world));
        }

        // Shipwreck spawning (water/sand boundary, y > 0)
        if (Math.abs(x) > 0 && y > 0 && Math.random() < 0.01) {
            const d00 = dryness;
            const d10 = getDryness(x + 1, y);
            const d01 = getDryness(x, y + 1);
            const d11 = getDryness(x + 1, y + 1);
            const values = [d00, d10, d01, d11];
            const hasWater = values.some(d => d < 0.2);
            const hasSand = values.some(d => d >= 0.2 && d < 0.8);

            // Check for existing large structures nearby to avoid spawning too close
            let tooClose = false;
            for (const structPos of largeStructures) {
                if (structPos.distanceTo(new Vec2(x, y)) < 10) {
                    tooClose = true;
                    break;
                }
            }

            if (hasWater && hasSand && !tooClose) {
                world.addEntity(new Shipwreck(new Vec2(x + 1, y + 1), world));
                largeStructures.push(new Vec2(x + 1, y + 1));
            }
        }

        // Entity spawning
        if (dryness > 0.2 && Math.random() < 0.01) {
            world.addEntity(new Item(new Vec2(x + 0.5, y + 0.5), world, Math.random() < 0.3 ? ItemId.Rock : ItemId.Stick));
        } else if (dryness > 0.3 && dryness < 1.2 && Math.random() < 0.05 * (-y / 100)) {
            world.addEntity(new PalmTree(new Vec2(x + 0.5, y + 0.5), Math.random() < 0.2, world));
        } else if (dryness > 0.6 && dryness < 1.2 && Math.random() < 0.03 * (-y / 100)) {
            world.addEntity(new MangoTree(new Vec2(x + 0.5, y + 0.5), Math.random() < 0.3, world));
        } else if (dryness > 0.2 && dryness < 1.2 && Math.random() < 0.04 * (-y / 50)) {
            world.addEntity(new Bush(new Vec2(x + 0.5, y + 0.5).add(subTileOffset())));
        } else if (dryness > 0.8 && dryness < 1.2 && Math.random() < Math.max(0.5, 0.05 * (-y / 50))) {
            world.addEntity(new Tallgrass(new Vec2(x + 0.5, y + 0.5).add(subTileOffset())));
        }
    } else {
        reservedTiles.delete(`${x},${y}`); // Clear the reservation for this tile since it's now generated
    }

    // Jetwreck spawning
    if (dryness > 0.8 && Math.random() < 0.005) {
        const spawnLocation = findJetwreckLocation(world, x, y);
        if (spawnLocation) {
            world.addEntity(new Jetwreck(spawnLocation));

            // Randomly spawn suitcases around the jetwreck
            for (let i = 0; i < Math.floor(Math.random() * 3) + 3; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.random() * 3 + 3; // 3 to 6 tiles away
                const position = new Vec2(
                    spawnLocation.x + Math.cos(angle) * radius,
                    spawnLocation.y + Math.sin(angle) * radius
                );
                world.addEntity(new Suitcase(position));
                largeStructures.push(position);
            }
        }
    }

    if (dryness < 0.2) {
        return new WaterTile(world, x, y);
    } else if (dryness < 0.8) {
        return new SandTile(world, x, y);
    } else if (dryness < 1.2) {
        return new GrassTile(world, x, y);
    } else {
        return new GroundTile(world, x, y);
    }
}
