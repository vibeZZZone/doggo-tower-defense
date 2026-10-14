import Phaser from "phaser";

export default class Enemy extends Phaser.GameObjects.Container {
  progress = 0;
  health: number;
  readonly maxHealth: number;
  readonly speed: number;
  readonly reward: number;
  private readonly healthBar: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    health: number,
    speed: number,
    reward: number
  ) {
    super(scene, x, y);
    this.health = health;
    this.maxHealth = health;
    this.speed = speed;
    this.reward = reward;
    this.add(scene.add.image(0, 0, "squirrel").setDisplaySize(38, 38));
    this.healthBar = scene.add.graphics();
    this.add(this.healthBar);
    scene.add.existing(this);
    this.drawHealthBar();
  }

  takeDamage(damage: number): boolean {
    this.health -= damage;
    if (this.health <= 0) {
      this.destroy();
      return true;
    }
    this.drawHealthBar();
    return false;
  }

  private drawHealthBar(): void {
    this.healthBar.clear();
    this.healthBar.fillStyle(0x4b453b, 0.35);
    this.healthBar.fillRoundedRect(-17, -26, 34, 5, 2);
    this.healthBar.fillStyle(0xe56f60, 1);
    this.healthBar.fillRoundedRect(-17, -26, 34 * Math.max(0, this.health / this.maxHealth), 5, 2);
  }
}
