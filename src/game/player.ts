import { Vec2, Entity, RenderContext, InputHandler, World } from "../engine/index.js";
import { getImage } from "../engine/image.js";
import { NaturalTile } from "./tiles.js";
import { getItemSprite, ItemId } from "./items.js";
import { getSelectedSlot } from "./ui.js";

const playerImgs = {
  base: getImage("/assets/entities/player/base.png"),
  right: getImage("/assets/entities/player/right.png"),
  left: getImage("/assets/entities/player/left.png"),
  eye: getImage("/assets/entities/player/eye.png"),
};

export type InventorySlot = {
  item: ItemId;
  quantity: number;
};

export class Player extends Entity {
  private static instance: Player | null = null;

  static getInstance(): Player {
    if (!Player.instance) {
      throw new Error("Player not initialized. Create a Player instance first.");
    }
    return Player.instance;
  }

  velocity: Vec2;
  lastWorldGenPos: Vec2;
  footsteps: { position: Vec2; lifetime: number; scale: number; color: string }[];
  footstepTimer: number;
  inventory: InventorySlot[] = [];

  addItem(itemId: ItemId, quantity = 1): void {
    const existing = this.inventory.find(slot => slot.item === itemId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.inventory.push({ item: itemId, quantity });
    }
  }

  private world: World;
  private generateSurroundings: (center: Vec2, radius: number) => void;

  constructor(
    position: Vec2,
    world: World,
    generateSurroundings: (center: Vec2, radius: number) => void,
  ) {
    super(position);
    Player.instance = this;
    this.velocity = Vec2.zero();
    this.lastWorldGenPos = position.clone();
    this.footsteps = [];
    this.footstepTimer = 0;
    this.world = world;
    this.generateSurroundings = generateSurroundings;
    this.layer = 1;
    this.dynamic = true;
  }

  draw(ctx: RenderContext): void {
    // Draw shadow (at feet)
    ctx.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.ctx.beginPath();
    ctx.ctx.ellipse(this.position.x, this.position.y - 0.075, 0.4, 0.15, 0, 0, Math.PI * 2);
    ctx.ctx.fill();

    // Draw footsteps
    this.footsteps.forEach((footstep) => {
      ctx.ctx.fillStyle = footstep.color;
      const size = footstep.scale * 0.1;
      ctx.ctx.fillRect(
        footstep.position.x - size / 2,
        footstep.position.y - size / 2,
        size,
        size
      );
    });

    // Draw player (sprite extends upward from bottom-center pivot)
    const img = this.velocity.x > 0.1 ? playerImgs.right : this.velocity.x < -0.1 ? playerImgs.left : playerImgs.base;
    ctx.drawImage(img, this.position.x - 0.75 / 2, this.position.y - 0.75, 0.75, 0.75);

    // Draw eyes
    let eyeBaseOffsets = [new Vec2(-0.21, -0.335), new Vec2(0.03, -0.36)];

    if (this.velocity.x > 0.1) {
      eyeBaseOffsets = [new Vec2(0.02, -0.385)];
    } else if (this.velocity.x < -0.1) {
      eyeBaseOffsets = [new Vec2(-0.28, -0.385)];
    }

    const { worldPos: mousePos } = InputHandler.getInstance().getMousePos();

    const direction = mousePos.sub(this.position).normalized();
    const eyeOffset = direction.scale(0.01);
    eyeBaseOffsets = eyeBaseOffsets.map(offset => offset.add(eyeOffset));

    for (const offset of eyeBaseOffsets) {
      const eyePos = this.position.add(offset);
      ctx.drawImage(playerImgs.eye, eyePos.x - 0.35, eyePos.y - 0.35, 0.7, 0.7);
    }

    // Draw held item
    const slot = getSelectedSlot();
    if (slot >= 0 && slot < this.inventory.length) {
      const itemSprite = getItemSprite(this.inventory[slot].item);
      const moving = Math.abs(this.velocity.x) > 0.1;
      const facingRight = moving ? this.velocity.x > 0 : mousePos.x > this.position.x;
      const itemSize = 0.35;
      const offsetX = facingRight ? 0.3 : -0.3;
      const itemX = this.position.x + offsetX - itemSize / 2;
      const itemY = this.position.y - 0.35 - itemSize / 2;

      if (!facingRight) {
        // Flip horizontally around the item center
        const centerX = itemX + itemSize / 2;
        ctx.ctx.save();
        ctx.ctx.translate(centerX, 0);
        ctx.ctx.scale(-1, 1);
        ctx.ctx.translate(-centerX, 0);
        ctx.drawImage(itemSprite, itemX, itemY, itemSize, itemSize);
        ctx.ctx.restore();
      } else {
        ctx.drawImage(itemSprite, itemX, itemY, itemSize, itemSize);
      }
    }
  }

  update(_dt: number): void {
    const newPos = this.position.add(this.velocity.scale(_dt * 10));
    const futurePos = this.position.add(this.velocity.normalized().scale(_dt * 20));
    const tileX = Math.floor(futurePos.x);
    const tileY = Math.floor(futurePos.y);
    const tile = this.world.getTile(tileX, tileY);
    const onWater = tile instanceof NaturalTile && tile.wet;
    if (tile && tile.solid) {
      this.velocity = Vec2.zero();
    } else {
      this.position = newPos;
    }

    let acceleration = Vec2.zero();

    if (InputHandler.getInstance().isKeyDown("w")) acceleration.y -= 1;
    if (InputHandler.getInstance().isKeyDown("s")) acceleration.y += 1;
    if (InputHandler.getInstance().isKeyDown("a")) acceleration.x -= 1;
    if (InputHandler.getInstance().isKeyDown("d")) acceleration.x += 1;

    if (acceleration.length() > 0) {
      acceleration = acceleration.normalized().scale(0.1);
    }

    this.velocity = this.velocity.add(acceleration.scale(_dt * 60)).scale(0.8);

    // Spawn footsteps at set intervals
    this.footstepTimer -= _dt;
    if (this.velocity.length() > 0.1 && this.footstepTimer <= 0) {
      for (let i = 0; i < 3; i++) {
        const randomOffset = new Vec2(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        );
        this.footsteps.push({
          position: this.position.add(new Vec2(0, -0.175)).add(randomOffset),
          lifetime: 0.5,
          scale: 0.3,
          color: onWater ? "rgba(64, 159, 153, 0.7)" : "rgba(255, 255, 255, 1)",
        });
      }
      this.footstepTimer = 0.15;
    }

    // Update footsteps' lifetime, scale, and remove expired ones
    this.footsteps = this.footsteps.filter((footstep) => {
      footstep.lifetime -= _dt;
      if (footstep.lifetime > 0.25) {
        footstep.scale += _dt * 5; // Scale up quickly
      } else {
        footstep.scale -= _dt * 0.5; // Shrink slowly
      }
      return footstep.lifetime > 0;
    });

    if (this.position.distanceTo(this.lastWorldGenPos) > 6) {
      this.generateSurroundings(this.position, 12);
      this.lastWorldGenPos = this.position.clone();
    }
  }
}
