import { Entity, Flipbook, InputHandler, ParticleSource, RenderContext, Vec2, World } from "../engine/index.js";
import { createWhiteSilhouette, getImage } from "../engine/image.js";
import { Item, ItemId } from "./items.js";
import { Player } from "./player.js";

const fpBush = new Flipbook("/assets/entities/bush.png", 2, 0.75);
const txTallgrassLong = getImage("/assets/entities/tallgrass/long.png");
const txTallgrassShort = getImage("/assets/entities/tallgrass/short.png");
const txSpike = getImage("/assets/ui/spike.png");

const palmTreeAssets = {
    normal: new Flipbook("/assets/entities/palmtree/palm.png", 2, 0.75),
    coconuts: new Flipbook("/assets/entities/palmtree/palmcoconut.png", 2, 0.75),
    coconutsHighlighted: new Flipbook("/assets/entities/palmtree/palmcoconut.png", 2, 0.75, { width: 2, color: "cyan" }),
    coconutsSelected: new Flipbook("/assets/entities/palmtree/palmcoconut.png", 2, 0.75, { width: 2, color: "lime" }),
    silhouette: new Image(),
};

createWhiteSilhouette(getImage("/assets/entities/palmtree/palm.png")).then((silhouette) => {
    palmTreeAssets.silhouette = silhouette;
});

export class PalmTree extends Entity {
    hasCoconuts = false;
    highlighted = false;
    flashTimer = 0;
    private world: World;

    constructor(position: Vec2, hasCoconuts: boolean, world: World) {
        super(position);
        this.layer = 1;
        this.size = new Vec2(1, 3);
        this.hasCoconuts = hasCoconuts;
        this.world = world;
    }

    get clickable(): boolean {
        return this.hasCoconuts && this.highlighted;
    }

    getParticleSource(): ParticleSource | null {
        const img = palmTreeAssets.coconuts.image;
        if (!palmTreeAssets.coconuts.loaded) return null;
        const fw = palmTreeAssets.coconuts.frameWidth;
        const fh = palmTreeAssets.coconuts.frameHeight;
        return { image: img, sx: 0, sy: 0, sw: fw, sh: fh };
    }

    draw(ctx: RenderContext): void {
        // Shadow
        ctx.fillEllipse(this.position.x, this.position.y - 0.25, 0.5, 0.25, "rgba(0, 0, 0, 0.25)");

        if (this.flashTimer > 0) {
            ctx.drawImageRegion(palmTreeAssets.silhouette, 0, 0, palmTreeAssets.silhouette.naturalWidth / 2, palmTreeAssets.silhouette.naturalHeight, this.position.x - 1, this.position.y - 2, 2, 2);
        } else {
            const { worldPos: mousePos } = InputHandler.getInstance().getMousePos();

            let hovered = Math.abs(mousePos.x - this.position.x) < 0.6 && mousePos.y < this.position.y && mousePos.y > this.position.y - 2;

            const flipbook = this.highlighted ? hovered ? palmTreeAssets.coconutsSelected : palmTreeAssets.coconutsHighlighted : this.hasCoconuts ? palmTreeAssets.coconuts : palmTreeAssets.normal;
            ctx.drawFlipbook(flipbook, this.position.x - 1, this.position.y - 2, 2, 2);
        }

        // UI
        if (this.highlighted) {
            ctx.ctx.imageSmoothingEnabled = true;
            ctx.drawImage(txSpike, this.position.x - 0.125, this.position.y - 2, 0.25, 0.13);
            ctx.fillRect(this.position.x - 0.5, this.position.y - 2.3, 1, 0.3, "rgba(0, 0, 0, 0.75)");
            ctx.drawText("Shake", this.position.x, this.position.y - 2.38, {
                align: "center",
                baseline: "middle",
                size: 0.15,
                color: "white",
            });
            ctx.ctx.imageSmoothingEnabled = false;
        }
    }

    onClick(_worldPos: Vec2): void {
        if (this.hasCoconuts && this.highlighted) {
            this.hasCoconuts = false;
            this.flashTimer = 0.2;

            // Spawn 1-3 coconut items around the base
            const count = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 0.3 + Math.random() * 0.5;
                const landPos = this.position.add(new Vec2(Math.cos(angle) * radius, Math.sin(angle) * radius));
                const coconut = new Item(landPos, this.world, ItemId.Coconut, this.position);
                this.world.addEntity(coconut);
            }
        }
    }

    update(dt: number): void {
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            if (this.flashTimer < 0) {
                this.flashTimer = 0;
            }
        }

        this.highlighted = this.hasCoconuts && Player.getInstance().position.distanceSquaredTo(this.position) < 16;
    }
}

export class Bush extends Entity {
    constructor(position: Vec2) {
        super(position);
        this.layer = 1;
        this.size = new Vec2(1, 1);
    }

    draw(ctx: RenderContext): void {
        ctx.drawFlipbook(fpBush, this.position.x - 0.5, this.position.y - 0.5, 1, 1);
    }
}

export class Tallgrass extends Entity {
    isTall: boolean;

    constructor(position: Vec2) {
        super(position);
        this.layer = 0;
        this.isTall = Math.random() < 0.2;
    }

    draw(ctx: RenderContext): void {
        ctx.drawImage(this.isTall ? txTallgrassLong : txTallgrassShort, this.position.x - 0.5, this.position.y - 0.5, 1, 1);
    }
}