import { Flipbook } from "../engine/flipbook.js";
import { RenderContext } from "../engine/render-context.js";
import { Tile } from "../engine/tile.js";
import { World } from "../engine/world.js";

export function getImage(url: string): HTMLImageElement {
    const img = new Image();
    img.src = url;
    return img;
}

const txSand = getImage("/assets/tiles/sand.png");
const txGrass = getImage("/assets/tiles/grass.png");
const txBeach = getImage("/assets/tiles/beach.png");
const fpWater = new Flipbook("/assets/tiles/water.png", 3, 0.2);

export abstract class NaturalTile extends Tile {
    world: World;
    

    constructor(world: World, x: number, y: number) {
        super(x, y);
        this.world = world;
    }

    abstract get material(): string;
}

export class GrassTile extends NaturalTile {
    get material(): string {
        return "grass";
    }

    draw(ctx: RenderContext): void {
        ctx.drawImage(txGrass, 0, 0, 1, 1);
    }
}

export class StoneTile extends NaturalTile {
    get material(): string {
        return "stone";
    }

    draw(ctx: RenderContext): void {
        ctx.fillRect(0, 0, 1, 1, "#888888");
        ctx.fillRect(0.1, 0.1, 0.35, 0.35, "#777777");
        ctx.fillRect(0.55, 0.5, 0.35, 0.4, "#777777");
        ctx.strokeRect(0, 0, 1, 1, "#666666", 0.03);
    }
}

export class WaterTile extends NaturalTile {
    get material(): string {
        return "water";
    }

    draw(ctx: RenderContext): void {
        ctx.drawFlipbook(fpWater, 0, 0, 1, 1);
    }
}

export class SandTile extends NaturalTile {
    get material(): string {
        return "sand";
    }

    draw(ctx: RenderContext): void {
        const tileBelow = this.world.getTile(this.position.x, this.position.y + 1);
        if (tileBelow instanceof NaturalTile && tileBelow.material === "water") {
            ctx.drawImage(txBeach, 0, 0, 1, 1);
        } else {
            ctx.drawImage(txSand, 0, 0, 1, 1);
        }
    }
}
