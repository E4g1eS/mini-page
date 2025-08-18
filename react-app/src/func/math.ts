export class Vec2 {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static one() {
    return new Vec2(1, 1);
  }

  static zero() {
    return new Vec2(0, 0);
  }

  static plus(vecA: Vec2, vecB: Vec2) {
    return new Vec2(vecA.x + vecB.x, vecA.y + vecB.y);
  }

  static minus(vecA: Vec2, vecB: Vec2) {
    return new Vec2(vecA.x - vecB.x, vecA.y - vecB.y);
  }

  static negative(vec: Vec2) {
    return new Vec2(-vec.x, -vec.y);
  }

  static scale(vec: Vec2, scalar: number) {
    return new Vec2(vec.x * scalar, vec.y * scalar);
  }
}
