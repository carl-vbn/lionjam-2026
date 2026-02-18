import {
  Vec2, Camera, createContext, World, Tile,
  InputHandler, createGameLoop, ParticleSystem,
  Flipbook, extractTextureChunks,
} from "../engine/index.js";
import { generateTile } from "./generator.js";
import { Player } from "./player.js";
import { drawHUD, handleUIClick } from "./ui.js";

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

input.setUIClickHandler(handleUIClick);

// Spawn texture chunk particles on click
input.onMouse((e) => {
  if (e.type !== "click") return;

  // Check entity first (higher priority)
  const entity = world.getClickableEntityAt(e.worldPos);
  if (entity) {
    const source = entity.getParticleSource();
    if (source) {
      const chunks = extractTextureChunks(source, 12);
      particles.spawn({
        sprites: chunks,
        count: 12,
        position: e.worldPos,
        size: 0.2,
        lifetime: 0.6,
        speed: 2.5,
      });
      return;
    }
  }

  // Fall back to tile
  const tileX = Math.floor(e.worldPos.x);
  const tileY = Math.floor(e.worldPos.y);
  const tile = world.getTile(tileX, tileY);
  if (tile) {
    const source = tile.getParticleSource();
    if (source) {
      const chunks = extractTextureChunks(source, 10);
      particles.spawn({
        sprites: chunks,
        count: 10,
        position: e.worldPos,
        size: 0.15,
        lifetime: 0.6,
        speed: 2,
      });
    }
  }
});

// --- Game loop ---

const loop = createGameLoop((dt) => {
  world.update(dt);
  particles.update(dt);

  ctx.beginFrame(dt);
  world.draw(ctx);
  particles.draw(ctx);
  ctx.endFrame();
  drawHUD(ctx, dt, camera);

  // Move camera to follow player
  const followSpeed = 2;
  const delta = followSpeed * dt;
  camera.position.x += (player.position.x - camera.position.x) * delta;
  camera.position.y += (player.position.y - camera.position.y) * delta;
});

loop.start();
