import { attachHint, Entity, Flipbook, HintHandle, InputHandler, ParticleSource, RenderContext, Vec2, World } from "../engine/index.js";
import { createOutlinedImage, createWhiteSilhouette, getImage } from "../engine/image.js";
import { dropItems, ItemId } from "./items.js";
import { Player } from "./player.js";

const fpBush = new Flipbook("/assets/entities/bush.png", 2, 0.75);
const txTallgrassLong = getImage("/assets/entities/tallgrass/long.png");
const txTallgrassShort = getImage("/assets/entities/tallgrass/short.png");

let shakeHintShown = false;
let lootHintShown = false;

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
    private hintHandle: HintHandle | null = null;
    private wasHighlighted = false;

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

    }

    onClick(_worldPos: Vec2): void {
        if (this.hasCoconuts && this.highlighted) {
            this.hasCoconuts = false;
            this.flashTimer = 0.2;

            // Spawn 1-3 coconut items around the base
            const count = 1 + Math.floor(Math.random() * 3);
            dropItems(this.world, this.position, { [ItemId.Coconut]: count });
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

        if (this.highlighted && !this.wasHighlighted && !shakeHintShown) {
            this.hintHandle = attachHint(this, "Shake", this.world);
            shakeHintShown = true;
        } else if (!this.highlighted && this.wasHighlighted && this.hintHandle) {
            this.hintHandle.destroy();
            this.hintHandle = null;
        }
        this.wasHighlighted = this.highlighted;
    }
}

const txShipwreck = getImage("/assets/entities/shipwreck.png");
const txShipwreckLooted = getImage("/assets/entities/shipwreck_looted.png");
const shipwreckAssets: {
    highlighted: HTMLImageElement | null;
    selected: HTMLImageElement | null;
    silhouette: HTMLImageElement | null;
} = { highlighted: null, selected: null, silhouette: null };

createOutlinedImage(txShipwreck, 2, "cyan").then((img) => { shipwreckAssets.highlighted = img; });
createOutlinedImage(txShipwreck, 2, "lime").then((img) => { shipwreckAssets.selected = img; });
createWhiteSilhouette(txShipwreck).then((img) => { shipwreckAssets.silhouette = img; });

export class Shipwreck extends Entity {
    private world: World;
    private looted = false;
    private highlighted = false;
    private flashTimer = 0;
    private hintHandle: HintHandle | null = null;
    private wasHighlighted = false;

    constructor(position: Vec2, world: World) {
        super(position);
        this.world = world;
        this.layer = 1;
        this.size = new Vec2(8, 8);
    }

    get clickable(): boolean {
        return !this.looted && this.highlighted;
    }

    getParticleSource(): ParticleSource | null {
        if (!txShipwreck.naturalWidth) return null;
        return { image: txShipwreck, sx: 0, sy: 0, sw: txShipwreck.naturalWidth, sh: txShipwreck.naturalHeight };
    }

    draw(ctx: RenderContext): void {
        let drawW = 8;
        let drawH = 8;
        let drawX = this.position.x - 4;
        let drawY = this.position.y - 8;
        if (this.flashTimer > 0 && shipwreckAssets.silhouette) {
            ctx.drawImage(shipwreckAssets.silhouette, drawX, drawY, drawW, drawH);
        } else if (this.looted) {
            ctx.drawImage(txShipwreckLooted, drawX, drawY, drawW, drawH);
        } else {
            const { worldPos: mousePos } = InputHandler.getInstance().getMousePos();
            const hovered = Math.abs(mousePos.x - this.position.x) < 4 && mousePos.y < this.position.y && mousePos.y > this.position.y - 8;

            let sprite: HTMLImageElement = txShipwreck;
            if (this.highlighted && hovered && shipwreckAssets.selected) {
                sprite = shipwreckAssets.selected;
            } else if (this.highlighted && shipwreckAssets.highlighted) {
                sprite = shipwreckAssets.highlighted;
            }

            ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
        }
    }

    onClick(_worldPos: Vec2): void {
        if (!this.looted && this.highlighted) {
            this.looted = true;
            this.flashTimer = 0.2;

            const count = 2 + Math.floor(Math.random() * 4);
            dropItems(this.world, this.position, { [ItemId.Rope]: count });

            if (this.hintHandle) {
                this.hintHandle.destroy();
                this.hintHandle = null;
            }
        }
    }

    update(dt: number): void {
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            if (this.flashTimer < 0) this.flashTimer = 0;
        }

        this.highlighted = !this.looted && Player.getInstance().position.distanceSquaredTo(this.position) < 25;

        if (this.highlighted && !this.wasHighlighted && !lootHintShown) {
            this.hintHandle = attachHint(this, "Loot", this.world, new Vec2(0, -2));
            lootHintShown = true;
        } else if (!this.highlighted && this.wasHighlighted && this.hintHandle) {
            this.hintHandle.destroy();
            this.hintHandle = null;
        }
        this.wasHighlighted = this.highlighted;
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