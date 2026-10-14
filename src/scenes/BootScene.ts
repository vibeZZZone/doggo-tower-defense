import Phaser from "phaser";
import dogTowerUrl from "../../assets/dog-tower.svg";
import enemyUrl from "../../assets/enemy.svg";
import projectileUrl from "../../assets/projectile.svg";
import shepherdUrl from "../../assets/shepherd.svg";
import corgiUrl from "../../assets/corgi.svg";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.image("dog-tower", dogTowerUrl);
    this.load.image("shepherd", shepherdUrl);
    this.load.image("corgi", corgiUrl);
    this.load.image("squirrel", enemyUrl);
    this.load.image("tennis-ball", projectileUrl);
  }

  create(): void {
    this.scene.start("GameScene");
  }
}
