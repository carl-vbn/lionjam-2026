import { Flipbook } from "../engine/flipbook.js";
import { getImage } from "../engine/image.js";
import { RenderContext } from "../engine/render-context.js";
import { Tile } from "../engine/tile.js";
import { Vec2 } from "../engine/vec2.js";
import { World } from "../engine/world.js";

const txSand = getImage("/assets/tiles/sand.png");
const txGrass = getImage("/assets/tiles/grass/full.png");
const txGrassWave = getImage("/assets/tiles/grass/wave.png");
const txGrassCorner = getImage("/assets/tiles/grass/corner.png");
const txGrassInnerCorner = getImage("/assets/tiles/grass/icorner.png");
const fpWater = new Flipbook("/assets/tiles/water/full.png", 3, 0.2);
const fpWave = new Flipbook("/assets/tiles/water/wave.png", 4, 0.8);
const fpWaveCorner = new Flipbook("/assets/tiles/water/corner.png", 4, 0.8);
const fpWaveInnerCorner = new Flipbook("/assets/tiles/water/icorner.png", 4, 0.8);

export abstract class NaturalTile extends Tile {
    world: World;

    constructor(world: World, x: number, y: number) {
        super(x, y);
        this.world = world;
    }

    abstract get material(): string;

    get wet(): boolean {
        return this.material === "water";
    }
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
    constructor(world: World, x: number, y: number) {
        super(world, x, y);
        this.solid = true;
    }

    get material(): string {
        return "water";
    }

    draw(ctx: RenderContext): void {
        ctx.drawFlipbook(fpWater, 0, 0, 1, 1);
    }
}

export class SandTile extends NaturalTile {
    _wet?: boolean = undefined;

    get material(): string {
        return "sand";
    }

    get wet(): boolean {
        if (this._wet === undefined) {
            // Consider sand wet if any neighbor is water
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (this.neighborMaterial(dx, dy) === "water") {
                        this._wet = true;
                        return true;
                    }
                }
            }
            this._wet = false;
        }
        
        return this._wet;
    }

    private neighborMaterial(dx: number, dy: number): string | undefined {
        const tile = this.world.getTile(this.position.x + dx, this.position.y + dy);
        return tile instanceof NaturalTile ? tile.material : undefined;
    }

    private drawRotatedFlipbook(ctx: RenderContext, flipbook: Flipbook, rotation: number): void {
        if (rotation === 0) {
            ctx.drawFlipbook(flipbook, 0, 0, 1, 1);
        } else {
            ctx.pushTransform({ rotation, center: new Vec2(0.5, 0.5) });
            ctx.drawFlipbook(flipbook, 0, 0, 1, 1);
            ctx.popTransform();
        }
    }

    private drawRotatedImage(ctx: RenderContext, image: HTMLImageElement, rotation: number): void {
        if (rotation === 0) {
            ctx.drawImage(image, 0, 0, 1, 1);
        } else {
            ctx.pushTransform({ rotation, center: new Vec2(0.5, 0.5) });
            ctx.drawImage(image, 0, 0, 1, 1);
            ctx.popTransform();
        }
    }

    draw(ctx: RenderContext): void {
        ctx.drawImage(txSand, 0, 0, 1, 1);

        const bottomMat = this.neighborMaterial(0, 1);
        const topMat = this.neighborMaterial(0, -1);
        const leftMat = this.neighborMaterial(-1, 0);
        const rightMat = this.neighborMaterial(1, 0);

        // --- Grass overlays (wave on top, corner top-left, icorner all except bottom-left) ---
        const grassTop = topMat === "grass";
        const grassBottom = bottomMat === "grass";
        const grassLeft = leftMat === "grass";
        const grassRight = rightMat === "grass";

        // Edge overlays
        if (grassTop)    this.drawRotatedImage(ctx, txGrassWave, 0);
        if (grassRight)  this.drawRotatedImage(ctx, txGrassWave, Math.PI / 2);
        if (grassBottom) this.drawRotatedImage(ctx, txGrassWave, Math.PI);
        if (grassLeft)   this.drawRotatedImage(ctx, txGrassWave, -Math.PI / 2);

        // Inner corners (two adjacent edges have grass)
        if (grassTop && grassRight)    this.drawRotatedImage(ctx, txGrassInnerCorner, 0);
        if (grassRight && grassBottom) this.drawRotatedImage(ctx, txGrassInnerCorner, Math.PI / 2);
        if (grassBottom && grassLeft)  this.drawRotatedImage(ctx, txGrassInnerCorner, Math.PI);
        if (grassTop && grassLeft)     this.drawRotatedImage(ctx, txGrassInnerCorner, -Math.PI / 2);

        // Outer corners (diagonal has grass, but neither adjacent cardinal does)
        if (this.neighborMaterial(-1, -1) === "grass" && !grassTop && !grassLeft)      this.drawRotatedImage(ctx, txGrassCorner, 0);
        if (this.neighborMaterial(1, -1) === "grass" && !grassTop && !grassRight)       this.drawRotatedImage(ctx, txGrassCorner, Math.PI / 2);
        if (this.neighborMaterial(1, 1) === "grass" && !grassBottom && !grassRight)     this.drawRotatedImage(ctx, txGrassCorner, Math.PI);
        if (this.neighborMaterial(-1, 1) === "grass" && !grassBottom && !grassLeft)     this.drawRotatedImage(ctx, txGrassCorner, -Math.PI / 2);

        // --- Water overlays (wave on bottom, corner bottom-right, icorner all except upper-right) ---
        const waterBottom = bottomMat === "water";
        const waterTop = topMat === "water";
        const waterLeft = leftMat === "water";
        const waterRight = rightMat === "water";

        // Edge waves
        if (waterBottom) this.drawRotatedFlipbook(ctx, fpWave, 0);
        if (waterRight)  this.drawRotatedFlipbook(ctx, fpWave, -Math.PI / 2);
        if (waterTop)    this.drawRotatedFlipbook(ctx, fpWave, Math.PI);
        if (waterLeft)   this.drawRotatedFlipbook(ctx, fpWave, Math.PI / 2);

        // Inner corners (two adjacent edges have water)
        if (waterLeft && waterBottom)  this.drawRotatedFlipbook(ctx, fpWaveInnerCorner, 0);
        if (waterRight && waterBottom) this.drawRotatedFlipbook(ctx, fpWaveInnerCorner, -Math.PI / 2);
        if (waterRight && waterTop)    this.drawRotatedFlipbook(ctx, fpWaveInnerCorner, Math.PI);
        if (waterLeft && waterTop)     this.drawRotatedFlipbook(ctx, fpWaveInnerCorner, Math.PI / 2);

        // Outer corners (diagonal has water, but neither adjacent cardinal does)
        if (this.neighborMaterial(1, 1) === "water" && !waterBottom && !waterRight)   this.drawRotatedFlipbook(ctx, fpWaveCorner, 0);
        if (this.neighborMaterial(-1, 1) === "water" && !waterBottom && !waterLeft)    this.drawRotatedFlipbook(ctx, fpWaveCorner, Math.PI / 2);
        if (this.neighborMaterial(-1, -1) === "water" && !waterTop && !waterLeft)      this.drawRotatedFlipbook(ctx, fpWaveCorner, Math.PI);
        if (this.neighborMaterial(1, -1) === "water" && !waterTop && !waterRight)      this.drawRotatedFlipbook(ctx, fpWaveCorner, -Math.PI / 2);
    }
}
