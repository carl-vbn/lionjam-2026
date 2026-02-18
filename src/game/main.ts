import {
  Vec2, Camera, createContext, World, Tile,
  InputHandler, createGameLoop, ParticleSystem,
  Flipbook,
} from "../engine/index.js";
import { generateTile } from "./generator.js";
import { Player } from "./player.js";

// --- Setup ---

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const camera = new Camera(new Vec2(8, 8), 1);
const ctx = createContext({ canvas, camera, tileSize: 128 });
const world = new World();
const particles = new ParticleSystem();
const input = InputHandler.init(ctx, world);

function generateSurroundings(center: Vec2, radius: number): void {
  const startX = Math.floor(center.x - radius);
  const endX = Math.ceil(center.x + radius);
  const startY = Math.floor(center.y - radius);
  const endY = Math.ceil(center.y + radius);

  for (let x = startX; x <= endX; x++) {
    for (let y = startY; y <= endY; y++) {
      if (!world.getTile(x, y)) {
        const tile = generateTile(world, x, y);
        if (tile) {
          world.setTile(x, y, tile);
        }
      }
    }
  }
}

// --- Entities ---

const player = new Player(new Vec2(8, 8), world, generateSurroundings);

world.addEntity(player);

// Generate initial surroundings around player
generateSurroundings(player.position, 12);

// --- Camera controls ---

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

let fps = 0;

function drawHUD(dt: number): void {
  fps += (1 / dt - fps) * 0.05;

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
}

// --- Game loop ---

const loop = createGameLoop((dt) => {
  world.update(dt);
  particles.update(dt);

  ctx.beginFrame(dt);
  world.draw(ctx);
  particles.draw(ctx);
  ctx.endFrame();
  drawHUD(dt);

  // Move camera to follow player
  const followSpeed = 2;
  const delta = followSpeed * dt;
  camera.position.x += (player.position.x - camera.position.x) * delta;
  camera.position.y += (player.position.y - camera.position.y) * delta;
});

loop.start();
