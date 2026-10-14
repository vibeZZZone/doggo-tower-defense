import Phaser from "phaser";
import Enemy from "../entities/Enemy";
import Projectile from "../entities/Projectile";
import Tower, { DOGS, type DogType } from "../entities/Tower";

interface Point {
  x: number;
  y: number;
}

interface GameState {
  bones: number;
  lives: number;
  wave: number;
  waveActive: boolean;
  spawning: number;
  spawnTimer: number;
  over: boolean;
}

const WIDTH = 960;
const HEIGHT = 580;
const PATH: Point[] = [
  { x: -30, y: 112 }, { x: 150, y: 112 }, { x: 150, y: 245 },
  { x: 355, y: 245 }, { x: 355, y: 105 }, { x: 565, y: 105 },
  { x: 565, y: 375 }, { x: 765, y: 375 }, { x: 765, y: 230 },
  { x: 990, y: 230 }
];

function distanceBetween(a: Point, b: Point): number {
  return Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
}

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing game UI element: #${id}`);
  return found as T;
}

export default class GameScene extends Phaser.Scene {
  private readonly pathLength: number;
  private readonly towers: Tower[] = [];
  private readonly enemies: Enemy[] = [];
  private readonly projectiles: Projectile[] = [];
  private state: GameState = this.createInitialState();
  private selectedType: DogType = "beagle";
  private selectedTower: Tower | null = null;
  private paused = false;
  private speed = 1;
  private toastTimer: number | undefined;
  private rangeGraphic!: Phaser.GameObjects.Graphics;

  constructor() {
    super("GameScene");
    this.pathLength = PATH.slice(1).reduce(
      (sum, point, index) => sum + distanceBetween(point, PATH[index]),
      0
    );
    this.rangeGraphic = this.add.graphics();
  }

  create(): void {
    this.drawMap();
    this.rangeGraphic = this.add.graphics();
    this.input.on("pointerdown", this.onBoardClick, this);
    this.bindControls();
    this.updateUI();
  }

  update(_time: number, delta: number): void {
    if (this.paused || this.state.over) return;
    const step = Math.min(delta / 1000, 0.05) * this.speed;
    this.updateSpawning(step);
    this.updateEnemies(step);
    this.updateTowers(step);
    this.updateProjectiles(step);
    this.finishWaveIfReady();
    this.updateUI();
  }

  private createInitialState(): GameState {
    return { bones: 180, lives: 10, wave: 0, waveActive: false, spawning: 0, spawnTimer: 0, over: false };
  }

  private bindControls(): void {
    element<HTMLButtonElement>("wave-button").addEventListener("click", () => this.startWave());
    element<HTMLButtonElement>("pause-button").addEventListener("click", () => {
      if (this.state.over) return;
      this.paused = !this.paused;
      this.updateUI();
    });
    element<HTMLButtonElement>("speed-button").addEventListener("click", () => {
      this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
      this.updateUI();
    });
    element<HTMLButtonElement>("upgrade-button").addEventListener("click", () => this.upgradeSelected());
    element<HTMLButtonElement>("restart-button").addEventListener("click", () => this.restart());
    document.querySelectorAll<HTMLButtonElement>(".tower-card").forEach(card => {
      card.addEventListener("click", () => {
        const type = card.dataset.tower;
        if (!this.isDogType(type)) return;
        this.selectedType = type;
        this.selectedTower = null;
        this.updateUI();
      });
    });
  }

  private isDogType(value: string | undefined): value is DogType {
    return value === "beagle" || value === "shepherd" || value === "corgi";
  }

  private drawMap(): void {
    const ground = this.add.graphics();
    ground.fillStyle(0xc6dfa7, 1).fillRect(0, 0, WIDTH, HEIGHT);
    for (let y = 18; y < HEIGHT; y += 38) {
      for (let x = (Math.floor(y / 38) % 2) * 19 + 10; x < WIDTH; x += 38) {
        ground.fillStyle(0x4a7a3e, 0.1).fillEllipse(x, y, 4, 8);
      }
    }
    this.drawBush(34, 42, 1);
    this.drawBush(893, 57, 0.8);
    this.drawBush(892, 520, 1.1);
    this.drawBush(294, 537, 0.65);

    const pathGraphics = this.add.graphics();
    pathGraphics.lineStyle(86, 0xc59663, 1).beginPath();
    pathGraphics.moveTo(PATH[0].x, PATH[0].y);
    PATH.slice(1).forEach(point => pathGraphics.lineTo(point.x, point.y));
    pathGraphics.strokePath();
    pathGraphics.lineStyle(72, 0xe7c795, 1).beginPath();
    pathGraphics.moveTo(PATH[0].x, PATH[0].y);
    PATH.slice(1).forEach(point => pathGraphics.lineTo(point.x, point.y));
    pathGraphics.strokePath();
    this.drawBasket();
    this.add.text(60, 164, "БЕЛКИ", { color: "#52653f", fontSize: "12px", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(480, 299, "ДОРОЖКА", { color: "#9b805b", fontSize: "11px", fontStyle: "bold" }).setOrigin(0.5);
  }

  private drawBush(x: number, y: number, scale: number): void {
    const bush = this.add.graphics().setPosition(x, y).setScale(scale);
    bush.fillStyle(0x83ae69, 1);
    [[0, 8, 19], [18, 0, 22], [36, 10, 17], [16, 20, 20]].forEach(([dx, dy, radius]) => {
      bush.fillCircle(dx, dy, radius);
    });
    bush.fillStyle(0x9fc17f, 1).fillCircle(17, 2, 6);
  }

  private drawBasket(): void {
    const basket = this.add.graphics();
    basket.fillStyle(0x584227, 0.15).fillEllipse(888, 252, 76, 28);
    basket.fillStyle(0xb97d45, 1).fillRoundedRect(860, 228, 56, 34, 9);
    basket.lineStyle(3, 0xe8bd7d, 1);
    [-17, 0, 17].forEach(offset => basket.lineBetween(888 + offset, 231, 888 + offset, 259));
    basket.fillStyle(0xefc168, 1).fillEllipse(879, 222, 24, 16).fillEllipse(898, 220, 24, 16);
    this.add.text(888, 220, "🍪", { fontSize: "19px" }).setOrigin(0.5);
  }

  private pointAt(distance: number): Point {
    let remaining = distance;
    for (let index = 0; index < PATH.length - 1; index++) {
      const start = PATH[index];
      const end = PATH[index + 1];
      const segmentLength = distanceBetween(start, end);
      if (remaining <= segmentLength) {
        const ratio = remaining / segmentLength;
        return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
      }
      remaining -= segmentLength;
    }
    return PATH[PATH.length - 1];
  }

  private distanceToPath(point: Point): number {
    let shortest = Infinity;
    for (let index = 0; index < PATH.length - 1; index++) {
      const start = PATH[index];
      const end = PATH[index + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const ratio = Phaser.Math.Clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy), 0, 1);
      shortest = Math.min(shortest, distanceBetween(point, { x: start.x + dx * ratio, y: start.y + dy * ratio }));
    }
    return shortest;
  }

  private onBoardClick(pointer: Phaser.Input.Pointer): void {
    if (pointer.button !== 0 || this.state.over) return;
    const point = { x: pointer.worldX, y: pointer.worldY };
    const existing = this.towers.find(tower => distanceBetween(tower, point) < 27);
    if (existing) {
      this.selectedTower = existing;
      this.selectedType = existing.type;
      this.updateUI();
      return;
    }
    if (this.selectedTower) {
      this.selectedTower = null;
      this.updateUI();
    }
    const dog = DOGS[this.selectedType];
    if (point.x < 28 || point.x > WIDTH - 28 || point.y < 28 || point.y > HEIGHT - 28) return;
    if (this.distanceToPath(point) < 47) {
      this.showToast("На дорожку собак не ставим!");
      return;
    }
    if (this.towers.some(tower => distanceBetween(tower, point) < 48)) {
      this.showToast("Тут уже занято лапами!");
      return;
    }
    if (this.state.bones < dog.cost) {
      this.showToast("Не хватает косточек!");
      return;
    }
    this.state.bones -= dog.cost;
    this.towers.push(new Tower(this, point.x, point.y, this.selectedType));
    this.updateUI();
    this.showToast(`${dog.name} в команде!`);
  }

  private startWave(): void {
    if (this.state.waveActive || this.state.over) return;
    this.state.wave++;
    this.state.waveActive = true;
    this.state.spawning = 7 + this.state.wave * 2;
    this.state.spawnTimer = 0.15;
    this.updateUI();
    this.showToast(`Волна ${this.state.wave}: белки атакуют!`);
  }

  private updateSpawning(delta: number): void {
    if (!this.state.waveActive || this.state.spawning <= 0) return;
    this.state.spawnTimer -= delta;
    if (this.state.spawnTimer > 0) return;
    const health = 34 + this.state.wave * 13;
    this.enemies.push(new Enemy(
      this,
      PATH[0].x,
      PATH[0].y,
      health,
      48 + Math.min(24, this.state.wave * 2),
      8 + Math.floor(this.state.wave * 1.5)
    ));
    this.state.spawning--;
    this.state.spawnTimer = Math.max(0.42, 0.92 - this.state.wave * 0.025);
  }

  private updateEnemies(delta: number): void {
    for (let index = this.enemies.length - 1; index >= 0; index--) {
      const enemy = this.enemies[index];
      enemy.progress += enemy.speed * delta;
      const point = this.pointAt(enemy.progress);
      enemy.setPosition(point.x, point.y + Math.sin(this.time.now / 110 + index) * 2);
      if (enemy.progress < this.pathLength) continue;
      enemy.destroy();
      this.enemies.splice(index, 1);
      this.state.lives--;
      this.showToast("Белка утащила печеньку!");
      if (this.state.lives <= 0) {
        this.endGame();
        return;
      }
    }
  }

  private updateTowers(delta: number): void {
    for (const tower of this.towers) {
      tower.cooldown -= delta;
      const target = this.enemies
        .filter(enemy => enemy.active && distanceBetween(tower, enemy) <= tower.range)
        .sort((a, b) => b.progress - a.progress)[0];
      if (!target || tower.cooldown > 0) continue;
      const stats = DOGS[tower.type];
      this.projectiles.push(new Projectile(
        this,
        tower.x,
        tower.y - 10,
        target,
        tower.damage,
        stats.projectileSpeed
      ));
      tower.cooldown = stats.cooldown * (tower.type === "beagle" && tower.level > 1 ? 0.9 : 1);
    }
  }

  private updateProjectiles(delta: number): void {
    for (let index = this.projectiles.length - 1; index >= 0; index--) {
      const projectile = this.projectiles[index];
      if (!projectile.active) {
        this.projectiles.splice(index, 1);
        continue;
      }
      if (!projectile.updateFlight(delta)) {
        if (!projectile.active) this.projectiles.splice(index, 1);
        continue;
      }
      if (projectile.target.takeDamage(projectile.damage)) {
        this.state.bones += projectile.target.reward;
        const enemyIndex = this.enemies.indexOf(projectile.target);
        if (enemyIndex >= 0) this.enemies.splice(enemyIndex, 1);
      }
      projectile.destroy();
      this.projectiles.splice(index, 1);
    }
  }

  private finishWaveIfReady(): void {
    if (!this.state.waveActive || this.state.spawning > 0 || this.enemies.length > 0) return;
    this.state.waveActive = false;
    const bonus = 25 + this.state.wave * 5;
    this.state.bones += bonus;
    this.showToast(`Волна отбита! Бонус: ${bonus} косточек`);
  }

  private upgradeSelected(): void {
    const tower = this.selectedTower;
    if (!tower || tower.level >= 3 || this.state.over) return;
    const cost = tower.level === 1 ? 70 : 110;
    if (this.state.bones < cost) {
      this.showToast("Не хватает косточек!");
      return;
    }
    this.state.bones -= cost;
    tower.setLevel(tower.level + 1);
    this.updateUI();
    this.showToast(`${DOGS[tower.type].name} стал сильнее!`);
  }

  private endGame(): void {
    this.state.over = true;
    this.state.waveActive = false;
    element<HTMLDivElement>("game-over").hidden = false;
    this.updateUI();
  }

  private restart(): void {
    this.towers.forEach(tower => tower.destroy());
    this.enemies.forEach(enemy => enemy.destroy());
    this.projectiles.forEach(projectile => projectile.destroy());
    this.towers.length = 0;
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.state = this.createInitialState();
    this.selectedType = "beagle";
    this.selectedTower = null;
    this.paused = false;
    this.speed = 1;
    element<HTMLDivElement>("game-over").hidden = true;
    this.updateUI();
  }

  private showToast(message: string): void {
    const toast = element<HTMLDivElement>("toast");
    toast.textContent = message;
    toast.classList.add("visible");
    if (this.toastTimer !== undefined) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 1800);
  }

  private updateUI(): void {
    element<HTMLSpanElement>("bones").textContent = String(this.state.bones);
    element<HTMLSpanElement>("lives").textContent = String(this.state.lives);
    element<HTMLSpanElement>("wave").textContent = String(this.state.wave);
    const waveButton = element<HTMLButtonElement>("wave-button");
    waveButton.disabled = this.state.waveActive || this.state.over;
    waveButton.querySelector("span:first-child")!.textContent = this.state.waveActive ? "Волна идёт…" : "Начать волну";
    element<HTMLParagraphElement>("wave-hint").textContent = this.state.waveActive
      ? `Белок осталось: ${this.state.spawning + this.enemies.length}`
      : this.state.wave === 0 ? "Подготовь отряд — белки уже в пути!" : "Отряд готов? Начинай следующую волну!";
    const pauseButton = element<HTMLButtonElement>("pause-button");
    pauseButton.disabled = this.state.over;
    pauseButton.querySelector("span")!.textContent = this.paused ? "Продолжить" : "Пауза";
    pauseButton.firstChild!.textContent = this.paused ? "▶ " : "Ⅱ ";
    element<HTMLButtonElement>("speed-button").querySelector("span")!.textContent = `${this.speed}×`;
    document.querySelectorAll<HTMLButtonElement>(".tower-card").forEach(card => {
      const type = card.dataset.tower;
      if (!this.isDogType(type)) return;
      card.classList.toggle("selected", type === (this.selectedTower?.type ?? this.selectedType));
      card.classList.toggle("unaffordable", this.state.bones < DOGS[type].cost);
    });

    const icon = element<HTMLSpanElement>("selection-icon");
    const name = element<HTMLSpanElement>("selection-name");
    const levelBadge = element<HTMLSpanElement>("selection-level");
    const description = element<HTMLParagraphElement>("selection-description");
    const upgrade = element<HTMLButtonElement>("upgrade-button");
    const upgradeCost = element<HTMLSpanElement>("upgrade-cost");
    this.rangeGraphic.clear();
    if (this.selectedTower) {
      const tower = this.selectedTower;
      const stats = DOGS[tower.type];
      const cost = tower.level === 1 ? 70 : 110;
      icon.textContent = tower.type === "beagle" ? "🐶" : tower.type === "shepherd" ? "🐕" : "🐕‍🦺";
      name.textContent = stats.name;
      levelBadge.hidden = false;
      levelBadge.textContent = `Ур. ${tower.level}`;
      description.textContent = tower.level >= 3
        ? "Максимальный уровень! Этот защитник — настоящий чемпион."
        : `Урон ${Math.round(tower.damage)} · Дальность ${Math.round(tower.range)}. Улучши защитника для усиления атаки.`;
      upgradeCost.textContent = tower.level >= 3 ? "МАКС." : `🦴 ${cost}`;
      upgrade.disabled = tower.level >= 3 || this.state.bones < cost || this.state.over;
      this.rangeGraphic.fillStyle(0xffffff, 0.22).fillCircle(tower.x, tower.y, tower.range);
      this.rangeGraphic.lineStyle(2, 0xffffff, 0.8).strokeCircle(tower.x, tower.y, tower.range);
    } else {
      const stats = DOGS[this.selectedType];
      icon.textContent = this.selectedType === "beagle" ? "🐶" : this.selectedType === "shepherd" ? "🐕" : "🐕‍🦺";
      name.textContent = stats.name;
      levelBadge.hidden = true;
      description.textContent = this.state.bones < stats.cost
        ? `Нужно ещё ${stats.cost - this.state.bones} косточек. Побеждай белок, чтобы заработать!`
        : "Выбран защитник. Нажми на свободную траву, чтобы поставить его.";
      upgradeCost.textContent = "🦴 —";
      upgrade.disabled = true;
    }
  }
}
