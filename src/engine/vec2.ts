export class Vec2 {
  constructor(public x: number = 0, public y: number = 0) {}

  add(other: Vec2): Vec2 {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  sub(other: Vec2): Vec2 {
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  scale(scalar: number): Vec2 {
    return new Vec2(this.x * scalar, this.y * scalar);
  }

  dot(other: Vec2): number {
    return this.x * other.x + this.y * other.y;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalized(): Vec2 {
    const len = this.length();
    if (len === 0) return new Vec2();
    return new Vec2(this.x / len, this.y / len);
  }

  distanceTo(other: Vec2): number {
    return this.sub(other).length();
  }

  distanceSquaredTo(other: Vec2): number {
    return this.sub(other).lengthSquared();
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  rotate(radians: number): Vec2 {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return new Vec2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos,
    );
  }

  lerp(other: Vec2, t: number): Vec2 {
    return new Vec2(
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t,
    );
  }

  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  equals(other: Vec2): boolean {
    return this.x === other.x && this.y === other.y;
  }

  static fromAngle(radians: number, length: number = 1): Vec2 {
    return new Vec2(Math.cos(radians) * length, Math.sin(radians) * length);
  }

  static zero(): Vec2 {
    return new Vec2(0, 0);
  }
}
