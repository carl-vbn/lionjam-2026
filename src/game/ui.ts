import { Camera, getImage, RenderContext, Vec2, World } from "../engine/index.js";
import { Player } from "./player.js";

const txWaterbar = getImage("assets/ui/waterbar.png");
const txFoodbar = getImage("assets/ui/foodbar.png");
const txCompassBg = getImage("assets/ui/compass/background.png");
const txCompassNeedle = getImage("assets/ui/compass/needle.png");

const target = new Vec2(0, 0);

function drawBar(ctx: RenderContext, x: number, y: number, sprite: HTMLImageElement, barColor: string, value: number) {
    // Shadow
    ctx.fillRect(x + 6, y + 4, 354, 42, "rgba(0, 0, 0, 0.25)");

    // Background
    ctx.drawImage(sprite, x, y, 354, 42);

    // Foreground
    ctx.fillRect(x + 70, y + 10, 275 * value, 22, barColor);
}

function drawCompass(ctx: RenderContext, x: number, y: number, size: number, angle: number) {
    // Shadow
    ctx.fillEllipse(x + 2, y + 2, size / 2, size / 2, "rgba(0, 0, 0, 0.25)");

    ctx.drawImage(txCompassBg, x - size / 2, y - size / 2, size, size);

    ctx.pushTransform({center: new Vec2(x, y), rotation: angle});
    ctx.drawImage(txCompassNeedle, x - size / 2, y - size / 2, size, size);
    ctx.popTransform();
}

export function drawHUD(ctx: RenderContext, dt: number, camera: Camera) {
    const fps = 1 / dt;
    const player = Player.getInstance()!;

    drawBar(ctx, ctx.width - 380, 30, txWaterbar, "#0088ff", 0.75);
    drawBar(ctx, ctx.width - 380, 80, txFoodbar, "#ff8800", 0.5);

    const compassAngle = Math.atan2(target.y - player.position.y, target.x - player.position.x);

    drawCompass(ctx, 80, 80, 128, compassAngle + Math.PI / 2);

    const font = {
        font: "monospace",
        color: "#ffffff",
        baseline: "alphabetic" as CanvasTextBaseline,
        align: "left" as CanvasTextAlign,
        size: 16,
    };

    const shadowFont = {
        ...font,
        color: "rgba(0, 0, 0, 0.5)",
    };

    ctx.drawText(`X: ${player.position.x.toFixed(1)}`, 152, 42, shadowFont);
    ctx.drawText(`X: ${player.position.x.toFixed(1)}`, 150, 40, font);

    ctx.drawText(`Y: ${player.position.y.toFixed(1)}`, 152, 62, shadowFont);
    ctx.drawText(`Y: ${player.position.y.toFixed(1)}`, 150, 60, font);

    ctx.drawText(`FPS: ${Math.round(fps)}`, 152, 82, shadowFont);
    ctx.drawText(`FPS: ${Math.round(fps)}`, 150, 80, font);

    ctx.drawText(`Tracking: crash site`, 152, 102, shadowFont);
    ctx.drawText(`Tracking: crash site`, 150, 100, font);

    ctx.drawText(`(X: ${target.x.toFixed(1)}, Y: ${target.y.toFixed(1)})`, 152, 122, shadowFont);
    ctx.drawText(`(X: ${target.x.toFixed(1)}, Y: ${target.y.toFixed(1)})`, 150, 120, font);
}