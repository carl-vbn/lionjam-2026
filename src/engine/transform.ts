import { Vec2 } from "./vec2.js";

export interface Transform {
  translation?: Vec2;
  /** Uniform scale (number) or non-uniform scale (Vec2 for x/y). */
  scale?: number | Vec2;
  rotation?: number;
  center?: Vec2;
}
