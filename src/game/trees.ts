import { attachHint, Entity, Flipbook, HintHandle, InputHandler, ParticleSource, ParticleSystem, RenderContext, Vec2, World } from "../engine/index.js";
import { createOutlinedImage, createWhiteSilhouette, getImage } from "../engine/image.js";
import { dropItems, ItemId } from "./items.js";
import { openNextNote, outpostNote, releaseNote, tryClaimNote } from "./notes.js";
import { Player } from "./player.js";
import { getSelectedSlot, setOpenNote } from "./ui.js";
import { sounds } from "./sounds.js";

const fpBush = new Flipbook("assets/entities/bush.png", 2, 0.75);
const txTallgrassLong = getImage("assets/entities/tallgrass/long.png");
const txTallgrassShort = getImage("assets/entities/tallgrass/short.png");

let shakeHintShown = false;
let mangoShakeHintShown = false;
let lootHintShown = false;
let chopHintShown = false;
let mangoChopHintShown = false;

const palmTreeAssets = {
    normal: new Flipbook("assets/entities/palmtree/palm.png", 2, 0.75),
    normalHighlighted: new Flipbook("assets/entities/palmtree/palm.png", 2, 0.75, { width: 2, color: "cyan" }),
    normalSelected: new Flipbook("assets/entities/palmtree/palm.png", 2, 0.75, { width: 2, color: "lime" }),
    coconuts: new Flipbook("assets/entities/palmtree/palmcoconut.png", 2, 0.75),
    coconutsHighlighted: new Flipbook("assets/entities/palmtree/palmcoconut.png", 2, 0.75, { width: 2, color: "cyan" }),
    coconutsSelected: new Flipbook("assets/entities/palmtree/palmcoconut.png", 2, 0.75, { width: 2, color: "lime" }),
    silhouette: new Image(),
};

createWhiteSilhouette(getImage("assets/entities/palmtree/palm.png")).then((silhouette) => {
    palmTreeAssets.silhouette = silhouette;
});

const txTreeNote = getImage("assets/entities/notes/note_tree.png");
let txTreeNoteOutlined: HTMLImageElement = txTreeNote;
createOutlinedImage(txTreeNote, 2, "cyan").then((img) => { txTreeNoteOutlined = img; });

export class PalmTree extends Entity {
    hasCoconuts = false;
    highlighted = false;
    chopHighlighted = false;
    noteHighlighted = false;
    destroyed = false;
    flashTimer = 0;
    hasNote = false;
    private world: World;
    private hintHandle: HintHandle | null = null;

    constructor(position: Vec2, hasCoconuts: boolean, world: World) {
        super(position);
        this.layer = 1;
        this.size = new Vec2(1, 3);
        this.hasCoconuts = hasCoconuts;
        this.world = world;
        this.hasNote = tryClaimNote(position.lengthSquared());
    }

    get clickable(): boolean {
        return this.highlighted || this.chopHighlighted || this.noteHighlighted;
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

            if (this.hasNote) {
                const noteTx = this.noteHighlighted ? txTreeNoteOutlined : txTreeNote;
                const baseW = 0.2, baseH = 0.2, baseX = this.position.x - 0.15, baseY = this.position.y - 0.8;
                if (noteTx !== txTreeNote && txTreeNote.naturalWidth > 0) {
                    const scale = noteTx.naturalWidth / txTreeNote.naturalWidth;
                    const w = baseW * scale, h = baseH * scale;
                    ctx.drawImage(noteTx, baseX - (w - baseW) / 2, baseY - (h - baseH) / 2, w, h);
                } else {
                    ctx.drawImage(noteTx, baseX, baseY, baseW, baseH);
                }
            }
        }

    }

    onClick(_worldPos: Vec2): void {
        if (this.hasNote && this.noteHighlighted) {
            this.hasNote = false;
            setOpenNote(openNextNote());
            return;
        }
        if (this.chopHighlighted) {
            Player.getInstance().swingItem();
            this.flashTimer = 0.2;
            sounds.chop.play();
            
            const drops: Partial<Record<ItemId, number>> = {};
            if (this.hasCoconuts) {
                const coconutCount = 1 + Math.floor(Math.random() * 2);
                drops[ItemId.Coconut] = coconutCount;
            }

            const logCount = 1 + Math.floor(Math.random() * 3); // 1-3 logs
            drops[ItemId.Log] = logCount;
            if (Math.random() < 0.3) drops[ItemId.Stick] = 1;
            dropItems(this.world, this.position, drops);

            if (this.hintHandle) {
                this.hintHandle.destroy();
                this.hintHandle = null;
            }
            this.destroyed = true;
        } else if (this.hasCoconuts && this.highlighted) {
            this.hasCoconuts = false;
            this.flashTimer = 0.2;
            sounds.treeshake.play();

            // Spawn 1-2 coconut items around the base
            const count = 1 + Math.floor(Math.random() * 2);
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

        if (this.hasNote && player.position.distanceSquaredTo(this.position) > 30 * 30) {
            this.hasNote = false;
            releaseNote();
        }

        const prevChopHighlighted = this.chopHighlighted;
        const prevHighlighted = this.highlighted;

        if (this.hasNote) {
            this.noteHighlighted = near;
            this.chopHighlighted = false;
            this.highlighted = false;
            if ((prevChopHighlighted || prevHighlighted) && this.hintHandle) {
                this.hintHandle.destroy();
                this.hintHandle = null;
            }
            return;
        }

        this.noteHighlighted = false;
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

const mangoTreeAssets = {
    normal: new Flipbook("assets/entities/mangotree/mangotree.png", 2, 0.75),
    normalHighlighted: new Flipbook("assets/entities/mangotree/mangotree.png", 2, 0.75, { width: 2, color: "cyan" }),
    normalSelected: new Flipbook("assets/entities/mangotree/mangotree.png", 2, 0.75, { width: 2, color: "lime" }),
    mangoes: new Flipbook("assets/entities/mangotree/mangotree_mango.png", 2, 0.75),
    mangoesHighlighted: new Flipbook("assets/entities/mangotree/mangotree_mango.png", 2, 0.75, { width: 2, color: "cyan" }),
    mangoesSelected: new Flipbook("assets/entities/mangotree/mangotree_mango.png", 2, 0.75, { width: 2, color: "lime" }),
    silhouette: new Image(),
};

createWhiteSilhouette(getImage("assets/entities/mangotree/mangotree.png")).then((silhouette) => {
    mangoTreeAssets.silhouette = silhouette;
});

export class MangoTree extends Entity {
    hasMangoes = false;
    highlighted = false;
    chopHighlighted = false;
    noteHighlighted = false;
    destroyed = false;
    flashTimer = 0;
    hasNote = false;
    private world: World;
    private hintHandle: HintHandle | null = null;

    constructor(position: Vec2, hasMangoes: boolean, world: World) {
        super(position);
        this.layer = 1;
        this.size = new Vec2(1.75, 5.25);
        this.hasMangoes = hasMangoes;
        this.world = world;
        this.hasNote = tryClaimNote(position.lengthSquared());
    }

    get clickable(): boolean {
        return this.highlighted || this.chopHighlighted || this.noteHighlighted;
    }

    getParticleSource(): ParticleSource | null {
        const img = mangoTreeAssets.mangoes.image;
        if (!mangoTreeAssets.mangoes.loaded) return null;
        const fw = mangoTreeAssets.mangoes.frameWidth;
        const fh = mangoTreeAssets.mangoes.frameHeight;
        return { image: img, sx: 0, sy: 0, sw: fw, sh: fh };
    }

    draw(ctx: RenderContext): void {
        if (this.destroyed) return;

        ctx.fillEllipse(this.position.x, this.position.y - 0.25, 0.875, 0.4375, "rgba(0, 0, 0, 0.25)");

        if (this.flashTimer > 0) {
            ctx.drawImageRegion(mangoTreeAssets.silhouette, 0, 0, mangoTreeAssets.silhouette.naturalWidth / 2, mangoTreeAssets.silhouette.naturalHeight, this.position.x - 1.75, this.position.y - 3.5, 3.5, 3.5);
        } else {
            const { worldPos: mousePos } = InputHandler.getInstance().getMousePos();
            const hovered = Math.abs(mousePos.x - this.position.x) < 1.05 && mousePos.y < this.position.y && mousePos.y > this.position.y - 3.5;

            let flipbook;
            if (this.chopHighlighted) {
                if (this.hasMangoes) {
                    flipbook = hovered ? mangoTreeAssets.mangoesSelected : mangoTreeAssets.mangoesHighlighted;
                } else {
                    flipbook = hovered ? mangoTreeAssets.normalSelected : mangoTreeAssets.normalHighlighted;
                }
            } else {
                flipbook = this.highlighted
                    ? hovered ? mangoTreeAssets.mangoesSelected : mangoTreeAssets.mangoesHighlighted
                    : this.hasMangoes ? mangoTreeAssets.mangoes : mangoTreeAssets.normal;
            }
            ctx.drawFlipbook(flipbook, this.position.x - 1.75, this.position.y - 3.5, 3.5, 3.5);

            if (this.hasNote) {
                const noteTx = this.noteHighlighted ? txTreeNoteOutlined : txTreeNote;
                const baseW = 0.2, baseH = 0.2, baseX = this.position.x - 0.2, baseY = this.position.y - 1;
                if (noteTx !== txTreeNote && txTreeNote.naturalWidth > 0) {
                    const scale = noteTx.naturalWidth / txTreeNote.naturalWidth;
                    const w = baseW * scale, h = baseH * scale;
                    ctx.drawImage(noteTx, baseX - (w - baseW) / 2, baseY - (h - baseH) / 2, w, h);
                } else {
                    ctx.drawImage(noteTx, baseX, baseY, baseW, baseH);
                }
            }
        }
    }

    onClick(_worldPos: Vec2): void {
        if (this.hasNote && this.noteHighlighted) {
            this.hasNote = false;
            setOpenNote(openNextNote());
            return;
        }
        if (this.chopHighlighted) {
            Player.getInstance().swingItem();
            this.flashTimer = 0.2;
            sounds.chop.play();

            const drops: Partial<Record<ItemId, number>> = {};

            if (this.hasMangoes) {
                const mangoCount = 1 + Math.floor(Math.random() * 2);
                drops[ItemId.Mango] = mangoCount;
            }

            const logCount = 1 + Math.floor(Math.random() * 3);
            drops[ItemId.Log] = logCount;

            if (Math.random() < 0.3) drops[ItemId.Stick] = 1 + Math.floor(Math.random() * 3);

            dropItems(this.world, this.position, drops);

            if (this.hintHandle) {
                this.hintHandle.destroy();
                this.hintHandle = null;
            }
            this.destroyed = true;
        } else if (this.hasMangoes && this.highlighted) {
            this.hasMangoes = false;
            this.flashTimer = 0.2;
            sounds.treeshake.play();

            const count = 1 + Math.floor(Math.random() * 2);
            dropItems(this.world, this.position, { [ItemId.Mango]: count });
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

        if (this.hasNote && player.position.distanceSquaredTo(this.position) > 30 * 30) {
            this.hasNote = false;
            releaseNote();
        }

        const prevChopHighlighted = this.chopHighlighted;
        const prevHighlighted = this.highlighted;

        if (this.hasNote) {
            this.noteHighlighted = near;
            this.chopHighlighted = false;
            this.highlighted = false;
            if ((prevChopHighlighted || prevHighlighted) && this.hintHandle) {
                this.hintHandle.destroy();
                this.hintHandle = null;
            }
            return;
        }

        this.noteHighlighted = false;
        this.chopHighlighted = holdingAxe;
        this.highlighted = near && this.hasMangoes && !holdingAxe;

        const anyHighlighted = this.highlighted || this.chopHighlighted;
        const prevAnyHighlighted = prevHighlighted || prevChopHighlighted;

        if (this.chopHighlighted && !prevChopHighlighted) {
            if (this.hintHandle) { this.hintHandle.destroy(); this.hintHandle = null; }
            if (!mangoChopHintShown) {
                this.hintHandle = attachHint(this, "Chop", this.world);
                mangoChopHintShown = true;
            }
        } else if (this.highlighted && !prevHighlighted && !mangoShakeHintShown) {
            this.hintHandle = attachHint(this, "Shake", this.world);
            mangoShakeHintShown = true;
        } else if (!anyHighlighted && prevAnyHighlighted && this.hintHandle) {
            this.hintHandle.destroy();
            this.hintHandle = null;
        }
    }
}

const txShipwreck = getImage("assets/entities/shipwreck.png");
const txShipwreckLooted = getImage("assets/entities/shipwreck_looted.png");
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
            sounds.loot.play();

            const ropeCount = 2 + Math.floor(Math.random() * 4);
            const items: {[key in ItemId]?: number} = { [ItemId.Rope]: ropeCount };

            if (Math.random() < 0.5) {
                items[ItemId.Pot] = 1;
            }

            if (Math.random() < 0.5) {
                items[ItemId.MagGlass] = 1;
            }

            if (Math.random() < 0.05) {
                items[ItemId.PirateHat] = 1;
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

const txJet = getImage("assets/entities/jet.png");
const txSuitcase = getImage("assets/entities/suitcase.png");

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

const txOutpostGround = getImage("assets/entities/outpost/ground.png");
const txOutpostBuildings = getImage("assets/entities/outpost/buildings.png");
const txOutpostNote = getImage("assets/entities/outpost/note.png");
let txOutpostNoteOutlined: HTMLImageElement = txOutpostNote;
let txOutpostNoteSelected: HTMLImageElement = txOutpostNote;
createOutlinedImage(txOutpostNote, 2, "cyan").then((img) => { txOutpostNoteOutlined = img; });
createOutlinedImage(txOutpostNote, 2, "lime").then((img) => { txOutpostNoteSelected = img; });

export class OutpostGround extends Entity {
    constructor(position: Vec2) {
        super(position);
        this.layer = 0;
        this.size = new Vec2(6, 3); // Changed width to 6 and height to maintain proportionality
    }

    draw(ctx: RenderContext): void {
        ctx.drawImage(txOutpostGround, this.position.x - 3, this.position.y - 4.5, 6, 6);
    }
}

export class OutpostBuildings extends Entity {
    noteHighlighted = false;
    private noteRead = false;
    private world: World;
    private ground: OutpostGround;
    private onDespawn: () => void;

    constructor(position: Vec2, world: World, ground: OutpostGround, onDespawn: () => void) {
        super(position);
        this.layer = 2;
        this.size = new Vec2(6, 3);
        this.world = world;
        this.ground = ground;
        this.onDespawn = onDespawn;
    }

    draw(ctx: RenderContext): void {
        ctx.drawImage(txOutpostBuildings, this.position.x - 3, this.position.y - 4.5, 6, 6);

        const { worldPos: mousePos } = InputHandler.getInstance().getMousePos();
        const hovered = Math.abs(mousePos.x - this.position.x) < 3 && mousePos.y < this.position.y && mousePos.y > this.position.y - 3;

        ctx.drawImage(this.noteHighlighted ? hovered ? txOutpostNoteSelected : txOutpostNoteOutlined : txOutpostNote, this.position.x - 3, this.position.y - 4.5, 6, 6);
    }

    update(_dt: number): void {
        const player = Player.getInstance();
        const distSq = player.position.distanceSquaredTo(this.position);

        if (!this.noteRead && distSq > 60 * 60) {
            this.world.removeEntity(this.ground);
            this.world.removeEntity(this);
            this.onDespawn();
            return;
        }

        this.noteHighlighted = distSq < 9;
    }

    onClick(_worldPos: Vec2): void {
        if (this.noteHighlighted) {
            this.noteRead = true;
            setOpenNote(outpostNote);
        }
    }

    get clickable(): boolean {
        return this.noteHighlighted;
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
            sounds.loot.play();
            const world = Player.getInstance().world;

            const possibleItems = [
                ItemId.MagGlass,
                ItemId.Pot,
                ItemId.Rope,
                ItemId.Waterbottle
            ]

            if (Math.random() < 0.5) {
                possibleItems.push(ItemId.Medkit);
            }

            const dropCount = Math.random() < 0.5 ? 2 : 1;
            const items: {[key in ItemId]?: number} = {};

            for (let i = 0; i<dropCount; i++) {
                const chosenItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
                items[chosenItem] = (items[chosenItem] || 0) + 1;
            }

            if (Math.random() < 0.015) {
                items[ItemId.CapitainHat] = 1;
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

const txBoulder = getImage("assets/entities/boulder.png");
const boulderAssets: { highlighted: HTMLImageElement | null; selected: HTMLImageElement | null } = { highlighted: null, selected: null };
createOutlinedImage(txBoulder, 2, "cyan").then((img) => { boulderAssets.highlighted = img; });
createOutlinedImage(txBoulder, 2, "lime").then((img) => { boulderAssets.selected = img; });

let mineHintShown = false;

export class Boulder extends Entity {
    private world: World;
    private highlighted = false;
    private destroyed = false;
    private hintHandle: HintHandle | null = null;

    constructor(position: Vec2, world: World) {
        super(position);
        this.world = world;
        this.layer = 1;
        this.size = new Vec2(1, 1);
    }

    get clickable(): boolean {
        return this.highlighted;
    }

    draw(ctx: RenderContext): void {
        if (this.destroyed) return;

        ctx.fillEllipse(this.position.x, this.position.y - 0.3, 0.5, 0.2, "rgba(0, 0, 0, 0.3)");

        const { worldPos: mousePos } = InputHandler.getInstance().getMousePos();
        const hovered = Math.abs(mousePos.x - this.position.x) < 0.5 && mousePos.y <= this.position.y && mousePos.y > this.position.y - 1;

        let sprite: HTMLImageElement = txBoulder;
        if (this.highlighted && hovered && boulderAssets.selected) {
            sprite = boulderAssets.selected;
        } else if (this.highlighted && boulderAssets.highlighted) {
            sprite = boulderAssets.highlighted;
        }

        let drawW = 1;
        let drawH = 1;
        if (sprite !== txBoulder && txBoulder.naturalWidth > 0) {
            drawW = sprite.naturalWidth / txBoulder.naturalWidth;
            drawH = sprite.naturalHeight / txBoulder.naturalHeight;
        }
        ctx.drawImage(sprite, this.position.x - drawW / 2, this.position.y - drawH, drawW, drawH);
    }

    onClick(_worldPos: Vec2): void {
        if (this.highlighted) {
            Player.getInstance().swingItem();
            sounds.chop.play();
            dropItems(this.world, this.position, { [ItemId.Rock]: 5 });
            if (this.hintHandle) {
                this.hintHandle.destroy();
                this.hintHandle = null;
            }
            this.destroyed = true;
        }
    }

    update(_dt: number): void {
        if (this.destroyed) {
            this.world.removeEntity(this);
            return;
        }

        const player = Player.getInstance();
        const near = player.position.distanceSquaredTo(this.position) < 9;
        const slot = getSelectedSlot();
        const holdingPickaxe = near && slot >= 0 && slot < player.inventory.length && player.inventory[slot].item === ItemId.Pickaxe;

        const prevHighlighted = this.highlighted;
        this.highlighted = holdingPickaxe;

        if (this.highlighted && !prevHighlighted) {
            if (!mineHintShown) {
                this.hintHandle = attachHint(this, "Mine", this.world, new Vec2(0, 1));
                mineHintShown = true;
            }
        } else if (!this.highlighted && prevHighlighted && this.hintHandle) {
            this.hintHandle.destroy();
            this.hintHandle = null;
        }
    }
}

const txPlaneCrash = getImage("assets/entities/plane.png");
const fpPlaneSmoke = new Flipbook("assets/entities/smoke.png", 2, 0.5);

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