import { Entity, Flipbook, RenderContext, Vec2 } from "../engine/index.js";
import { getImage } from "./tiles.js";

const fpPalmTree = new Flipbook("/assets/entities/palmtree/palm.png", 2, 0.75);
const fpPalmTreeCoconuts = new Flipbook("/assets/entities/palmtree/palmcoconut.png", 2, 0.75);
const fpBush = new Flipbook("/assets/entities/bush.png", 2, 0.75);
const txTallgrassLong = getImage("/assets/entities/tallgrass/long.png");
const txTallgrassShort = getImage("/assets/entities/tallgrass/short.png");

export class PalmTree extends Entity {
    hasCoconuts: boolean = true;

    constructor(position: Vec2) {
        super(position);
        this.layer = 1;
        this.size = new Vec2(1, 3);
    }

    draw(ctx: RenderContext): void {
        // Shadow
        ctx.fillEllipse(this.position.x, this.position.y - 0.25, 0.5, 0.25, "rgba(0, 0, 0, 0.25)");

        const flipbook = this.hasCoconuts ? fpPalmTreeCoconuts : fpPalmTree;
        ctx.drawFlipbook(flipbook, this.position.x - 1, this.position.y - 2, 2, 2);
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