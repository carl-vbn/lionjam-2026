import { attachHint, Entity, Flipbook, HintHandle, InputHandler, ParticleSource, ParticleSystem, RenderContext, Vec2, World } from "../engine/index.js";
import { createOutlinedImage, createWhiteSilhouette, getImage } from "../engine/image.js";
import { dropItems, ItemId } from "./items.js";
import { Player } from "./player.js";
import { getSelectedSlot } from "./ui.js";

const fpBush = new Flipbook("/assets/entities/bush.png", 2, 0.75);
const txTallgrassLong = getImage("/assets/entities/tallgrass/long.png");
const txTallgrassShort = getImage("/assets/entities/tallgrass/short.png");

let shakeHintShown = false;
let lootHintShown = false;
let chopHintShown = false;

const palmTreeAssets = {
    normal: new Flipbook("/assets/entities/palmtree/palm.png", 2, 0.75),
    normalHighlighted: new Flipbook("/assets/entities/palmtree/palm.png", 2, 0.75, { width: 2, color: "cyan" }),
    normalSelected: new Flipbook("/assets/entities/palmtree/palm.png", 2, 0.75, { width: 2, color: "lime" }),
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
    chopHighlighted = false;
    destroyed = false;
    flashTimer = 0;
    private world: World;
    private hintHandle: HintHandle | null = null;

    constructor(position: Vec2, hasCoconuts: boolean, world: World) {
        super(position);
        this.layer = 1;
        this.size = new Vec2(1, 3);
        this.hasCoconuts = hasCoconuts;
        this.world = world;
    }

    get clickable(): boolean {
        return this.highlighted || this.chopHighlighted;
    }

    getParticleSource(): ParticleSource | null {
        const img = palmTreeAssets.coconuts.image;
        if (!palmTreeAssets.coconuts.loaded) return null;
        const fw = palmTreeAssets.coconuts.frameWidth;
        const fh = palmTreeAssets.coconuts.frameHeight;
        return { image: img, sx: 0, sy: 0, sw: fw, sh: fh };
    }

    draw(ctx: RenderContext): void {
        if (this.destroyed) return;

        // Shadow
        ctx.fillEllipse(this.position.x, this.position.y - 0.25, 0.5, 0.25, "rgba(0, 0, 0, 0.25)");

        if (this.flashTimer > 0) {
            ctx.drawImageRegion(palmTreeAssets.silhouette, 0, 0, palmTreeAssets.silhouette.naturalWidth / 2, palmTreeAssets.silhouette.naturalHeight, this.position.x - 1, this.position.y - 2, 2, 2);
        } else {
            const { worldPos: mousePos } = InputHandler.getInstance().getMousePos();
            const hovered = Math.abs(mousePos.x - this.position.x) < 0.6 && mousePos.y < this.position.y && mousePos.y > this.position.y - 2;

            let flipbook;
            if (this.chopHighlighted) {
                if (this.hasCoconuts) {
                    flipbook = hovered ? palmTreeAssets.coconutsSelected : palmTreeAssets.coconutsHighlighted;
                } else {
                    flipbook = hovered ? palmTreeAssets.normalSelected : palmTreeAssets.normalHighlighted;
                }
            } else {
                flipbook = this.highlighted
                    ? hovered ? palmTreeAssets.coconutsSelected : palmTreeAssets.coconutsHighlighted
                    : this.hasCoconuts ? palmTreeAssets.coconuts : palmTreeAssets.normal;
            }
            ctx.drawFlipbook(flipbook, this.position.x - 1, this.position.y - 2, 2, 2);
        }

    }

    onClick(_worldPos: Vec2): void {
        if (this.chopHighlighted) {
            this.flashTimer = 0.2;

            if (this.hasCoconuts) {
                const coconutCount = 1 + Math.floor(Math.random() * 3);
                dropItems(this.world, this.position, { [ItemId.Coconut]: coconutCount });
            }

            const logCount = 1 + Math.floor(Math.random() * 3); // 1-3 logs
            dropItems(this.world, this.position, { [ItemId.Log]: logCount });

            if (this.hintHandle) {
                this.hintHandle.destroy();
                this.hintHandle = null;
            }
            this.destroyed = true;
        } else if (this.hasCoconuts && this.highlighted) {
            this.hasCoconuts = false;
            this.flashTimer = 0.2;

            // Spawn 1-3 coconut items around the base
            const count = 1 + Math.floor(Math.random() * 3);
            dropItems(this.world, this.position, { [ItemId.Coconut]: count });
        }
    }

    update(dt: number): void {
        if (this.destroyed) {
            this.world.removeEntity(this);
            return;
        }

        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            if (this.flashTimer < 0) this.flashTimer = 0;
        }

        const player = Player.getInstance();
        const near = player.position.distanceSquaredTo(this.position) < 16;
        const slot = getSelectedSlot();
        const holdingAxe = near && slot >= 0 && slot < player.inventory.length && player.inventory[slot].item === ItemId.Axe;

        const prevChopHighlighted = this.chopHighlighted;
        const prevHighlighted = this.highlighted;

        this.chopHighlighted = holdingAxe;
        this.highlighted = near && this.hasCoconuts && !holdingAxe;

        const anyHighlighted = this.highlighted || this.chopHighlighted;
        const prevAnyHighlighted = prevHighlighted || prevChopHighlighted;

        if (this.chopHighlighted && !prevChopHighlighted) {
            if (this.hintHandle) { this.hintHandle.destroy(); this.hintHandle = null; }
            if (!chopHintShown) {
                this.hintHandle = attachHint(this, "Chop", this.world);
                chopHintShown = true;
            }
        } else if (this.highlighted && !prevHighlighted && !shakeHintShown) {
            this.hintHandle = attachHint(this, "Shake", this.world);
            shakeHintShown = true;
        } else if (!anyHighlighted && prevAnyHighlighted && this.hintHandle) {
            this.hintHandle.destroy();
            this.hintHandle = null;
        }

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
        this.layer = 0;
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

            const ropeCount = 2 + Math.floor(Math.random() * 4);
            const items: {[key in ItemId]?: number} = { [ItemId.Rope]: ropeCount };

            if (Math.random() < 0.5) {
                items[ItemId.Pot] = 1;
            }

            if (Math.random() < 0.5) {
                items[ItemId.MagGlass] = 1;
            }

            dropItems(this.world, this.position.add(new Vec2(0, -2)), items);

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

const txJet = getImage("/assets/entities/jet.png");
const txSuitcase = getImage("/assets/entities/suitcase.png");

let txSuitcaseHighlighted: HTMLImageElement = txSuitcase;
let txSuitcaseSelected: HTMLImageElement = txSuitcase;

createOutlinedImage(txSuitcase, 2, "cyan").then((img) => { txSuitcaseHighlighted = img; });
createOutlinedImage(txSuitcase, 2, "lime").then((img) => { txSuitcaseSelected = img; });

export class Jetwreck extends Entity {
    constructor(position: Vec2) {
        super(position);
        this.layer = 1;
        this.size = new Vec2(8, 4);
    }

    draw(ctx: RenderContext): void {
        ctx.drawImage(txJet, this.position.x - 4, this.position.y - 6, 8, 8);
    }
}

export class Suitcase extends Entity {
    highlighted = false;

    constructor(position: Vec2) {
        super(position);
        this.layer = 1;
        this.size = new Vec2(1, 1);
    }
    
    draw(ctx: RenderContext): void {
        // Shadow
        ctx.fillEllipse(this.position.x, this.position.y - 0.4, 0.5, 0.25, "rgba(0, 0, 0, 0.25)");

        const { worldPos: mousePos } = InputHandler.getInstance().getMousePos();
        const hovered = Math.abs(mousePos.x - this.position.x) < 0.6 && mousePos.y < this.position.y && mousePos.y > this.position.y - 1;

        let sprite = this.highlighted ? (hovered ? txSuitcaseSelected : txSuitcaseHighlighted) : txSuitcase;
        ctx.drawImage(sprite, this.position.x - 0.5, this.position.y - 1, 1, 1);
    }

    update(_dt: number): void {
        const player = Player.getInstance();
        const near = player.position.distanceSquaredTo(this.position) < 4;
        this.highlighted = near;
    }

    onClick(_worldPos: Vec2): void {
        if (this.highlighted) {
            const world = Player.getInstance().world;

            const possibleItems = [
                ItemId.MagGlass,
                ItemId.Pot,
                ItemId.Rope,
                ItemId.Waterbottle,
                ItemId.Medkit
            ]
            const dropCount = Math.random() < 0.5 ? 2 : 1;
            const items: {[key in ItemId]?: number} = {};

            for (let i = 0; i<dropCount; i++) {
                const chosenItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
                items[chosenItem] = (items[chosenItem] || 0) + 1;
            }

            dropItems(world, this.position, items);
            world.removeEntity(this);
        }
    }

    get clickable(): boolean {
        return this.highlighted;
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

const txPlaneCrash = getImage("/assets/entities/plane.png");
const fpPlaneSmoke = new Flipbook("/assets/entities/smoke.png", 2, 0.5);

export class CrashSite extends Entity {
    constructor(position: Vec2) {
        super(position);
        this.layer = 0;
        this.size = new Vec2(4, 4);
    }

    draw(ctx: RenderContext): void {
        ctx.fillEllipse(this.position.x, this.position.y - 0.5, 2, 1, "rgba(0, 0, 0, 0.25)");
        ctx.drawImage(txPlaneCrash, this.position.x - 2, this.position.y - 3, 4, 4);
        ctx.drawFlipbook(fpPlaneSmoke, this.position.x - 2, this.position.y - 4, 4, 4);
    }
}