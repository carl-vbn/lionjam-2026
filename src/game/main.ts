import {
  Vec2, Camera, createContext, World, Tile,
  RenderContext, InputHandler, createGameLoop, ParticleSystem,
  Flipbook,
} from "../engine/index.js";

// --- Example tile types ---

class GrassTile extends Tile {
  draw(ctx: RenderContext): void {
    ctx.fillRect(0, 0, 1, 1, "#4a7c3f");
    // Simple grass lines
    ctx.fillRect(0.2, 0.3, 0.05, 0.3, "#3a6c2f");
    ctx.fillRect(0.5, 0.2, 0.05, 0.35, "#3a6c2f");
    ctx.fillRect(0.75, 0.35, 0.05, 0.25, "#3a6c2f");
  }

  onClick(worldPos: Vec2): void {
    console.log(`Grass clicked at world (${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)})`);
  }
}

const waterFp = new Flipbook("assets/water.png", 3, 0.2);

class WaterTile extends Tile {
  private time = 0;

  update(dt: number): void {
    this.time += dt;
  }

  draw(ctx: RenderContext): void {
    const shade = Math.sin(this.time * 2 + this.position.x * 0.5) * 10;
    const r = 30 + shade;
    const g = 100 + shade;
    const b = 200 + shade;
    ctx.drawFlipbook(waterFp, 0, 0, 1, 1);
  }
}

class StoneTile extends Tile {
  draw(ctx: RenderContext): void {
    ctx.fillRect(0, 0, 1, 1, "#888888");
    ctx.fillRect(0.1, 0.1, 0.35, 0.35, "#777777");
    ctx.fillRect(0.55, 0.5, 0.35, 0.4, "#777777");
    ctx.strokeRect(0, 0, 1, 1, "#666666", 0.03);
  }

  onClick(worldPos: Vec2): void {
    console.log(`Stone clicked at world (${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)})`);
  }
}

// --- Setup ---

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const camera = new Camera(new Vec2(8, 8), 1);
const ctx = createContext({ canvas, camera, tileSize: 48 });
const world = new World();
const particles = new ParticleSystem();
const input = new InputHandler(ctx);
input.setWorld(world);

// Build a simple map
for (let y = 0; y < 16; y++) {
  for (let x = 0; x < 16; x++) {
    // Water border
    if (x === 0 || y === 0 || x === 15 || y === 15) {
      world.setTile(x, y, new WaterTile(x, y));
    }
    // Stone path down the middle
    else if (x === 7 || x === 8) {
      world.setTile(x, y, new StoneTile(x, y));
    }
    // Grass everywhere else
    else {
      world.setTile(x, y, new GrassTile(x, y));
    }
  }
}

// --- Camera controls ---

let dragging = false;
let lastMouse = Vec2.zero();

input.onMouse((e) => {
  if (e.type === "down" && e.button === "left") {
    dragging = true;
    lastMouse = e.screenPos;
  }
  if (e.type === "up") {
    dragging = false;
  }
  if (e.type === "move" && dragging) {
    const scale = ctx.tileSize * camera.zoom;
    const dx = (e.screenPos.x - lastMouse.x) / scale;
    const dy = (e.screenPos.y - lastMouse.y) / scale;
    camera.move(new Vec2(-dx, -dy));
    lastMouse = e.screenPos;
  }
});

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  camera.setZoom(Math.max(0.25, Math.min(4, camera.zoom * zoomFactor)));
});

// Spawn particles on right-click
input.onMouse((e) => {
  if (e.type === "click") {
    // Create a tiny 1x1 white canvas as a particle sprite
    const sprite = document.createElement("canvas");
    sprite.width = 4;
    sprite.height = 4;
    const sCtx = sprite.getContext("2d")!;
    sCtx.fillStyle = "#ffcc44";
    sCtx.beginPath();
    sCtx.arc(2, 2, 2, 0, Math.PI * 2);
    sCtx.fill();

    particles.spawn({
      sprite: sprite as unknown as HTMLImageElement,
      count: 20,
      position: e.worldPos,
      size: 0.2,
      lifetime: 0.8,
      speed: 3,
    });
  }
});

// --- HUD text ---

function drawHUD(): void {
  // Reset to screen coordinates for HUD
  const native = ctx.ctx;
  native.fillStyle = "rgba(0, 0, 0, 0.5)";
  native.fillRect(8, 8, 280, 28);
  native.font = "14px monospace";
  native.fillStyle = "#ffffff";
  native.fillText(
    `Camera: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)})  Zoom: ${camera.zoom.toFixed(2)}`,
    16, 26,
  );
}

// --- Game loop ---

const loop = createGameLoop((dt) => {
  world.update(dt);
  particles.update(dt);

  ctx.beginFrame(dt);
  world.draw(ctx);
  particles.draw(ctx);
  ctx.endFrame();
  drawHUD();
});

loop.start();
