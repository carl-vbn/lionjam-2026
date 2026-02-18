import { Camera, createOutlinedImage, getImage, InputHandler, RenderContext, Vec2, World } from "../engine/index.js";
import { getItemSprite, ItemId } from "./items.js";
import { InventorySlot, Player } from "./player.js";

const txHealthbar = getImage("assets/ui/bars/health.png");
const txWaterbar = getImage("assets/ui/bars/water.png");
const txFoodbar = getImage("assets/ui/bars/food.png");
const txCompassBg = getImage("assets/ui/compass/background.png");
const txCompassNeedle = getImage("assets/ui/compass/needle.png");
const txInventorySlot = getImage("assets/ui/slot.png");

let txInventorySlotSelected = txInventorySlot;
createOutlinedImage(txInventorySlot, 2, "cyan").then((outlined) => {
    txInventorySlotSelected = outlined;
});

const target = new Vec2(0, 0);

function drawBar(ctx: RenderContext, x: number, y: number, sprite: HTMLImageElement, barColor: string, value: number) {
    // Shadow
    ctx.fillRect(x + 6, y + 4, 354, 42, "rgba(0, 0, 0, 0.25)");

    // Background
    ctx.drawImage(sprite, x, y, 354, 42);

    // Foreground
    ctx.fillRect(x + 70, y + 10, 275 * value, 22, barColor);
}

function drawInventorySlot(ctx: RenderContext, x: number, y: number, slot: InventorySlot, hovered: boolean, selected: boolean) {
    ctx.drawImage(selected ? txInventorySlotSelected : txInventorySlot, x, y, 64, 64);
    const itemSprite = getItemSprite(slot.item);
    ctx.drawImage(itemSprite, x + 8, y + 8, 48, 48);

    if (hovered)
        ctx.fillRect(x, y, 64, 64, "rgba(0, 0, 0, 0.1)");

    ctx.drawText(`${slot.quantity}`, x + 50, y + 50, {
        font: "monospace",
        color: "#ffffff",
        baseline: "alphabetic" as CanvasTextBaseline,
        align: "right" as CanvasTextAlign,
        size: 14,
    });
}

function drawCompass(ctx: RenderContext, x: number, y: number, size: number, angle: number) {
    // Shadow
    ctx.fillEllipse(x + 2, y + 2, size / 2, size / 2, "rgba(0, 0, 0, 0.25)");

    ctx.drawImage(txCompassBg, x - size / 2, y - size / 2, size, size);

    ctx.pushTransform({center: new Vec2(x, y), rotation: angle});
    ctx.drawImage(txCompassNeedle, x - size / 2, y - size / 2, size, size);
    ctx.popTransform();
}

let selectedSlot = -1;

export function getSelectedSlot(): number {
    return selectedSlot;
}

/**
 * Checks if a screen-space click lands on a UI element.
 * Returns true if the click was absorbed by UI (should not propagate to the world).
 */
export function handleUIClick(screenPos: Vec2, screenWidth: number, screenHeight: number): boolean {
    const player = Player.getInstance();

    // Check inventory slots
    for (let i = 0; i < player.inventory.length; i++) {
        const slotX = screenWidth - 100 - i * 68;
        const slotY = screenHeight - 94;
        if (screenPos.x >= slotX && screenPos.x <= slotX + 64 &&
            screenPos.y >= slotY && screenPos.y <= slotY + 64) {
            selectedSlot = selectedSlot === i ? -1 : i;
            return true;
        }
    }

    // Check bars (top-right)
    if (screenPos.x >= screenWidth - 380 && screenPos.x <= screenWidth - 26 &&
        screenPos.y >= 30 && screenPos.y <= 122) {
        return true;
    }

    // Check compass area (top-left)
    const dx = screenPos.x - 80;
    const dy = screenPos.y - 80;
    if (dx * dx + dy * dy <= 64 * 64) {
        return true;
    }

    return false;
}

export function drawHUD(ctx: RenderContext, dt: number, camera: Camera) {
    const fps = 1 / dt;
    const player = Player.getInstance()!;

    drawBar(ctx, ctx.width - 380, 30, txHealthbar, "#ff0000", player.health / 100);
    drawBar(ctx, ctx.width - 380, 80, txWaterbar, "#0088ff", 0.75);
    drawBar(ctx, ctx.width - 380, 130, txFoodbar, "#ff8800", 0.5);

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

    const { screenPos: mousePos } = InputHandler.getInstance()!.getMousePos();
    
    for (let i = 0; i < player.inventory.length; i++) {
        const slotHovered = mousePos.x >= ctx.width - 100 - i * 68 && mousePos.x <= ctx.width - 36 - i * 68 && mousePos.y >= ctx.height - 94 && mousePos.y <= ctx.height - 30;
        drawInventorySlot(ctx, ctx.width - 100 - i * 68, ctx.height - 94, player.inventory[i], slotHovered, i === selectedSlot);
    }
}