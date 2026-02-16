import { Vec2 } from "./vec2.js";

export interface CameraBounds {
  min: Vec2;
  max: Vec2;
  minZoom?: number;
  maxZoom?: number;
}

export class Camera {
  position: Vec2;
  zoom: number;
  bounds: CameraBounds | null;

  constructor(position: Vec2 = Vec2.zero(), zoom: number = 1, bounds: CameraBounds | null = null) {
    this.position = position;
    this.zoom = zoom;
    this.bounds = bounds;
  }

  setPosition(position: Vec2): void {
    this.position = position;
    this.clamp();
  }

  setZoom(zoom: number): void {
    this.zoom = zoom;
    this.clamp();
  }

  move(delta: Vec2): void {
    this.position = this.position.add(delta);
    this.clamp();
  }

  private clamp(): void {
    if (!this.bounds) return;

    if (this.bounds.minZoom !== undefined) {
      this.zoom = Math.max(this.zoom, this.bounds.minZoom);
    }
    if (this.bounds.maxZoom !== undefined) {
      this.zoom = Math.min(this.zoom, this.bounds.maxZoom);
    }

    this.position = new Vec2(
      Math.max(this.bounds.min.x, Math.min(this.bounds.max.x, this.position.x)),
      Math.max(this.bounds.min.y, Math.min(this.bounds.max.y, this.position.y)),
    );
  }
}
