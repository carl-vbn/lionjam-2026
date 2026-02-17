import { Entity, Flipbook, RenderContext, Vec2 } from "../engine/index.js";

const fpPalmTree = new Flipbook("/assets/entities/palmtree/palm.png", 2, 0.75);
const fpPalmTreeCoconuts = new Flipbook("/assets/entities/palmtree/palmcoconut.png", 2, 0.75);

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