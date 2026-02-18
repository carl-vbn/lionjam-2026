import { Entity, InputHandler, ParticleSystem, RenderContext, Vec2, World } from "../engine/index.js";
import { createOutlinedImage, createWhiteSilhouette, getImage } from "../engine/image.js";
import { Player } from "./player.js";

// Smoke particle sprite (soft grey circle)
export const smokeSprite = (() => {
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(180, 180, 180, 1)");
    gradient.addColorStop(1, "rgba(180, 180, 180, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return canvas;
})();

const txIdle = getImage("/assets/entities/enemy/idle.png");
const txAttack = getImage("/assets/entities/enemy/attack.png");

const outlinedAssets: { idle: HTMLImageElement | null; attack: HTMLImageElement | null } = {
    idle: null,
    attack: null,
};
const whiteAssets: { idle: HTMLImageElement | null; attack: HTMLImageElement | null } = {
    idle: null,
    attack: null,
};

createOutlinedImage(txIdle, 2, "red").then((img) => { outlinedAssets.idle = img; });
createOutlinedImage(txAttack, 2, "red").then((img) => { outlinedAssets.attack = img; });
createWhiteSilhouette(txIdle).then((img) => { whiteAssets.idle = img; });
createWhiteSilhouette(txAttack).then((img) => { whiteAssets.attack = img; });

const AGGRO_RANGE = 5;
const AGGRO_RANGE_SQ = AGGRO_RANGE * AGGRO_RANGE;
const DISABLE_DISTANCE = 16;
const DISABLE_DISTANCE_SQ = DISABLE_DISTANCE * DISABLE_DISTANCE;
const IDLE_SPEED = 1.5;
const CHARGE_SPEED = 3;
const KNOCKBACK_STRENGTH = 10;
const IMPACT_DISTANCE_SQ = 0.25; // 0.5 tiles
const IMPACT_COOLDOWN = 0.5;

export class Enemy extends Entity {
    private world: World;
    private health = 50;
    private attacking = false;
    private hovered = false;
    private flashTimer = 0;
    private velocity = Vec2.zero();
    private wanderTarget: Vec2;
    private impactCooldown = 0;

    constructor(position: Vec2, world: World) {
        super(position);
        this.world = world;
        this.layer = 1;
        this.size = new Vec2(1, 1);
        this.dynamic = true;
        this.wanderTarget = this.pickWanderTarget();
    }

    get clickable(): boolean {
        return this.hovered;
    }

    private pickWanderTarget(): Vec2 {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 10;
        return this.position.add(new Vec2(Math.cos(angle) * radius, Math.sin(angle) * radius));
    }

    onClick(_worldPos: Vec2): void {
        this.health -= 10;
        this.flashTimer = 0.15;

        if (this.health <= 0) {
            ParticleSystem.getInstance().spawn({
                sprite: smokeSprite,
                count: 10,
                position: this.position.add(new Vec2(0, -0.35)),
                size: 0.4,
                lifetime: 0.6,
                speed: 1.5,
            });
            this.world.removeEntity(this);
        }
    }

    update(dt: number): void {
        if (this.impactCooldown > 0) {
            this.impactCooldown -= dt;
        }

        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
        }

        const player = Player.getInstance();
        const toPlayer = player.position.sub(this.position);
        const distSq = toPlayer.lengthSquared();

        if (distSq > DISABLE_DISTANCE_SQ) {
            return; // Too far from player, skip update
        }

        // Hover detection
        const { worldPos: mousePos } = InputHandler.getInstance().getMousePos();
        this.hovered = Math.abs(mousePos.x - this.position.x) < 0.4 &&
                       mousePos.y < this.position.y &&
                       mousePos.y > this.position.y - 0.75;


        if (distSq < AGGRO_RANGE_SQ && !player.isDead) {
            // Attack mode
            this.attacking = true;

            if (distSq < IMPACT_DISTANCE_SQ) {
                // Back off after impact
                const dir = toPlayer.normalized();
                this.velocity = dir.scale(-CHARGE_SPEED * 0.5);
            } else {
                const dir = toPlayer.normalized();
                this.velocity = dir.scale(CHARGE_SPEED);
            }

            // Impact check
            if (distSq < IMPACT_DISTANCE_SQ && this.impactCooldown <= 0) {
                const knockDir = toPlayer.normalized().scale(KNOCKBACK_STRENGTH);
                player.applyKnockback(knockDir);
                player.takeDamage(10);
                this.impactCooldown = IMPACT_COOLDOWN;
            }
        } else {
            // Idle wander mode
            this.attacking = false;

            const toTarget = this.wanderTarget.sub(this.position);
            if (toTarget.lengthSquared() < 0.5) {
                this.wanderTarget = this.pickWanderTarget();
            }

            this.velocity = toTarget.normalized().scale(IDLE_SPEED);
        }

        this.position = this.position.add(this.velocity.scale(dt));
    }

    draw(ctx: RenderContext): void {
        // Shadow
        ctx.fillEllipse(this.position.x, this.position.y, 0.25, 0.12, "rgba(0, 0, 0, 0.3)");

        const baseSprite = this.attacking ? txAttack : txIdle;
        const outlinedSprite = this.attacking ? outlinedAssets.attack : outlinedAssets.idle;
        const whiteSprite = this.attacking ? whiteAssets.attack : whiteAssets.idle;

        const facingRight = this.velocity.x >= 0;
        const drawW = 0.75;
        const drawH = 0.75;
        const drawX = this.position.x - drawW / 2;
        const drawY = this.position.y - drawH + 0.15;

        let sprite: HTMLImageElement;
        let w = drawW;
        let h = drawH;
        let x = drawX;
        let y = drawY;

        if (this.flashTimer > 0 && whiteSprite) {
            sprite = whiteSprite;
        } else if (this.hovered && outlinedSprite) {
            sprite = outlinedSprite;
            // Outlined images have padding; scale to keep inner sprite at original size
            if (baseSprite.naturalWidth > 0) {
                w = drawW * (sprite.naturalWidth / baseSprite.naturalWidth);
                h = drawH * (sprite.naturalHeight / baseSprite.naturalHeight);
                x = this.position.x - w / 2;
                y = this.position.y - h + (h - drawH) / 2 + 0.15;
            }
        } else {
            sprite = baseSprite;
        }

        if (!facingRight) {
            ctx.pushTransform({ scale: new Vec2(-1, 1), center: new Vec2(x + w / 2, y + h / 2) });
            ctx.drawImage(sprite, x, y, w, h);
            ctx.popTransform();
        } else {
            ctx.drawImage(sprite, x, y, w, h);
        }

        // Health bar (only when damaged)
        if (this.health < 50) {
            const barWidth = 0.6;
            const barHeight = 0.06;
            const barX = this.position.x - barWidth / 2;
            const barY = drawY;
            ctx.fillRect(barX, barY, barWidth, barHeight, "rgba(0, 0, 0, 0.5)");
            ctx.fillRect(barX, barY, barWidth * (this.health / 50), barHeight, "#cc2222");
        }
    }
}
