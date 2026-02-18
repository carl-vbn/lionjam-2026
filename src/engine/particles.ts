import { Vec2 } from "./vec2.js";
import { RenderContext } from "./render-context.js";

/**
 * Describes a region of an image to sample particle chunks from.
 */
export interface ParticleSource {
  image: CanvasImageSource;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * Extract random square chunks from a source image region.
 * Returns an array of small canvases, each containing a random piece of the source.
 */
export function extractTextureChunks(
  source: ParticleSource,
  count: number,
  chunkSize: number = 16,
): HTMLCanvasElement[] {
  const { image, sx, sy, sw, sh } = source;
  const chunks: HTMLCanvasElement[] = [];

  for (let i = 0; i < count; i++) {
    const cx = sx + Math.floor(Math.random() * Math.max(1, sw - chunkSize));
    const cy = sy + Math.floor(Math.random() * Math.max(1, sh - chunkSize));
    const size = Math.min(chunkSize, sw, sh);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, cx, cy, size, size, 0, 0, size, size);
    chunks.push(canvas);
  }

  return chunks;
}

interface Particle {
  position: Vec2;
  velocity: Vec2;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  age: number;
  sprite: HTMLImageElement | HTMLCanvasElement;
}

export interface ParticleEffectOptions {
  /** Single sprite used for all particles. */
  sprite?: HTMLImageElement | HTMLCanvasElement;
  /** Array of sprites — each particle picks one at random. Takes priority over sprite. */
  sprites?: (HTMLImageElement | HTMLCanvasElement)[];
  count: number;
  position: Vec2;
  /** Size of each particle in tile units. Default 0.25. */
  size?: number;
  /** How long the effect lasts in seconds. Default 1. */
  lifetime?: number;
  /** How fast particles expand outward in tiles/second. Default 2. */
  speed?: number;
}

/**
 * A simple one-shot particle effect.
 * Particles spawn at a position, expand outward with random rotations, and fade out.
 */
export class ParticleEffect {
  private particles: Particle[] = [];
  private size: number;
  private lifetime: number;
  private _finished: boolean = false;

  get finished(): boolean {
    return this._finished;
  }

  constructor(options: ParticleEffectOptions) {
    const sprites = options.sprites;
    const fallbackSprite = options.sprite;
    if (!sprites && !fallbackSprite) {
      throw new Error("ParticleEffectOptions must have either sprite or sprites");
    }

    this.size = options.size ?? 0.25;
    this.lifetime = options.lifetime ?? 1;
    const speed = options.speed ?? 2;

    for (let i = 0; i < options.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.5 + Math.random() * 0.5);
      const particleSprite = sprites
        ? sprites[Math.floor(Math.random() * sprites.length)]
        : fallbackSprite!;
      this.particles.push({
        position: options.position.clone(),
        velocity: Vec2.fromAngle(angle, spd),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 6,
        alpha: 1,
        age: 0,
        sprite: particleSprite,
      });
    }
  }

  update(dt: number): void {
    if (this._finished) return;

    let allDead = true;
    for (const p of this.particles) {
      p.age += dt;
      if (p.age >= this.lifetime) {
        p.alpha = 0;
        continue;
      }
      allDead = false;
      p.position = p.position.add(p.velocity.scale(dt));
      p.rotation += p.rotationSpeed * dt;
      p.alpha = 1 - p.age / this.lifetime;
    }

    if (allDead) this._finished = true;
  }

  draw(ctx: RenderContext): void {
    if (this._finished) return;

    const half = this.size / 2;
    for (const p of this.particles) {
      if (p.alpha <= 0) continue;
      ctx.setAlpha(p.alpha);
      ctx.pushTransform({
        translation: p.position,
        rotation: p.rotation,
        center: new Vec2(half, half),
      });
      ctx.drawImage(p.sprite, 0, 0, this.size, this.size);
      ctx.popTransform();
    }
    ctx.resetAlpha();
  }
}

/**
 * Manages multiple particle effects, automatically cleaning up finished ones.
 */
export class ParticleSystem {
  private effects: ParticleEffect[] = [];

  spawn(options: ParticleEffectOptions): ParticleEffect {
    const effect = new ParticleEffect(options);
    this.effects.push(effect);
    return effect;
  }

  update(dt: number): void {
    for (const effect of this.effects) {
      effect.update(dt);
    }
    this.effects = this.effects.filter((e) => !e.finished);
  }

  draw(ctx: RenderContext): void {
    for (const effect of this.effects) {
      effect.draw(ctx);
    }
  }
}
