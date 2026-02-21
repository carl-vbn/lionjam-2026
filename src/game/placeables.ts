import { createOutlinedImage, Entity, Flipbook, getImage, HintHandle, RenderContext, Vec2, World } from "../engine/index.js";
import { attachHint } from "../engine/index.js";
import { getItemDisplayName, ItemId } from "./items.js";
import { Player } from "./player.js";

const txShelter = getImage("assets/entities/shelter/shelter.png");
const txShelterShadow = getImage("assets/entities/shelter/shadow.png");
let txShelterOutlined = txShelter;
createOutlinedImage(txShelter, 2, "pink").then((o) => { txShelterOutlined = o; });

const txCampfireBase = getImage("assets/entities/campfire/campfire_base.png");
const fpCampfire = new Flipbook("assets/entities/campfire/campfire_animated.png", 2, 0.3);
const fpCampfireOutlined = new Flipbook("assets/entities/campfire/campfire_animated.png", 2, 0.3, { width: 2, color: "orange" });

let txCampfireOutlined = txCampfireBase;
createOutlinedImage(txCampfireBase, 2, "orange").then((outlined) => {
    txCampfireOutlined = outlined;
});

let campfireToolHintShown = false;
let campfireLightHintShown = false;
let campfireCookHintShown = false;
let campfireBoilHintShown = false;

export class Campfire extends Entity {
    lit=false;
    highlighted = false;
    world: World;

    constructor(position: Vec2, world: World) {
        super(position);
        this.world = world;

        if (!campfireToolHintShown) {
            attachHint(this, "Tool needed to light", world, new Vec2(0, 1))
                .destroyAfter(5);
            campfireToolHintShown = true;
        }
    }

    draw(ctx: RenderContext): void {
        if (this.lit && this.highlighted) {
            ctx.drawFlipbook(fpCampfireOutlined, this.position.x - 0.5, this.position.y - 1, 1, 1);
        } else if (this.lit) {
            ctx.drawFlipbook(fpCampfire, this.position.x - 0.5, this.position.y - 1, 1, 1);
        } else if (this.highlighted) {
            ctx.drawImage(txCampfireOutlined, this.position.x - 0.5, this.position.y - 1, 1, 1);
        } else {
            ctx.drawImage(txCampfireBase, this.position.x - 0.5, this.position.y - 1, 1, 1);
        }
    }

    update(_dt: number): void {
        const player = Player.getInstance();
        const holdingLighter = player.isHolding(ItemId.MagGlass);
        const playerIsClose = player.position.distanceSquaredTo(this.position) < 4;

        if (this.lit && playerIsClose && (player.isHolding(ItemId.RawMeat))) {
            this.highlighted = true;

            if (!campfireCookHintShown) {
                attachHint(this, "Cook", this.world, new Vec2(0, 1))
                    .destroyAfter(5);
                campfireCookHintShown = true;
            }
        } else if (this.lit && playerIsClose && player.isHolding(ItemId.UndrinkablePot)) {
            this.highlighted = true;

            if (!campfireBoilHintShown) {
                attachHint(this, "Boil", this.world, new Vec2(0, 1))
                    .destroyAfter(5);
                campfireBoilHintShown = true;
            }
        } else if (!this.lit && holdingLighter && playerIsClose) {
            this.highlighted = true;

            if (!campfireLightHintShown) {
                attachHint(this, "Light", this.world, new Vec2(0, 1))
                    .destroyAfter(5);
                campfireLightHintShown = true;
            }
        } else {
            this.highlighted = false;
        }
    }

    onClick(_worldPos: Vec2): void {
        if (!this.highlighted) return;

        const player = Player.getInstance();

        if (!this.lit && player.isHolding(ItemId.MagGlass)) {
            this.lit = true;
        } else if (this.lit && player.isHolding(ItemId.RawMeat)) {
            player.replaceHeldItem(ItemId.CookedMeat);
        } else if (this.lit && player.isHolding(ItemId.UndrinkablePot)) {
            player.replaceHeldItem(ItemId.DrinkablePot);
        } else {
            player.addItem(ItemId.MagGlass);
        }
    }

    get clickable(): boolean {
        return true;
    }
}

// --- Bonfire ---

const txBonfireBase = getImage("assets/entities/bonfire/base.png");
let txBonfireBaseOutlined = txBonfireBase;
createOutlinedImage(txBonfireBase, 2, "orange").then((o) => { txBonfireBaseOutlined = o; });

const txBonfireStages: HTMLImageElement[] = [];
const txBonfireStagesOutlined: HTMLImageElement[] = [];
for (let i = 1; i <= 7; i++) {
    const img = getImage(`assets/entities/bonfire/stage${i}.png`);
    txBonfireStages.push(img);
    txBonfireStagesOutlined.push(img); // placeholder
    createOutlinedImage(img, 2, "orange").then((o) => {
        txBonfireStagesOutlined[i - 1] = o;
    });
}

const txBonfireFire: HTMLImageElement[] = [];
const txBonfireFireOutlined: HTMLImageElement[] = [];
for (let i = 1; i <= 4; i++) {
    const img = getImage(`assets/entities/bonfire/fire${i}.png`);
    txBonfireFire.push(img);
    txBonfireFireOutlined.push(img);
    createOutlinedImage(img, 2, "orange").then((o) => {
        txBonfireFireOutlined[i - 1] = o;
    });
}

const BONFIRE_FIRE_INTERVAL = 0.3;

interface StageCost {
    items: Partial<Record<ItemId, number>>;
}

let _bonfireStageCosts: StageCost[] | null = null;
function getBonfireStageCosts(): StageCost[] {
    if (!_bonfireStageCosts) {
        _bonfireStageCosts = [
            { items: { [ItemId.Stick]: 5 } },                              // stage 0 -> 1
            { items: { [ItemId.Log]: 6 } },                              // stage 1 -> 2
            { items: { [ItemId.Stick]: 10} },                                // stage 2 -> 3
            { items: { [ItemId.Log]: 8 } },                                // stage 3 -> 4
            { items: { [ItemId.Stick]: 16 } },            // stage 4 -> 5
            { items: { [ItemId.Log]: 20 } },            // stage 5 -> 6
            { items: { [ItemId.Log]: 30 } },            // stage 6 -> 7
        ];
    }
    return _bonfireStageCosts;
}

function formatCost(cost: StageCost): string[] {
    const lines: string[] = ["Next stage:"];
    for (const [id, count] of Object.entries(cost.items) as [ItemId, number][]) {
        lines.push(`${count}x ${getItemDisplayName(id)}`);
    }
    return lines;
}

export class Bonfire extends Entity {
    stage = 0;
    lit = false;
    highlighted = false;
    world: World;
    private fireTimer = 0;
    private hintHandle: HintHandle | null = null;

    constructor(position: Vec2, world: World) {
        super(position);
        this.world = world;
    }

    private showHint(text: string | string[]): void {
        if (this.hintHandle) return;
        this.hintHandle = attachHint(this, text, this.world, new Vec2(0, 1));
    }

    private clearHint(): void {
        if (this.hintHandle) {
            this.hintHandle.destroy();
            this.hintHandle = null;
        }
    }

    update(dt: number): void {
        this.fireTimer += dt;

        const player = Player.getInstance();
        const playerIsClose = player.position.distanceSquaredTo(this.position) < 16;

        if (this.stage < 7 && playerIsClose) {
            this.highlighted = true;
            this.showHint(formatCost(getBonfireStageCosts()[this.stage]));
        } else if (this.stage === 7 && !this.lit && playerIsClose && player.isHolding(ItemId.MagGlass)) {
            this.highlighted = true;
            this.showHint("Light");
        } else {
            this.highlighted = false;
            this.clearHint();
        }
    }

    onClick(_worldPos: Vec2): void {
        if (!this.highlighted) return;

        const player = Player.getInstance();

        if (this.stage < 7) {
            const cost = getBonfireStageCosts()[this.stage];
            // Check player has all required items
            for (const [id, needed] of Object.entries(cost.items) as [ItemId, number][]) {
                const slot = player.inventory.find(s => s.item === id);
                if (!slot || slot.quantity < needed) return;
            }
            // Consume items
            for (const [id, needed] of Object.entries(cost.items) as [ItemId, number][]) {
                player.removeItem(id, needed);
            }
            this.stage++;
            this.clearHint();
        } else if (this.stage === 7 && !this.lit && player.isHolding(ItemId.MagGlass)) {
            this.lit = true;
            this.clearHint();
        }
    }

    draw(ctx: RenderContext): void {
        let img: HTMLImageElement;

        if (this.stage === 0) {
            img = this.highlighted ? txBonfireBaseOutlined : txBonfireBase;
        } else {
            img = this.highlighted ? txBonfireStagesOutlined[this.stage - 1] : txBonfireStages[this.stage - 1];
        }

        ctx.drawImage(img, this.position.x - 2.5, this.position.y - 5, 5, 5);

        if (this.stage === 7 && this.lit) {
            const frameIndex = Math.floor(this.fireTimer / BONFIRE_FIRE_INTERVAL) % 4;
            const fireImg = this.highlighted ? txBonfireFireOutlined[frameIndex] : txBonfireFire[frameIndex];
            ctx.drawImage(fireImg, this.position.x - 2.5, this.position.y - 5, 5, 5);
        }
    }

    get clickable(): boolean {
        return true;
    }
}

// --- Shelter ---

const SHELTER_REGEN_RATE = 5; // health per second

export class Shelter extends Entity {
    highlighted = false;

    constructor(position: Vec2) {
        super(position);
        this.size = new Vec2(2, 1.5);
        this.layer = 1;
    }

    update(dt: number): void {
        const player = Player.getInstance();
        const px = player.position.x;
        const py = player.position.y;

        // Check if player is within the 2x2 bounding box
        const insideShelter =
            px >= this.position.x - 0.5 && px <= this.position.x + 0.5 &&
            py >= this.position.y - 1 && py <= this.position.y;

        if (insideShelter && !player.isDead) {
            player.health = Math.min(100, player.health + SHELTER_REGEN_RATE * dt);
        }

        const playerIsClose = player.position.distanceSquaredTo(this.position) < 16;
        this.highlighted = playerIsClose;
    }

    draw(ctx: RenderContext): void {
        const img = this.highlighted ? txShelterOutlined : txShelter;
        ctx.drawImage(img, this.position.x - 1, this.position.y - 1.5, 2, 2);
    }

    get clickable(): boolean {
        return true;
    }
}

export class ShelterShadow extends Entity {
    constructor(position: Vec2) {
        super(position);
        this.size = new Vec2(2, 2);
        this.layer = 0;
    }

    draw(ctx: RenderContext): void {
        ctx.drawImage(txShelterShadow, this.position.x - 1, this.position.y - 1.5, 2, 2);
    }
}