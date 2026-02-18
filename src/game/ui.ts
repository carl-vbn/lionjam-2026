import { Camera, getImage, RenderContext, World } from "../engine/index.js";

const txWaterbar = getImage("assets/ui/waterbar.png");
const txFoodbar = getImage("assets/ui/foodbar.png");

function drawBar(ctx: RenderContext, x: number, y: number, sprite: HTMLImageElement, barColor: string, value: number) {
    // Shadow
    ctx.fillRect(x + 6, y + 4, 354, 42, "rgba(0, 0, 0, 0.25)");

    // Background
    ctx.drawImage(sprite, x, y, 354, 42);

    // Foreground
    ctx.fillRect(x + 70, y + 10, 275 * value, 22, barColor);
}

export function drawHUD(ctx: RenderContext, dt: number, camera: Camera) {
    const fps = 1 / dt;

    const native = ctx.ctx;
    native.fillStyle = "rgba(0, 0, 0, 0.5)";
    native.fillRect(8, 8, 400, 28);
    native.font = "14px monospace";
    native.fillStyle = "#ffffff";
    native.textBaseline = "alphabetic";
    native.textAlign = "left";
    native.fillText(
        `Camera: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)})  Zoom: ${camera.zoom.toFixed(2)}  FPS: ${Math.round(fps)}`,
        16, 26,
    );

    drawBar(ctx, ctx.width - 380, 30, txWaterbar, "#0088ff", 0.75);
    drawBar(ctx, ctx.width - 380, 80, txFoodbar, "#ff8800", 0.5);
}