import { Vec2 } from "./vec2.js";

export interface Transform {
  translation?: Vec2;
  scale?: number;
  rotation?: number;
  center?: Vec2;
}
