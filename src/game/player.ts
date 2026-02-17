import { Vec2, Entity, RenderContext, InputHandler } from "../engine/index.js";
import { getImage } from "./tiles.js";

const playerImgs = {
  base: getImage("/assets/entities/player/base.png"),
  right: getImage("/assets/entities/player/right.png"),
  left: getImage("/assets/entities/player/left.png"),
  eye: getImage("/assets/entities/player/eye.png"),
};

export class Player extends Entity {
  velocity: Vec2;
  lastWorldGenPos: Vec2;
  footsteps: { position: Vec2; lifetime: number; scale: number }[];
  footstepTimer: number;

  private input: InputHandler;
  private generateSurroundings: (center: Vec2, radius: number) => void;

  constructor(
    position: Vec2,
    input: InputHandler,
    generateSurroundings: (center: Vec2, radius: number) => void,
  ) {
    super(position);
    this.velocity = Vec2.zero();
    this.lastWorldGenPos = position.clone();
    this.footsteps = [];
    this.footstepTimer = 0;
    this.input = input;
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
      ctx.ctx.fillStyle = `rgba(255, 255, 255)`;
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

    const { worldPos: mousePos } = this.input.getMousePos();

    const direction = mousePos.sub(this.position).normalized();
    const eyeOffset = direction.scale(0.01);
    eyeBaseOffsets = eyeBaseOffsets.map(offset => offset.add(eyeOffset));

    for (const offset of eyeBaseOffsets) {
      const eyePos = this.position.add(offset);
      ctx.drawImage(playerImgs.eye, eyePos.x - 0.35, eyePos.y - 0.35, 0.7, 0.7);
    }
  }

  update(_dt: number): void {
    this.position = this.position.add(this.velocity.scale(_dt * 10));

    let acceleration = Vec2.zero();

    if (this.input.isKeyDown("w")) acceleration.y -= 1;
    if (this.input.isKeyDown("s")) acceleration.y += 1;
    if (this.input.isKeyDown("a")) acceleration.x -= 1;
    if (this.input.isKeyDown("d")) acceleration.x += 1;

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
