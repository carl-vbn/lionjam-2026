import { Flipbook } from "../engine/flipbook.js";
import { getImage } from "../engine/image.js";
import { ParticleSource } from "../engine/particles.js";
import { RenderContext } from "../engine/render-context.js";
import { Tile } from "../engine/tile.js";
import { Vec2 } from "../engine/vec2.js";
import { World } from "../engine/world.js";
import { Player } from "./player.js";
import { ItemId } from "./items.js";
import { sounds } from "./sounds.js";

const txSand = getImage("assets/tiles/sand.png");
const txGrass = getImage("assets/tiles/grass/full.png");
const txGrassWave = getImage("assets/tiles/grass/wave.png");
const txGrassCorner = getImage("assets/tiles/grass/corner.png");
const txGrassInnerCorner = getImage("assets/tiles/grass/icorner.png");
const fpWater = new Flipbook("assets/tiles/water/full.png", 3, 0.2);
const fpWave = new Flipbook("assets/tiles/water/wave.png", 4, 0.8);
const fpWaveCorner = new Flipbook("assets/tiles/water/corner.png", 4, 0.8);
const fpWaveInnerCorner = new Flipbook("assets/tiles/water/icorner.png", 4, 0.8);

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

    getParticleSource(): ParticleSource | null {
        if (!txGrass.complete) return null;
        return { image: txGrass, sx: 0, sy: 0, sw: txGrass.naturalWidth, sh: txGrass.naturalHeight };
    }
}

const txGround = getImage("assets/tiles/ground.png");

export class GroundTile extends NaturalTile {
    get material(): string {
        return "ground";
    }

    private neighborMaterial(dx: number, dy: number): string | undefined {
        const tile = this.world.getTile(this.position.x + dx, this.position.y + dy);
        return tile instanceof NaturalTile ? tile.material : undefined;
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
        ctx.drawImage(txGround, 0, 0, 1, 1);

        const grassTop = this.neighborMaterial(0, -1) === "grass";
        const grassBottom = this.neighborMaterial(0, 1) === "grass";
        const grassLeft = this.neighborMaterial(-1, 0) === "grass";
        const grassRight = this.neighborMaterial(1, 0) === "grass";

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

    onClick(_worldPos: Vec2): void {
        const player = Player.getInstance();
        if (player.isDead) return;
        const tileCenter = this.position.add(new Vec2(0.5, 0.5));
        if (player.position.distanceSquaredTo(tileCenter) > 64) return;

        if (player.isHolding(ItemId.Pot)) {
            player.replaceHeldItem(ItemId.UndrinkablePot);
            sounds.watertake.play();
        }
    }

    getParticleSource(): ParticleSource | null {
        if (!fpWater.loaded) return null;
        return { image: fpWater.image, sx: 0, sy: 0, sw: fpWater.frameWidth, sh: fpWater.frameHeight };
    }
}

const shellSprites = Array.from({ length: 5 }, (_, i) => getImage(`assets/tiles/shells/shell${i}.png`));

export class SandTile extends NaturalTile {
    _wet?: boolean = undefined;
    _shell: {type: number, offset: Vec2, rotation: number} | null = null;

    constructor(world: World, x: number, y: number, dryness: number) {
        super(world, x, y);
        this._shell = Math.random() > 0.1 + 3 * dryness ? {
            type: Math.floor(Math.random() * 5),
            offset: new Vec2(Math.random() * 0.7, Math.random() * 0.7),
            rotation: Math.random() * 2 * Math.PI
        } : null;
    }

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

    getParticleSource(): ParticleSource | null {
        if (!txSand.complete) return null;
        return { image: txSand, sx: 0, sy: 0, sw: txSand.naturalWidth, sh: txSand.naturalHeight };
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

        // Sea shells
        if (this._shell !== null) {
            ctx.pushTransform({ rotation: this._shell.rotation, center: this._shell.offset.add(new Vec2(0.15, 0.15)) });
            ctx.drawImage(shellSprites[this._shell.type], this._shell.offset.x, this._shell.offset.y, 0.3, 0.3);
            ctx.popTransform();
        }

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
