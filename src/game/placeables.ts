import { createOutlinedImage, Entity, Flipbook, getImage, HintHandle, RenderContext, Vec2, World } from "../engine/index.js";
import { attachHint } from "../engine/index.js";
import { Player } from "./player.js";

const txCampfireBase = getImage("assets/entities/campfire/campfire_base.png");
const fpCampfire = new Flipbook("assets/entities/campfire/campfire_animated.png", 2, 0.3);

let txCampfireOutlined = txCampfireBase;
createOutlinedImage(txCampfireBase, 2, "orange").then((outlined) => {
    txCampfireOutlined = outlined;
});

let campfireLightHintShown = false;

export class Campfire extends Entity {
    lit=false;
    highlighted = false;

    constructor(position: Vec2, world: World) {
        super(position);

        if (!campfireLightHintShown) {
            attachHint(this, "Tool needed to light", world, new Vec2(0, 1.5))
                .destroyAfter(5);
            campfireLightHintShown = true;
        }
    }

    draw(ctx: RenderContext): void {
        if (this.lit) {
            ctx.drawFlipbook(fpCampfire, this.position.x - 0.5, this.position.y - 0.5, 1, 1);
        } else if (this.highlighted) {
            ctx.drawImage(txCampfireOutlined, this.position.x - 0.5, this.position.y - 0.5, 1, 1);
        } else {
            ctx.drawImage(txCampfireBase, this.position.x - 0.5, this.position.y - 0.5, 1, 1);
        }
    }

    update(_dt: number): void {
        const player = Player.getInstance();

        if (player.position.distanceSquaredTo(this.position) < 4) {
            this.highlighted = true;
        } else {
            this.highlighted = false;
        }
    }

    get clickable(): boolean {
        return !this.lit && this.highlighted;
    }
}