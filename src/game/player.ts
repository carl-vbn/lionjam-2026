import { Vec2, Entity, ParticleSystem, RenderContext, InputHandler, World, attachHint } from "../engine/index.js";
import { createWhiteSilhouette, getImage } from "../engine/image.js";
import { NaturalTile } from "./tiles.js";
import { dropItems, getItemAction, getItemSprite, ItemId } from "./items.js";
import { getSelectedSlot } from "./ui.js";
import { smokeSprite, Enemy } from "./enemy.js";
import { Campfire } from "./placeables.js";

const playerImgs = {
  base: getImage("/assets/entities/player/base.png"),
  right: getImage("/assets/entities/player/right.png"),
  left: getImage("/assets/entities/player/left.png"),
  eye: getImage("/assets/entities/player/eye.png"),
};

const SWING_DURATION = 0.25;
const SWING_ANGLE = Math.PI / 2; // 90 degrees total arc
const WATER_DRAIN_RATE = 100 / 300; // depletes fully in 5 minutes
const HUNGER_DRAIN_RATE = 100 / 600; // depletes fully in 10 minutes
const STARVE_DAMAGE = 5; // damage taken every interval when starving
const STARVE_DAMAGE_INTERVAL = 2;

const whiteSilhouettes: { base: HTMLImageElement | null; right: HTMLImageElement | null; left: HTMLImageElement | null } = {
  base: null, right: null, left: null,
};
createWhiteSilhouette(playerImgs.base).then((img) => { whiteSilhouettes.base = img; });
createWhiteSilhouette(playerImgs.right).then((img) => { whiteSilhouettes.right = img; });
createWhiteSilhouette(playerImgs.left).then((img) => { whiteSilhouettes.left = img; });

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
  knockbackVelocity: Vec2 = Vec2.zero();
  lastWorldGenPos: Vec2;
  footsteps: { position: Vec2; lifetime: number; scale: number; color: string }[];
  footstepTimer: number;
  inventory: InventorySlot[] = [];
  health = 100;
  water = 100;
  hunger = 100;
  flashTimer = 0;
  starveTimer = 0;
  chargingEnemies: Set<Enemy> = new Set();
  private swingTimer = 0;
  private dead = false;
  private respawnTimer = 0;

  swingItem(): void {
    this.swingTimer = SWING_DURATION;
  }

  applyKnockback(direction: Vec2): void {
    this.knockbackVelocity = this.knockbackVelocity.add(direction);
  }

  takeDamage(amount: number): void {
    if (this.dead) return;
    this.health -= amount;
    this.flashTimer = 0.15;

    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }

  private die(): void {
    this.dead = true;
    this.velocity = Vec2.zero();
    this.knockbackVelocity = Vec2.zero();
    this.respawnTimer = 3;

    // Smoke particles
    ParticleSystem.getInstance().spawn({
      sprite: smokeSprite,
      count: 12,
      position: this.position.add(new Vec2(0, -0.35)),
      size: 0.4,
      lifetime: 0.8,
      speed: 1.5,
    });

    // Drop all items
    const items: Partial<Record<ItemId, number>> = {};
    for (const slot of this.inventory) {
      items[slot.item] = (items[slot.item] ?? 0) + slot.quantity;
    }
    dropItems(this._world, this.position, items);
    this.inventory = [];
    this.chargingEnemies.clear();
  }

  get isDead(): boolean {
    return this.dead;
  }

  addItem(itemId: ItemId, quantity = 1): void {
    const existing = this.inventory.find(slot => slot.item === itemId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.inventory.push({ item: itemId, quantity });
    }
  }

  removeItem(itemId: ItemId, quantity = 1): void {
    const index = this.inventory.findIndex(slot => slot.item === itemId);
    if (index === -1) return;
    this.inventory[index].quantity -= quantity;
    if (this.inventory[index].quantity <= 0) {
      this.inventory.splice(index, 1);
    }
  }

  replaceHeldItem(newItemId: ItemId): void {
    const slot = getSelectedSlot();
    if (slot < 0 || slot >= this.inventory.length) return;
    const heldSlot = this.inventory[slot];
    if (heldSlot.quantity > 1) {
      heldSlot.quantity--;
      this.inventory.splice(slot + 1, 0, { item: newItemId, quantity: 1 });
    } else {
      heldSlot.item = newItemId;
    }
  }

  attackNearestEnemy(): void {
    if (this.dead || this.chargingEnemies.size === 0) return;
    let nearest: Enemy | null = null;
    let nearestDistSq = Infinity;
    for (const enemy of this.chargingEnemies) {
      const dSq = this.position.distanceSquaredTo(enemy.position);
      if (dSq < nearestDistSq) {
        nearestDistSq = dSq;
        nearest = enemy;
      }
    }
    if (nearest) {
      nearest.onClick(nearest.position);
    }
  }

  isHolding(itemId: ItemId): boolean {
    if (this.dead) return false;
    
    const slot = getSelectedSlot();
    if (slot < 0 || slot >= this.inventory.length) return false;
    return this.inventory[slot].item === itemId;
  }

  private useSelectedItem(): void {
    const slot = getSelectedSlot();
    if (slot < 0 || slot >= this.inventory.length) return;
    const itemId = this.inventory[slot].item;
    const action = getItemAction(itemId);
    if (!action) return;

    switch (itemId) {
      case ItemId.Coconut:
        this.water = Math.min(100, this.water + 40);
        this.hunger = Math.min(100, this.hunger + 10);
        break;
      case ItemId.Mango:
        this.hunger = Math.min(100, this.hunger + 30);
        this.water = Math.min(100, this.water + 10);
        break;
      case ItemId.CookedMeat:
        this.hunger = Math.min(100, this.hunger + 40);
        this.water = Math.max(0, this.water - 5);
        break;
      case ItemId.RawMeat:
        this.hunger = Math.min(100, this.hunger + 20);
        this.water = Math.max(0, this.water - 20);
        this.takeDamage(10);
        break;
      case ItemId.Waterbottle:
      case ItemId.DrinkablePot:
        this.water = Math.min(100, this.water + 50);
        break;
      case ItemId.Medkit:
        this.health = 100;
        ParticleSystem.getInstance().spawn({
          sprite: getItemSprite(ItemId.Medkit),
          count: 6,
          position: this.position.add(new Vec2(0, -0.35)),
          size: 0.2,
          lifetime: 0.6,
          speed: 1,
        });
        break;
      case ItemId.Campfire:
        const tileX = Math.floor(this.position.x);
        const tileY = Math.floor(this.position.y);
        const tile = this._world.getTile(tileX, tileY);
        if (tile && !tile.solid) {
          this._world.addEntity(new Campfire(new Vec2(tileX + 0.5, tileY + 0.5), this._world));
        }
        break;
    }
    this.removeItem(itemId);
  }

  private _world: World;
  private generateSurroundings: (center: Vec2, radius: number) => void;
  private keyListenerRegistered = false;
  private moveHintTimer = 2;

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
    this._world = world;
    this.generateSurroundings = generateSurroundings;
    this.layer = 1;
    this.dynamic = true;
  }

  draw(ctx: RenderContext): void {
    if (this.dead) return;

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
    const movingRight = this.velocity.x > 0.1;
    const movingLeft = this.velocity.x < -0.1;
    const img = movingRight ? playerImgs.right : movingLeft ? playerImgs.left : playerImgs.base;
    const whiteImg = this.flashTimer > 0
      ? (movingRight ? whiteSilhouettes.right : movingLeft ? whiteSilhouettes.left : whiteSilhouettes.base)
      : null;

    ctx.drawImage(whiteImg ?? img, this.position.x - 0.75 / 2, this.position.y - 0.75, 0.75, 0.75);

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

      // Swing animation: rotate the item around the hand (bottom-center of item)
      let swingRotation = 0;
      if (this.swingTimer > 0) {
        const t = 1 - this.swingTimer / SWING_DURATION; // 0→1
        // Quick swing arc: start raised, sweep down past rest, ease back
        swingRotation = SWING_ANGLE * (1 - 2 * t) * (facingRight ? -1 : 1);
      }

      const pivotX = itemX + itemSize / 2;
      const pivotY = itemY + itemSize;

      if (swingRotation !== 0) {
        ctx.pushTransform({ rotation: swingRotation, center: new Vec2(pivotX, pivotY) });
      }

      if (!facingRight) {
        ctx.pushTransform({ scale: new Vec2(-1, 1), center: new Vec2(itemX + itemSize / 2, itemY + itemSize / 2) });
        ctx.drawImage(itemSprite, itemX, itemY, itemSize, itemSize);
        ctx.popTransform();
      } else {
        ctx.drawImage(itemSprite, itemX, itemY, itemSize, itemSize);
      }

      if (swingRotation !== 0) {
        ctx.popTransform();
      }
    }
  }

  update(_dt: number): void {
    if (this.dead) {
      this.respawnTimer -= _dt;
      if (this.respawnTimer <= 0) {
        this.dead = false;
        this.position = Vec2.zero();
        this.health = 50;
        this.water = 100;
        this.hunger = 100;
        this.velocity = Vec2.zero();
        this.knockbackVelocity = Vec2.zero();
        this.generateSurroundings(this.position, 12);
        this.lastWorldGenPos = this.position.clone();
      }
      return;
    }

    if (!this.keyListenerRegistered) {
      InputHandler.getInstance().onKey((key, down) => {
        if (key === "e" && down && !this.dead) this.useSelectedItem();
      });
      this.keyListenerRegistered = true;
    }

    if (this.moveHintTimer > 0) {
      this.moveHintTimer -= _dt;
      if (this.moveHintTimer <= 0) {
        attachHint(this, "Use W, A, S, D to move", this._world, new Vec2(0, 0.5))
          .destroyAfter(3);
      }
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= _dt;
    }
    if (this.swingTimer > 0) {
      this.swingTimer -= _dt;
    }
    if (this.starveTimer > 0) {
      this.starveTimer -= _dt;
    }

    this.water = Math.max(0, this.water - WATER_DRAIN_RATE * _dt);
    this.hunger = Math.max(0, this.hunger - HUNGER_DRAIN_RATE * _dt);

    if ((this.water === 0 || this.hunger === 0) && this.starveTimer <= 0) {
      this.takeDamage(STARVE_DAMAGE);
      this.starveTimer = STARVE_DAMAGE_INTERVAL;
    }

    // Decay knockback smoothly
    const knockbackDecay = Math.pow(0.02, _dt);
    this.knockbackVelocity = this.knockbackVelocity.scale(knockbackDecay);
    if (this.knockbackVelocity.lengthSquared() < 0.001) {
      this.knockbackVelocity = Vec2.zero();
    }

    const totalVelocity = this.velocity.scale(_dt * 12 * ((this.hunger + 50) / 150)).add(this.knockbackVelocity.scale(_dt));
    const newPos = this.position.add(totalVelocity);
    const futurePos = this.position.add(totalVelocity.normalized().scale(_dt * 20));
    const tileX = Math.floor(futurePos.x);
    const tileY = Math.floor(futurePos.y);
    const tile = this._world.getTile(tileX, tileY);
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

  get world(): World {
    return this._world;
  }
}
