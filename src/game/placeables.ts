import { createOutlinedImage, Entity, Flipbook, getImage, HintHandle, RenderContext, Vec2, World } from "../engine/index.js";
import { attachHint } from "../engine/index.js";
import { ItemId } from "./items.js";
import { Player } from "./player.js";

const txCampfireBase = getImage("assets/entities/campfire/campfire_base.png");
const fpCampfire = new Flipbook("assets/entities/campfire/campfire_animated.png", 2, 0.3);

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
        if (this.lit) {
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