import Phaser from "phaser";
import Enemy from "./Enemy";

export default class Projectile extends Phaser.GameObjects.Image {
  readonly target: Enemy;
  readonly damage: number;
  private readonly speed: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Enemy,
    damage: number,
    speed: number
  ) {
    super(scene, x, y, "tennis-ball");
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.setDisplaySize(18, 18);
    scene.add.existing(this);
  }

  updateFlight(deltaSeconds: number): boolean {
    if (!this.target.active) {
      this.destroy();
      return false;
    }
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    const travel = this.speed * deltaSeconds;
    if (distance <= travel + 8) return true;
    this.x += ((this.target.x - this.x) / distance) * travel;
    this.y += ((this.target.y - this.y) / distance) * travel;
    return false;
  }
}
