import { Entity } from "./entity.js";
import { getImage } from "./image.js";
import { RenderContext } from "./render-context.js";
import { Vec2 } from "./vec2.js";
import { World } from "./world.js";

const txSpike = getImage("/assets/ui/spike.png");

export interface HintHandle {
  destroy(): void;
  destroyAfter(seconds: number): void;
}

class HintEntity extends Entity {
  private host: Entity;
  private lines: string[];
  private world: World;
  private offset: Vec2;

  private animTime = 0;
  private totalTime = 0;
  private destroying = false;
  private autoDestroyAfter: number | null = null;

  private static readonly POPUP_DURATION = 0.2;
  private static readonly DEPOP_DURATION = 0.15;

  constructor(host: Entity, text: string | string[], world: World, offset: Vec2) {
    super(host.position.clone());
    this.host = host;
    this.lines = Array.isArray(text) ? text : [text];
    this.world = world;
    this.offset = offset;
    this.layer = 100;
    this.dynamic = true;
    this.size = new Vec2(1, 1);
  }

  startDestroy(): void {
    if (this.destroying) return;
    this.destroying = true;
    this.animTime = 0;
  }

  destroyAfter(seconds: number): void {
    this.autoDestroyAfter = seconds;
  }

  update(dt: number): void {
    this.animTime += dt;
    this.totalTime += dt;
    this.position = this.host.position.add(this.offset);

    if (this.destroying && this.animTime >= HintEntity.DEPOP_DURATION) {
      this.world.removeEntity(this);
    }

    if (!this.destroying && this.autoDestroyAfter !== null && this.totalTime >= this.autoDestroyAfter) {
      this.startDestroy();
    }
  }

  draw(ctx: RenderContext): void {
    let scaleY: number;
    let alpha: number;

    if (this.destroying) {
      // Ease-in cubic: t^3
      const t = Math.min(this.animTime / HintEntity.DEPOP_DURATION, 1);
      const ease = t * t * t;
      scaleY = 1 - ease;
      alpha = 1 - ease;
    } else if (this.animTime < HintEntity.POPUP_DURATION) {
      // Ease-out cubic: 1 - (1-t)^3
      const t = this.animTime / HintEntity.POPUP_DURATION;
      const ease = 1 - (1 - t) * (1 - t) * (1 - t);
      scaleY = ease;
      alpha = ease;
    } else {
      scaleY = 1;
      alpha = 1;
    }

    if (alpha <= 0) return;

    const bob = Math.sin(this.totalTime * 2.5) * 0.04;

    const lineHeight = 0.22;
    const lineCount = this.lines.length;
    const rectHeight = 0.3 + (lineCount - 1) * lineHeight;
    const maxLineLen = Math.max(...this.lines.map(l => l.length));
    const rectWidth = Math.max(1, maxLineLen * 0.08);

    // Hint is drawn above the host entity. The spike sits at the top of the entity,
    // and the dark rect + text sit above that.
    const baseY = this.position.y - 2;
    const spikeY = baseY + bob;
    const rectY = baseY - rectHeight + bob;

    ctx.setAlpha(alpha);
    ctx.pushTransform({
      scale: new Vec2(1, scaleY),
      center: new Vec2(this.position.x, baseY + 0.13), // pivot at bottom of hint (spike base)
    });

    ctx.ctx.imageSmoothingEnabled = true;
    ctx.drawImage(txSpike, this.position.x - 0.125, spikeY, 0.25, 0.13);
    ctx.fillRect(this.position.x - rectWidth / 2, rectY, rectWidth, rectHeight, "rgba(0, 0, 0, 0.75)");
    for (let i = 0; i < lineCount; i++) {
      ctx.drawText(this.lines[i], this.position.x, rectY - 0.08 + i * lineHeight, {
        align: "center",
        baseline: "middle",
        size: 0.15,
        color: "white",
      });
    }
    ctx.ctx.imageSmoothingEnabled = false;

    ctx.popTransform();
    ctx.resetAlpha();
  }
}

export function attachHint(
  entity: Entity,
  text: string | string[],
  world: World,
  offset: Vec2 = Vec2.zero(),
): HintHandle {
  const hint = new HintEntity(entity, text, world, offset);
  world.addEntity(hint);
  return {
    destroy() {
      hint.startDestroy();
    },
    destroyAfter(seconds: number) {
      hint.destroyAfter(seconds);
    }
  };
}
