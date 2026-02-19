import { Entity, RenderContext, Vec2, World } from "../engine/index.js";
import { createOutlinedImage, getImage } from "../engine/image.js";
import { Player } from "./player.js";

export enum ItemId {
    Stick = "stick",
    Coconut = "coconut",
    CookedMeat = "meat_cooked",
    RawMeat = "meat_raw",
    Spear = "spear",
    Rope = "rope",
    Axe = "axe",
    MagGlass = "magglass",
    Pot = "pot",
    Rock = "rock",
    Log = "log"
}

export interface WeaponData {
    damage: number;
    range: number;
    throwable: boolean;
}

const WEAPON_DATA: Partial<Record<ItemId, WeaponData>> = {
    [ItemId.Stick]: { damage: 10, range: 2, throwable: false },
    [ItemId.Coconut]: { damage: 5, range:8, throwable: true },
    [ItemId.Spear]: { damage: 15, range: 8, throwable: true },
    [ItemId.Axe]: { damage: 20, range: 3, throwable: false },
    [ItemId.Rock]: { damage: 8, range: 10, throwable: true }
};

export function getWeaponData(itemId: ItemId): WeaponData | null {
    return WEAPON_DATA[itemId] ?? null;
}

const ITEM_DISPLAY_NAMES: Record<ItemId, string> = {
    [ItemId.Stick]: "Stick",
    [ItemId.Coconut]: "Coconut",
    [ItemId.CookedMeat]: "Cooked Meat",
    [ItemId.RawMeat]: "Raw Meat",
    [ItemId.Spear]: "Spear",
    [ItemId.Rope]: "Rope",
    [ItemId.Axe]: "Axe",
    [ItemId.MagGlass]: "Magnifying Glass",
    [ItemId.Pot]: "Pot",
    [ItemId.Rock]: "Rock",
    [ItemId.Log]: "Log"
};

export function getItemDisplayName(itemId: ItemId): string {
    return ITEM_DISPLAY_NAMES[itemId];
}

const ITEM_ACTIONS: Partial<Record<ItemId, string>> = {
    [ItemId.Coconut]: "consume",
    [ItemId.RawMeat]: "consume",
    [ItemId.CookedMeat]: "consume",
};

export function getItemAction(itemId: ItemId): string | null {
    return ITEM_ACTIONS[itemId] ?? null;
}

export interface Recipe {
    result: ItemId;
    ingredients: Partial<Record<ItemId, number>>;
}

export const RECIPES: Recipe[] = [
    { result: ItemId.Spear, ingredients: { [ItemId.Stick]: 3, [ItemId.Rope]: 1 } },
    { result: ItemId.Axe, ingredients: { [ItemId.Stick]: 2, [ItemId.Rope]: 2, [ItemId.Rock]: 1 } },
];

const ITEM_SPRITES: Record<ItemId, string> = {
    [ItemId.Stick]: "/assets/items/stick.png",
    [ItemId.Coconut]: "/assets/items/coconut.png",
    [ItemId.CookedMeat]: "/assets/items/meat_cooked.png",
    [ItemId.RawMeat]: "/assets/items/meat_raw.png",
    [ItemId.Spear]: "/assets/items/spear.png",
    [ItemId.Rope]: "/assets/items/rope.png",
    [ItemId.Axe]: "/assets/items/axe.png",
    [ItemId.MagGlass]: "/assets/items/magglass.png",
    [ItemId.Pot]: "/assets/items/pot.png",
    [ItemId.Rock]: "/assets/items/rock.png",
    [ItemId.Log]: "/assets/items/log.png"
};

interface ItemAssets {
    normal: HTMLImageElement;
    highlighted: HTMLImageElement | null;
}

const assetCache = new Map<ItemId, ItemAssets>();

function loadItemAssets(itemId: ItemId): ItemAssets {
    let assets = assetCache.get(itemId);
    if (assets) return assets;

    const img = getImage(ITEM_SPRITES[itemId]);
    assets = { normal: img, highlighted: null };
    assetCache.set(itemId, assets);

    createOutlinedImage(img, 2, "cyan").then((outlined) => {
        assets!.highlighted = outlined;
    });

    return assets;
}

// Pre-load all item sprites
for (const id of Object.values(ItemId)) {
    loadItemAssets(id);
}

export function dropItems(world: World, position: Vec2, items: Partial<Record<ItemId, number>>): void {
    for (const [itemId, count] of Object.entries(items) as [ItemId, number][]) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.3 + Math.random() * 0.5;
            const landPos = position.add(new Vec2(Math.cos(angle) * radius, Math.sin(angle) * radius));
            const item = new Item(landPos, world, itemId, position);
            world.addEntity(item);
        }
    }
}

const HIGHLIGHT_DISTANCE_SQ = 9; // 3 tiles
const PICKUP_DISTANCE_SQ = 1; // 1 tile
const PICKUP_DURATION = 0.3;
const SPAWN_DURATION = 0.4;

export function getItemSprite(itemId: ItemId, highlighted = false): HTMLImageElement {
    const assets = loadItemAssets(itemId);
    return (highlighted && assets.highlighted) ? assets.highlighted : assets.normal;
}

export class Item extends Entity {
    private itemId: ItemId;
    private world: World;
    private highlighted = false;
    private pickingUp = false;
    private pickupProgress = 0;
    private startPos: Vec2;

    // Popup spawn animation
    private spawning = false;
    private spawnProgress = 0;
    private spawnOrigin: Vec2;
    private spawnTarget: Vec2;

    constructor(position: Vec2, world: World, itemId: ItemId, popupFrom?: Vec2) {
        super(popupFrom ?? position);
        this.itemId = itemId;
        this.world = world;
        this.startPos = position.clone();
        this.dynamic = true;

        if (popupFrom) {
            this.spawning = true;
            this.spawnOrigin = popupFrom.clone();
            this.spawnTarget = position.clone();
        } else {
            this.spawnOrigin = position.clone();
            this.spawnTarget = position.clone();
        }
    }

    update(dt: number): void {
        if (this.spawning) {
            this.spawnProgress += dt / SPAWN_DURATION;
            if (this.spawnProgress >= 1) {
                this.spawning = false;
                this.spawnProgress = 1;
                this.position = this.spawnTarget.clone();
                this.startPos = this.position.clone();
            } else {
                this.position = this.spawnOrigin.lerp(this.spawnTarget, this.spawnProgress);
            }
            return;
        }

        const player = Player.getInstance();
        const distSq = player.position.distanceSquaredTo(this.position);

        if (this.pickingUp) {
            this.pickupProgress += dt / PICKUP_DURATION;
            if (this.pickupProgress >= 1) {
                Player.getInstance().addItem(this.itemId);
                this.world.removeEntity(this);
                return;
            }
            const t = this.pickupProgress;
            this.position = this.startPos.lerp(player.position, t * t);
        } else if (distSq < PICKUP_DISTANCE_SQ && !player.isDead) {
            this.highlighted = false;
            this.pickingUp = true;
            this.pickupProgress = 0;
            this.startPos = this.position.clone();
        } else {
            this.highlighted = distSq < HIGHLIGHT_DISTANCE_SQ;
        }
    }

    draw(ctx: RenderContext): void {
        if (this.pickingUp) {
            ctx.setAlpha(1 - this.pickupProgress);
        }

        // Vertical offset for popup arc: parabola peaking at t=0.5
        let popupOffset = 0;
        if (this.spawning) {
            const t = this.spawnProgress;
            popupOffset = -4 * t * (1 - t) * 0.8; // arc up to 0.8 tiles high
        }

        // Shadow (always at ground level)
        ctx.fillEllipse(this.position.x, this.position.y + 0.1, 0.3, 0.1, "rgba(0, 0, 0, 0.3)");

        const assets = loadItemAssets(this.itemId);
        const img = (this.highlighted && assets.highlighted) ? assets.highlighted : assets.normal;

        // Outlined images have padding; scale to keep inner sprite at 0.5x0.5
        const baseSize = 0.5;
        let drawW = baseSize;
        let drawH = baseSize;
        if (img !== assets.normal && assets.normal.naturalWidth > 0) {
            drawW = baseSize * (img.naturalWidth / assets.normal.naturalWidth);
            drawH = baseSize * (img.naturalHeight / assets.normal.naturalHeight);
        }
        ctx.drawImage(img, this.position.x - drawW / 2, this.position.y - drawH / 2 + popupOffset, drawW, drawH);

        if (this.pickingUp) {
            ctx.resetAlpha();
        }
    }
}
