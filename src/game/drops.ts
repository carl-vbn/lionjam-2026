import { Entity, RenderContext } from "../engine/index.js";
import { getImage } from "./tiles.js";

const stickImage = getImage("/assets/items/stick.png");

export class Stick extends Entity {
    draw(ctx: RenderContext): void {
        // Small eliptical shadow underneath
        ctx.fillEllipse(this.position.x, this.position.y + 0.1, 0.3, 0.1, "rgba(0, 0, 0, 0.3)");

        ctx.drawImage(stickImage, this.position.x - 0.25, this.position.y - 0.25, 0.5, 0.5);
    }
}