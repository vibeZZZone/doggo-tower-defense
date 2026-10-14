import Phaser from "phaser";

export type DogType = "beagle" | "shepherd" | "corgi";

export interface DogStats {
  name: string;
  cost: number;
  range: number;
  damage: number;
  cooldown: number;
  projectileSpeed: number;
}

export const DOGS: Record<DogType, DogStats> = {
  beagle: { name: "Бигль", cost: 60, range: 132, damage: 14, cooldown: 0.72, projectileSpeed: 390 },
  shepherd: { name: "Овчарка", cost: 100, range: 190, damage: 26, cooldown: 1.18, projectileSpeed: 340 },
  corgi: { name: "Корги", cost: 140, range: 145, damage: 38, cooldown: 1.5, projectileSpeed: 310 }
};

export default class Tower extends Phaser.GameObjects.Container {
  readonly type: DogType;
  level = 1;
  cooldown = 0;
  private readonly levelText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, type: DogType) {
    super(scene, x, y);
    this.type = type;
    const colors: Record<DogType, number> = {
      beagle: 0xe9a94d,
      shepherd: 0x70946a,
      corgi: 0xd47a54
    };
    const base = scene.add.circle(0, 1, 24, colors[type]).setStrokeStyle(3, 0xfff9e8);
    const texture = type === "beagle" ? "dog-tower" : type;
    const dog = scene.add.image(0, 1, texture).setDisplaySize(43, 43);
    this.levelText = scene.add.text(16, -19, "", {
      color: "#69562f",
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
      backgroundColor: "#fff5ca",
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setVisible(false);
    this.add([base, dog, this.levelText]);
    scene.add.existing(this);
  }

  get range(): number {
    return DOGS[this.type].range * (1 + (this.level - 1) * 0.12);
  }

  get damage(): number {
    return DOGS[this.type].damage * (1 + (this.level - 1) * 0.65);
  }

  setLevel(level: number): void {
    this.level = level;
    this.levelText.setText(String(level)).setVisible(level > 1);
  }
}
