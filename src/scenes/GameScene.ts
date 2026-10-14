import Phaser from "phaser";

interface Fighter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  stocks: number;
  facing: -1 | 1;
  onGround: boolean;
  attackTimer: number;
  attackCooldown: number;
  specialCooldown: number;
  invulnerable: number;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

const WIDTH = 960;
const HEIGHT = 580;
const GRAVITY = 1450;
const MOVE_SPEED = 310;
const JUMP_SPEED = 650;
const PLATFORMS: Platform[] = [
  { x: 34, y: 510, width: 892, height: 56 },
  { x: 174, y: 366, width: 230, height: 22 },
  { x: 556, y: 366, width: 230, height: 22 },
  { x: 357, y: 260, width: 246, height: 22 }
];

const REQUIRED_ELEMENTS = [
  "player-damage", "player-damage-bar", "cpu-damage", "cpu-damage-bar",
  "player-stocks", "cpu-stocks", "restart-button", "play-again-button",
  "game-over", "winner-title", "winner-message", "winner-icon"
];

function getElement<T extends HTMLElement>(id: string): T {
  const item = document.getElementById(id);
  if (!item) throw new Error(`Missing game UI element: #${id}`);
  return item as T;
}

export default class GameScene extends Phaser.Scene {
  private readonly held = new Set<string>();
  private readonly fighters: Fighter[] = [];
  private readonly platforms: Phaser.GameObjects.Container[] = [];
  private effects!: Phaser.GameObjects.Graphics;
  private player!: Fighter;
  private cpu!: Fighter;
  private finished = false;
  private cpuThinkTimer = 0;
  private lastHud = "";
  private controlsBound = false;

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.finished = false;
    this.lastHud = "";
    getElement<HTMLDivElement>("game-over").hidden = true;
    this.drawArena();
    this.effects = this.add.graphics().setDepth(5);
    this.player = this.createFighter(290, 472, "dog-tower", 1);
    this.cpu = this.createFighter(670, 472, "corgi", -1);
    this.fighters.push(this.player, this.cpu);

    this.input.keyboard?.on("keydown", this.onKeyDown, this);
    this.input.keyboard?.on("keyup", this.onKeyUp, this);
    this.input.on("pointerdown", () => this.game.canvas.focus());
    this.bindButtons();
    this.updateHud();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  update(_time: number, deltaMs: number): void {
    if (this.finished) return;
    const delta = Math.min(deltaMs / 1000, 0.04);
    this.cpuThinkTimer -= delta;
    this.updateCpuIntent();
    this.updateFighter(this.player, delta, this.readPlayerIntent());
    this.updateFighter(this.cpu, delta, this.readCpuIntent());
    this.resolveFighterCollision();
    this.updateHud();
    this.drawEffects();
  }

  private drawArena(): void {
    const background = this.add.graphics();
    background.fillGradientStyle(0x202447, 0x30294e, 0x384d68, 0x476b71, 1);
    background.fillRect(0, 0, WIDTH, HEIGHT);

    const stars = this.add.graphics();
    for (let index = 0; index < 48; index++) {
      const x = (index * 173 + 29) % WIDTH;
      const y = (index * 83 + 21) % 210;
      stars.fillStyle(index % 3 === 0 ? 0xffdfa1 : 0xd9e7f3, index % 3 === 0 ? 0.78 : 0.48);
      stars.fillCircle(x, y, index % 4 === 0 ? 2.2 : 1.2);
    }

    const moon = this.add.graphics();
    moon.fillStyle(0xffdf9a, 0.14).fillCircle(790, 112, 62);
    moon.fillStyle(0xffe9b0, 0.9).fillCircle(790, 112, 35);
    moon.fillStyle(0xffe9b0, 0.9).fillCircle(782, 103, 2.5).fillCircle(801, 120, 2);

    const hills = this.add.graphics();
    hills.fillStyle(0x52687a, 0.78);
    hills.fillPoints([
      new Phaser.Geom.Point(0, 453), new Phaser.Geom.Point(120, 336),
      new Phaser.Geom.Point(244, 451), new Phaser.Geom.Point(387, 322),
      new Phaser.Geom.Point(560, 458), new Phaser.Geom.Point(713, 346),
      new Phaser.Geom.Point(892, 458), new Phaser.Geom.Point(960, 394),
      new Phaser.Geom.Point(960, 580), new Phaser.Geom.Point(0, 580)
    ], true);
    hills.fillStyle(0x425765, 0.7);
    hills.fillPoints([
      new Phaser.Geom.Point(0, 485), new Phaser.Geom.Point(162, 405),
      new Phaser.Geom.Point(330, 492), new Phaser.Geom.Point(492, 406),
      new Phaser.Geom.Point(680, 488), new Phaser.Geom.Point(822, 402),
      new Phaser.Geom.Point(960, 479), new Phaser.Geom.Point(960, 580),
      new Phaser.Geom.Point(0, 580)
    ], true);

    PLATFORMS.forEach((platform, index) => this.drawPlatform(platform, index));
    const decor = this.add.graphics();
    decor.fillStyle(0xe5b864, 1).fillCircle(70, 483, 10).fillCircle(87, 478, 8);
    decor.fillStyle(0x87c7a2, 1).fillCircle(887, 474, 15).fillCircle(906, 480, 11);
    this.add.text(54, 100, "✦", { color: "#ffd884", fontSize: "18px" }).setAlpha(0.8);
    this.add.text(491, 82, "✦", { color: "#f1e3b6", fontSize: "14px" }).setAlpha(0.8);
  }

  private drawPlatform(platform: Platform, index: number): void {
    const container = this.add.container(platform.x, platform.y).setDepth(2);
    const graphic = this.add.graphics();
    const radius = index === 0 ? 19 : 11;
    graphic.fillStyle(0x10172b, 0.26).fillRoundedRect(4, 9, platform.width, platform.height + 8, radius);
    graphic.fillStyle(index === 0 ? 0x9266a5 : 0x6873a9, 1)
      .fillRoundedRect(0, 0, platform.width, platform.height, radius);
    graphic.fillStyle(index === 0 ? 0xc8e5a5 : 0xb6dcab, 1)
      .fillRoundedRect(0, 0, platform.width, 9, 5);
    graphic.fillStyle(0xffffff, 0.14).fillRoundedRect(15, 13, Math.max(20, platform.width - 30), 3, 2);
    container.add(graphic);
    container.setSize(platform.width, platform.height);
    this.platforms.push(container);

    if (index > 0) {
      const bone = this.add.text(platform.x + platform.width / 2, platform.y - 18, "🦴", {
        fontSize: "15px"
      }).setOrigin(0.5).setAlpha(0.8).setDepth(3);
      this.tweens.add({ targets: bone, y: bone.y - 4, duration: 1100 + index * 180, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }
  }

  private createFighter(x: number, y: number, texture: string, facing: -1 | 1): Fighter {
    const shadow = this.add.ellipse(x, 503, 60, 13, 0x10172b, 0.28).setDepth(3);
    const sprite = this.add.image(x, y, texture).setDisplaySize(72, 72).setDepth(4);
    sprite.setFlipX(facing < 0);
    return {
      x, y, vx: 0, vy: 0, damage: 0, stocks: 3, facing,
      onGround: false, attackTimer: 0, attackCooldown: 0,
      specialCooldown: 0, invulnerable: 0, sprite, shadow
    };
  }

  private readPlayerIntent(): { move: number; jump: boolean; attack: boolean; special: boolean } {
    return {
      move: Number(this.held.has("d") || this.held.has("arrowright") || this.held.has("right"))
        - Number(this.held.has("a") || this.held.has("arrowleft") || this.held.has("left")),
      jump: this.held.has("w") || this.held.has("arrowup") || this.held.has(" "),
      attack: this.held.has("j") || this.held.has("attack"),
      special: this.held.has("k") || this.held.has("special")
    };
  }

  private readCpuIntent(): { move: number; jump: boolean; attack: boolean; special: boolean } {
    const distance = this.player.x - this.cpu.x;
    const verticalGap = this.player.y - this.cpu.y;
    const close = Math.abs(distance) < 94 && Math.abs(verticalGap) < 105;
    const move = close ? (Math.abs(distance) > 52 ? Math.sign(distance) : 0) : Math.sign(distance);
    const shouldJump = (this.cpu.onGround && (verticalGap < -78 || (Math.abs(distance) < 170 && Math.random() < 0.004)))
      || (this.cpu.onGround && this.cpu.x > 420 && this.cpu.x < 540 && this.cpu.y > 390);
    return {
      move,
      jump: shouldJump,
      attack: close && this.cpu.attackCooldown <= 0,
      special: close && Math.abs(distance) < 122 && this.cpu.specialCooldown <= 0
    };
  }

  private updateCpuIntent(): void {
    if (this.cpuThinkTimer > 0) return;
    this.cpuThinkTimer = 0.1;
    this.cpu.facing = this.player.x >= this.cpu.x ? 1 : -1;
  }

  private updateFighter(
    fighter: Fighter,
    delta: number,
    intent: { move: number; jump: boolean; attack: boolean; special: boolean }
  ): void {
    fighter.attackCooldown = Math.max(0, fighter.attackCooldown - delta);
    fighter.specialCooldown = Math.max(0, fighter.specialCooldown - delta);
    fighter.attackTimer = Math.max(0, fighter.attackTimer - delta);
    fighter.invulnerable = Math.max(0, fighter.invulnerable - delta);

    if (intent.move !== 0) {
      fighter.vx = Phaser.Math.Linear(fighter.vx, intent.move * MOVE_SPEED, Math.min(1, delta * 10));
      fighter.facing = intent.move > 0 ? 1 : -1;
    } else {
      fighter.vx = Phaser.Math.Linear(fighter.vx, 0, Math.min(1, delta * 12));
    }

    if (intent.jump && fighter.onGround) {
      fighter.vy = -JUMP_SPEED;
      fighter.onGround = false;
    }
    if (intent.attack && fighter.attackCooldown <= 0) this.attack(fighter, false);
    if (intent.special && fighter.specialCooldown <= 0) this.attack(fighter, true);

    const previousBottom = fighter.y + 30;
    fighter.vy += GRAVITY * delta;
    fighter.x += fighter.vx * delta;
    fighter.y += fighter.vy * delta;
    fighter.onGround = false;

    for (const platform of PLATFORMS) {
      const platformTop = platform.y;
      const crossedPlatform = previousBottom <= platformTop + 6
        && fighter.y + 30 >= platformTop
        && fighter.vy >= 0
        && fighter.x + 21 > platform.x
        && fighter.x - 21 < platform.x + platform.width;
      if (!crossedPlatform) continue;
      fighter.y = platformTop - 30;
      fighter.vy = 0;
      fighter.onGround = true;
    }

    fighter.sprite.setPosition(fighter.x, fighter.y);
    fighter.sprite.setFlipX(fighter.facing < 0);
    fighter.sprite.setRotation(fighter.attackTimer > 0 ? -fighter.facing * 0.12 : 0);
    fighter.sprite.setAlpha(fighter.invulnerable > 0 && Math.floor(fighter.invulnerable * 14) % 2 === 0 ? 0.45 : 1);
    fighter.shadow.setPosition(fighter.x, Phaser.Math.Clamp(fighter.y + 35 + Math.max(0, fighter.y - 470) * 0.07, 495, 556));
    fighter.shadow.setScale(Phaser.Math.Clamp(1 - Math.max(0, fighter.y - 470) / 300, 0.55, 1));

    if (fighter.x < -95 || fighter.x > WIDTH + 95 || fighter.y > HEIGHT + 75) this.loseStock(fighter);
  }

  private attack(attacker: Fighter, special: boolean): void {
    if (special) {
      attacker.specialCooldown = 2.6;
      attacker.attackTimer = 0.28;
      this.cameras.main.shake(100, 0.002);
      this.tweens.add({
        targets: attacker.sprite,
        scaleX: 1.24,
        scaleY: 1.18,
        duration: 90,
        yoyo: true,
        ease: "Back.out"
      });
    } else {
      attacker.attackCooldown = 0.44;
      attacker.attackTimer = 0.17;
    }

    const target = attacker === this.player ? this.cpu : this.player;
    const reach = special ? 132 : 84;
    const difference = target.x - attacker.x;
    const facingTarget = Math.sign(difference) === attacker.facing || Math.abs(difference) < 16;
    if (facingTarget && Math.abs(difference) < reach && Math.abs(target.y - attacker.y) < (special ? 126 : 88)) {
      this.hit(attacker, target, special);
    }
  }

  private hit(attacker: Fighter, target: Fighter, special: boolean): void {
    if (target.invulnerable > 0) return;
    const damage = special ? 15 : 8;
    target.damage = Math.min(999, target.damage + damage);
    const direction = Math.sign(target.x - attacker.x) || attacker.facing;
    const knockback = (special ? 350 : 210) + target.damage * (special ? 5.4 : 4.2);
    target.vx = direction * knockback;
    target.vy = -((special ? 250 : 160) + target.damage * (special ? 2.3 : 1.6));
    target.onGround = false;
    target.invulnerable = 0.48;
    this.cameras.main.shake(special ? 140 : 75, special ? 0.004 : 0.002);
    this.updateHud();
  }

  private resolveFighterCollision(): void {
    const dx = this.cpu.x - this.player.x;
    const dy = this.cpu.y - this.player.y;
    if (Math.abs(dx) > 45 || Math.abs(dy) > 52) return;
    const direction = Math.sign(dx) || 1;
    const overlap = 45 - Math.abs(dx);
    this.player.x -= direction * overlap * 0.5;
    this.cpu.x += direction * overlap * 0.5;
  }

  private loseStock(fighter: Fighter): void {
    fighter.stocks--;
    if (fighter.stocks <= 0) {
      this.finishMatch(fighter === this.player ? "cpu" : "player");
      return;
    }
    fighter.x = fighter === this.player ? 290 : 670;
    fighter.y = 430;
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.damage = 0;
    fighter.invulnerable = 1.6;
    this.cameras.main.flash(180, 255, 255, 255);
    this.updateHud();
  }

  private finishMatch(winner: "player" | "cpu"): void {
    this.finished = true;
    const youWon = winner === "player";
    getElement<HTMLDivElement>("game-over").hidden = false;
    getElement<HTMLSpanElement>("winner-icon").textContent = youWon ? "🏆" : "🐾";
    getElement<HTMLHeadingElement>("winner-title").textContent = youWon ? "Ты чемпион!" : "Гроза победил!";
    getElement<HTMLParagraphElement>("winner-message").textContent = youWon
      ? "Отличный бой! Гроза отправляется за печеньками."
      : "Ещё один раунд — и ты точно возьмёшь реванш!";
  }

  private drawEffects(): void {
    this.effects.clear();
    for (const fighter of this.fighters) {
      if (fighter.attackTimer <= 0) continue;
      const special = fighter.attackTimer > 0.2;
      const reach = special ? 122 : 74;
      const centerX = fighter.x + fighter.facing * (special ? 74 : 50);
      const centerY = fighter.y + 2;
      this.effects.fillStyle(special ? 0xffe47d : 0xffffff, special ? 0.2 : 0.28);
      this.effects.fillEllipse(centerX, centerY, reach, special ? 94 : 70);
      this.effects.lineStyle(special ? 5 : 4, special ? 0xffdb61 : 0xffffff, special ? 0.85 : 0.72);
      this.effects.strokeEllipse(centerX, centerY, reach, special ? 94 : 70);
      if (special) {
        this.effects.fillStyle(0xffefb1, 0.9);
        this.effects.fillCircle(centerX, centerY, 8 + Math.sin(this.time.now / 35) * 2);
      }
    }
  }

  private updateHud(): void {
    const hud = `${this.player.damage}|${this.player.stocks}|${this.cpu.damage}|${this.cpu.stocks}`;
    if (hud === this.lastHud) return;
    this.lastHud = hud;
    this.setDamage("player", this.player.damage);
    this.setDamage("cpu", this.cpu.damage);
    getElement<HTMLDivElement>("player-stocks").textContent = this.stockIcons(this.player.stocks);
    getElement<HTMLDivElement>("cpu-stocks").textContent = this.stockIcons(this.cpu.stocks);
  }

  private setDamage(prefix: string, damage: number): void {
    getElement<HTMLElement>(`${prefix}-damage`).textContent = `${Math.floor(damage)}%`;
    getElement<HTMLElement>(`${prefix}-damage-bar`).style.width = `${Math.min(100, damage / 1.8)}%`;
  }

  private stockIcons(stocks: number): string {
    return `${"🐾 ".repeat(Math.max(0, stocks))}${"· ".repeat(Math.max(0, 3 - stocks))}`.trim();
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    if ([" ", "arrowup", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
    if (["a", "d", "w", " ", "j", "k", "arrowleft", "arrowright", "arrowup"].includes(key)) {
      this.held.add(key);
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.held.delete(event.key.toLowerCase());
  }

  private bindButtons(): void {
    if (this.controlsBound) return;
    this.controlsBound = true;
    getElement<HTMLButtonElement>("restart-button").addEventListener("click", () => this.scene.restart());
    getElement<HTMLButtonElement>("play-again-button").addEventListener("click", () => {
      getElement<HTMLDivElement>("game-over").hidden = true;
      this.scene.restart();
    });
    document.querySelectorAll<HTMLButtonElement>("[data-key]").forEach(button => {
      const key = button.dataset.key;
      if (!key) return;
      const press = (event: PointerEvent): void => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.held.add(key);
      };
      const release = (): void => {
        this.held.delete(key);
      };
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("lostpointercapture", release);
      button.addEventListener("contextmenu", event => event.preventDefault());
    });
  }

  private cleanup(): void {
    this.held.clear();
    this.fighters.length = 0;
    this.platforms.length = 0;
  }
}
