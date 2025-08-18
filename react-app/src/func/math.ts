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
}
