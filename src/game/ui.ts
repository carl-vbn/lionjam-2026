import { Camera, createOutlinedImage, getImage, InputHandler, RenderContext, Vec2, World } from "../engine/index.js";
import { getItemAction, getItemDisplayName, getItemSprite, ItemId, Recipe, RECIPES } from "./items.js";
import { InventorySlot, Player } from "./player.js";

const txHealthbar = getImage("assets/ui/bars/health.png");
const txWaterbar = getImage("assets/ui/bars/water.png");
const txFoodbar = getImage("assets/ui/bars/food.png");
const txCompassBg = getImage("assets/ui/compass/background.png");
const txCompassNeedle = getImage("assets/ui/compass/needle.png");
const txInventorySlot = getImage("assets/ui/slot.png");
const txButton = getImage("assets/ui/button.png");
const txButtonLong = getImage("assets/ui/button_long.png");

let txInventorySlotSelected = txInventorySlot;
createOutlinedImage(txInventorySlot, 2, "cyan").then((outlined) => {
    txInventorySlotSelected = outlined;
});

// --- Compass target system ---

interface CompassTarget { name: string; position: Vec2; }

const shelterTargets: CompassTarget[] = [];
let deathLocation: Vec2 | null = null;
let selectedTargetIndex = 0;

function getCompassTargets(): CompassTarget[] {
    const targets: CompassTarget[] = [{ name: "Crash site", position: new Vec2(0, 0) }];
    targets.push(...shelterTargets);
    if (deathLocation) {
        targets.push({ name: "Last death", position: deathLocation });
    }
    return targets;
}

export function registerCompassTarget(name: string, position: Vec2): void {
    shelterTargets.push({ name, position });
}

export function setDeathLocation(position: Vec2): void {
    deathLocation = position;
}

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

function drawCraftingButton(ctx: RenderContext, x: number, y: number, item: ItemId, hovered: boolean, disabled: boolean) {
    ctx.drawImage(txButton, x, y, 64, 64);
    const itemSprite = getItemSprite(item);
    ctx.drawImage(itemSprite, x + 8, y + 8, 48, 48);

    if (disabled)
        ctx.fillRect(x + 5, y + 4, 55, 56, "rgba(50, 50, 50, 0.5)");

    else if (hovered)
        ctx.fillRect(x + 2, y + 2, 55, 56, "rgba(0, 0, 0, 0.1)");
}

function drawCompass(ctx: RenderContext, x: number, y: number, size: number, angle: number) {
    // Shadow
    ctx.fillEllipse(x + 2, y + 2, size / 2, size / 2, "rgba(0, 0, 0, 0.25)");

    ctx.drawImage(txCompassBg, x - size / 2, y - size / 2, size, size);

    ctx.pushTransform({center: new Vec2(x, y), rotation: angle});
    ctx.drawImage(txCompassNeedle, x - size / 2, y - size / 2, size, size);
    ctx.popTransform();
}

function drawShadowedText(ctx: RenderContext, text: string, x: number, y: number, options: {
    font?: string;
    size?: number;
    color?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
} = {}) {
    const shadowOffset = 2;
    ctx.drawText(text, x + shadowOffset, y + shadowOffset, { ...options, color: "rgba(0, 0, 0, 0.5)" });
    ctx.drawText(text, x, y, { color: "#ffffff", ...options });
}

let selectedSlot = -1;

export function getSelectedSlot(): number {
    return selectedSlot;
}

export function setSelectedSlot(index: number): void {
    selectedSlot = index;
}

function canCraftRecipe(recipe: Recipe, player: Player): boolean {
    for (const [itemId, needed] of Object.entries(recipe.ingredients) as [ItemId, number][]) {
        const slot = player.inventory.find(s => s.item === itemId);
        if (!slot || slot.quantity < needed) return false;
    }
    return true;
}

function getItemCount(player: Player, itemId: ItemId): number {
    const slot = player.inventory.find(s => s.item === itemId);
    return slot ? slot.quantity : 0;
}

/**
 * Checks if a screen-space click lands on a UI element.
 * Returns true if the click was absorbed by UI (should not propagate to the world).
 */
export function handleUIClick(screenPos: Vec2, screenWidth: number, screenHeight: number): boolean {
    const player = Player.getInstance();

    // Check crafting buttons
    for (let i = 0; i < RECIPES.length; i++) {
        const btnX = 30 + i * 70;
        const btnY = screenHeight - 94;
        if (screenPos.x >= btnX && screenPos.x <= btnX + 64 &&
            screenPos.y >= btnY && screenPos.y <= btnY + 64) {
            const recipe = RECIPES[i];
            const debugMode = InputHandler.getInstance().isKeyDown("m");
            if (debugMode || canCraftRecipe(recipe, player)) {
                if (!debugMode) {
                    for (const [itemId, needed] of Object.entries(recipe.ingredients) as [ItemId, number][]) {
                        player.removeItem(itemId, needed);
                    }
                }
                player.addItem(recipe.result);
            }
            return true;
        }
    }

    // Check inventory slots
    for (let i = 0; i < player.inventory.length; i++) {
        const j = player.inventory.length - 1 - i;
        const slotX = screenWidth - 100 - j * 68;
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

    // Check compass target selector buttons
    const selectorY = 155;
    const selectorCenterX = 80;
    const btnSize = 32;
    const longBtnW = 96;
    const compassTargets = getCompassTargets();

    const leftBtnX = selectorCenterX - longBtnW / 2 - btnSize;
    if (compassTargets.length > 1 &&
        screenPos.x >= leftBtnX && screenPos.x <= leftBtnX + btnSize &&
        screenPos.y >= selectorY && screenPos.y <= selectorY + btnSize) {
        selectedTargetIndex = (selectedTargetIndex - 1 + compassTargets.length) % compassTargets.length;
        return true;
    }

    const rightBtnX = selectorCenterX + longBtnW / 2;
    if (compassTargets.length > 1 &&
        screenPos.x >= rightBtnX && screenPos.x <= rightBtnX + btnSize &&
        screenPos.y >= selectorY && screenPos.y <= selectorY + btnSize) {
        selectedTargetIndex = (selectedTargetIndex + 1) % compassTargets.length;
        return true;
    }

    return false;
}

export function drawHUD(ctx: RenderContext, dt: number, camera: Camera) {
    const fps = 1 / dt;
    const player = Player.getInstance()!;

    const { screenPos: mousePos } = InputHandler.getInstance()!.getMousePos();

    drawBar(ctx, ctx.width - 380, 30, txHealthbar, "#ff0000", player.health / 100);
    drawBar(ctx, ctx.width - 380, 80, txWaterbar, "#0088ff", player.water / 100);
    drawBar(ctx, ctx.width - 380, 130, txFoodbar, "#ff8800", player.hunger / 100);

    const targets = getCompassTargets();
    if (selectedTargetIndex >= targets.length) selectedTargetIndex = 0;
    const currentTarget = targets[selectedTargetIndex];
    const compassAngle = Math.atan2(currentTarget.position.y - player.position.y, currentTarget.position.x - player.position.x);

    drawCompass(ctx, 80, 80, 128, compassAngle + Math.PI / 2);

    const textOpts = { font: "monospace", size: 16, baseline: "alphabetic" as CanvasTextBaseline, align: "left" as CanvasTextAlign };

    drawShadowedText(ctx, `X: ${player.position.x.toFixed(1)}`, 150, 40, textOpts);
    drawShadowedText(ctx, `Y: ${player.position.y.toFixed(1)}`, 150, 60, textOpts);
    drawShadowedText(ctx, `FPS: ${Math.round(fps)}`, 150, 80, textOpts);
    drawShadowedText(ctx, `Tracking: ${currentTarget.name}`, 150, 100, textOpts);
    drawShadowedText(ctx, `(X: ${currentTarget.position.x.toFixed(1)}, Y: ${currentTarget.position.y.toFixed(1)})`, 150, 120, textOpts);

    // Compass target selector (below compass)
    const selectorY = 155;
    const selectorCenterX = 80;
    const btnSize = 32;
    const longBtnW = 96;
    const longBtnH = 32;

    // Left button
    if (targets.length > 1) {
        const leftBtnX = selectorCenterX - longBtnW / 2 - btnSize;
        const leftBtnHovered = mousePos.x >= leftBtnX && mousePos.x <= leftBtnX + btnSize && mousePos.y >= selectorY && mousePos.y <= selectorY + btnSize;
        ctx.drawImage(txButton, leftBtnX, selectorY, btnSize, btnSize);
        if (leftBtnHovered) ctx.fillRect(leftBtnX, selectorY, btnSize, btnSize, "rgba(0, 0, 0, 0.1)");
        drawShadowedText(ctx, "<", leftBtnX + btnSize / 2, selectorY + btnSize / 2 + 1, { font: "monospace", size: 16, align: "center" as CanvasTextAlign, baseline: "middle" as CanvasTextBaseline });
    }

    // Center label
    const longBtnX = selectorCenterX - longBtnW / 2;
    ctx.drawImage(txButtonLong, longBtnX, selectorY, longBtnW, longBtnH);
    drawShadowedText(ctx, currentTarget.name, selectorCenterX, selectorY + longBtnH / 2 + 1, { font: "monospace", size: 11, align: "center" as CanvasTextAlign, baseline: "middle" as CanvasTextBaseline });

    // Right button
    if (targets.length > 1) {
        const rightBtnX = selectorCenterX + longBtnW / 2;
        const rightBtnHovered = mousePos.x >= rightBtnX && mousePos.x <= rightBtnX + btnSize && mousePos.y >= selectorY && mousePos.y <= selectorY + btnSize;
        ctx.drawImage(txButton, rightBtnX, selectorY, btnSize, btnSize);
        if (rightBtnHovered) ctx.fillRect(rightBtnX, selectorY, btnSize, btnSize, "rgba(0, 0, 0, 0.1)");
        drawShadowedText(ctx, ">", rightBtnX + btnSize / 2, selectorY + btnSize / 2 + 1, { font: "monospace", size: 16, align: "center" as CanvasTextAlign, baseline: "middle" as CanvasTextBaseline });
    }

    for (let i = 0; i < player.inventory.length; i++) {
        let j = player.inventory.length - 1 - i; // reverse order for right-to-left
        const slotHovered = mousePos.x >= ctx.width - 100 - j * 68 && mousePos.x <= ctx.width - 36 - j * 68 && mousePos.y >= ctx.height - 94 && mousePos.y <= ctx.height - 30;
        drawInventorySlot(ctx, ctx.width - 100 - j * 68, ctx.height - 94, player.inventory[i], slotHovered, i === selectedSlot);
    }

    // Display held item name above inventory
    if (selectedSlot >= 0 && selectedSlot < player.inventory.length) {
        const item = player.inventory[selectedSlot].item;
        const name = getItemDisplayName(item);
        drawShadowedText(ctx, name, ctx.width - 50, ctx.height - 110, {
            font: "monospace",
            size: 14,
            align: "right" as CanvasTextAlign,
            baseline: "alphabetic" as CanvasTextBaseline,
        });
        const action = getItemAction(item);
        if (action) {
            drawShadowedText(ctx, `Press [E] to ${action}`, ctx.width / 2, ctx.height - 128, {
                font: "monospace",
                size: 24,
                align: "center" as CanvasTextAlign,
                baseline: "alphabetic" as CanvasTextBaseline,
                color: "#88ff88",
            });
        }
    }

    // Draw crafting buttons
    for (let i = 0; i < RECIPES.length; i++) {
        const recipe = RECIPES[i];
        const btnX = 30 + i * 70;
        const btnY = ctx.height - 94;
        const canCraft = canCraftRecipe(recipe, player);
        const hovered = mousePos.x >= btnX && mousePos.x <= btnX + 64 && mousePos.y >= btnY && mousePos.y <= btnY + 64;

        drawCraftingButton(ctx, btnX, btnY, recipe.result, hovered, !canCraft);

        // Tooltip on hover
        if (hovered) {
            const ingredients = Object.entries(recipe.ingredients) as [ItemId, number][];
            for (let j = 0; j < ingredients.length; j++) {
                const [itemId, needed] = ingredients[j];
                const have = getItemCount(player, itemId);
                const color = have >= needed ? "#ffffff" : "#ff4444";
                const lineY = btnY - 20 - j * 18;
                drawShadowedText(ctx, `${needed}x ${getItemDisplayName(itemId)}`, btnX, lineY, {
                    font: "monospace",
                    size: 13,
                    color,
                    align: "left" as CanvasTextAlign,
                    baseline: "alphabetic" as CanvasTextBaseline,
                });
            }
        }
    }
}