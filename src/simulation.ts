import {
  W,
  upgrades,
  cores,
  type CoreId,
  characters,
  type CharacterId,
  type UpgradeId,
} from "./data";
import { createLevel, lengths, LEVELS, type Terrain } from "./levels";
export type Input = {
  left: boolean;
  right: boolean;
  fire: boolean;
  pressed: boolean;
};
export type Platform = Terrain;
export type Enemy = {
  id: number;
  x: number;
  y: number;
  origin: number;
  kind: number;
  hp: number;
  alive: boolean;
  phase: number;
  shotCooldown?: number;
  active?: boolean;
  flash?: number;
};
export type Bullet = {
  x: number;
  y: number;
  vx: number;
  life: number;
  hit: number[];
  damage?: number;
  volley?: number;
};
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: number;
};
export type Mode =
  | "menu"
  | "playing"
  | "upgrade"
  | "paused"
  | "shop"
  | "evolution"
  | "dead"
  | "won";
export class Simulation {
  characterId: CharacterId = "scout";
  get character() {
    return characters.find((c) => c.id === this.characterId)!;
  }
  mode: Mode = "menu";
  previous: Mode = "playing";
  x = 210;
  y = 70;
  vx = 0;
  vy = 0;
  hp = 4;
  maxHp = 4;
  ammo = 8;
  maxAmmo = 8;
  core: CoreId | null = null;
  evolved = new Set<CoreId>();
  relicLevels = new Map<UpgradeId, number>();
  rewardKind: "core" | "relic" | "exchange" = "relic";
  pendingRelic: UpgradeId | null = null;
  bonusAmmo = 0;
  firstShot = true;
  slamReady = 0;
  armorReady = 0;
  trial: {
    start: number;
    end: number;
    kind: CoreId;
    lane: string;
    count: number;
    targets: number[];
    done: boolean;
  } | null = null;
  shopVisited = false;
  purchases = new Set<string>();
  rerolled = false;
  get powerStacks() {
    return this.rank("power");
  }
  rank(id: UpgradeId) {
    return this.relicLevels.get(id) ?? (this.owned.has(id) ? 1 : 0);
  }
  get coreData() {
    return cores.find((c) => c.id === this.core);
  }
  get evolutionReady() {
    return (
      !!this.core &&
      !this.evolved.has(this.core) &&
      upgrades.filter((u) => u.family === this.core && this.owned.has(u.id))
        .length >= 2
    );
  }
  get bossOpen() {
    return this.time % 4 < 2.6;
  }
  recalculate() {
    this.maxAmmo = this.character.ammo + this.bonusAmmo + this.rank("ammo") * 2;
    this.ammo = Math.min(this.ammo, this.maxAmmo);
  }

  grounded = false;
  wallJumpReady = false;
  combo = 0;
  bestCombo = 0;
  kills = 0;
  deathReason = "";
  stats = { shots: 0, stomps: 0, slams: 0, trials: 0 };
  runLog: {
    stage: number;
    core: CoreId | null;
    income: number;
    spent: number;
    hp: number;
    shots: number;
    stomps: number;
    slams: number;
  }[] = [];
  spent = 0;
  stageOpening = { gems: 0, spent: 0, shots: 0, stomps: 0, slams: 0 };
  gems = 0;
  stage = 0;
  depth = 0;
  time = 0;
  invulnerable = 0;
  cooldown = 0;
  landTime = 0;
  platforms: Platform[] = [];
  spikes: { x: number; y: number; w: number }[] = [];
  chunks: string[] = [];
  oxygen = 75;
  get zone() {
    return Math.min(3, Math.floor(this.stage / 3));
  }
  get roomFloor() {
    return lengths[this.stage] ?? 1260;
  }
  get depthOffset() {
    return lengths.slice(0, this.stage).reduce((a, b) => a + b, 0);
  }
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  owned = new Set<UpgradeId>();
  choices: UpgradeId[] = [];
  bossHp = 48;
  bossMax = 48;
  bossX = 210;
  bossY = 1010;
  bossTimer = 0;
  summonAt = 0;
  bossVolleys = new Map<number, number>();
  hazards: { x: number; y: number; vx: number; vy: number }[] = [];
  shield = false;
  shake = 0;
  notice = "";
  noticeTime = 0;
  seed = 1;
  nextId = 0;
  lastShot = 0;
  reloadCount = 0;
  refill() {
    if (this.ammo < this.maxAmmo) {
      this.ammo = this.maxAmmo;
      this.reloadCount++;
    }
  }
  lastHit = 0;
  impactCount = 0;
  impactKind = "hit";
  hitStop = 0;
  impacts: { x: number; y: number; life: number; kind: string }[] = [];
  midRunUpgrade = false;
  midpoints = new Set<number>();
  impact(x: number, y: number, kind: string) {
    this.impactCount++;
    this.impactKind = kind;
    this.impacts.push({ x, y, life: 0.26, kind });
    this.shake = Math.max(
      this.shake,
      kind === "stomp" ? 5 : kind === "kill" ? 3 : 1.5,
    );
    this.hitStop = Math.max(
      this.hitStop,
      kind === "stomp" ? 0.045 : kind === "kill" ? 0.028 : 0.012,
    );
    this.burst(
      x,
      y,
      kind === "armor" ? 0xf9d879 : 0xf6f0d8,
      kind === "stomp" ? 14 : 6,
    );
  }
  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  start(seed = Date.now(), characterId: CharacterId = this.characterId) {
    this.characterId = characterId;
    this.seed = seed >>> 0;
    this.mode = "playing";
    this.x = 210;
    this.y = 70;
    this.hp = this.character.hp;
    this.maxHp = this.character.hp;
    this.maxAmmo = this.character.ammo;
    this.runLog = [];
    this.spent = 0;
    this.core = null;
    this.evolved.clear();
    this.relicLevels.clear();
    this.bonusAmmo = 0;
    this.pendingRelic = null;
    this.rewardKind = "relic";
    this.owned.clear();
    this.midpoints.clear();
    this.midRunUpgrade = false;
    this.impacts = [];
    this.hitStop = 0;
    this.stage = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.kills = 0;
    this.deathReason = "";
    this.stats = { shots: 0, stomps: 0, slams: 0, trials: 0 };
    this.gems = 0;
    this.time = 0;
    this.depth = 0;
    this.nextId = 0;
    this.loadStage();
  }
  loadStage() {
    this.stageOpening = {
      gems: this.gems,
      spent: this.spent,
      shots: this.stats.shots,
      stomps: this.stats.stomps,
      slams: this.stats.slams,
    };
    this.x = 210;
    this.y = 70;
    this.vx = 0;
    this.vy = 0;
    this.ammo = this.maxAmmo;
    this.firstShot = true;
    this.slamReady = 0;
    this.armorReady = 0;
    this.shopVisited = false;
    this.purchases.clear();
    this.rerolled = false;
    this.grounded = false;
    this.wallJumpReady = false;
    this.landTime = 0;
    this.invulnerable = 1;
    this.bullets = [];
    this.hazards = [];
    this.particles = [];
    this.combo = 0;
    this.shield = this.owned.has("shield");
    this.cooldown = 0;
    const layout = createLevel(this.stage, () => this.random());
    this.platforms = layout.platforms;
    this.spikes = layout.spikes;
    this.chunks = layout.chunks;
    this.oxygen = 75;
    this.enemies = layout.enemies.map((e) => ({
      ...e,
      id: this.nextId++,
      origin: e.x,
      hp:
        e.kind === 4 ? 3 : e.kind === 2 || e.kind === 3 || e.kind === 5 ? 2 : 1,
      alive: true,
      phase: this.random() * 6,
      shotCooldown: 1.2 + this.random() * 1.2,
    }));
    this.trial =
      this.stage < LEVELS
        ? {
            start: 1450,
            end: 2150,
            kind: cores[this.stage % 3].id,
            lane: "",
            count: 0,
            targets: this.enemies
              .filter((e) => e.x > 220 && e.y >= 1450 && e.y < 2150)
              .map((e) => e.id),
            done: false,
          }
        : null;
    this.bossHp = this.bossMax;
    this.bossVolleys.clear();
    this.bossTimer = 1.2;
    this.summonAt = this.time;
    this.say(
      this.stage === LEVELS
        ? "井底守卫 · 底部金色跳台可弹回上方"
        : "第 " + (this.stage + 1) + " 段 · 落地或踩怪补弹",
    );
  }
  say(s: string) {
    this.notice = s;
    this.noticeTime = 2.7;
  }
  pause() {
    if (this.mode === "playing") {
      this.mode = "paused";
    } else if (this.mode === "paused") this.mode = "playing";
  }
  damage(reason = "敌人或弹幕命中") {
    if (this.invulnerable > 0 || this.mode !== "playing") return;
    if (this.shield) {
      this.shield = false;
      this.invulnerable = this.rank("shield") === 2 ? 1.5 : 1;
      this.say("护符抵挡了伤害");
      return;
    }
    this.hp--;
    if (this.trial?.kind === "leap" && !this.trial.done) this.trial.count = 0;
    this.combo = 0;
    this.invulnerable = 0.85;
    this.vy = -170;
    this.lastHit++;
    this.shake = 9;
    this.burst(this.x, this.y, 0xef907e, 15);
    if (this.hp <= 0) {
      this.mode = "dead";
      this.deathReason = reason;
    }
  }
  burst(x: number, y: number, color: number, n = 8) {
    for (let i = 0; i < n; i++)
      this.particles.push({
        x,
        y,
        vx: (this.random() - 0.5) * 180,
        vy: (this.random() - 0.5) * 180,
        life: 0.5 + this.random() * 0.3,
        color,
      });
  }
  kill(e: Enemy, source = "passive") {
    if (!e.alive) return;
    e.alive = false;
    this.kills++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.gems += 1 + Math.floor(this.combo / 5) + this.rank("heal");
    if (
      this.trial &&
      !this.trial.done &&
      this.y >= this.trial.start &&
      this.y < this.trial.end &&
      this.x > 222 &&
      this.trial.targets.includes(e.id)
    ) {
      if (
        (source === "stomp" && this.trial.kind === "leap") ||
        (source === "shot" && this.trial.kind === "barrage")
      )
        this.trial.count++;
    }
    if (source === "shot" && this.rank("split"))
      this.area(e.x, e.y, this.rank("split") === 2 ? 65 : 45, 1);

    this.burst(e.x, e.y, 0x91d8be);
    this.impact(e.x, e.y, "kill");
    if (this.combo % 5 === 0) this.say(this.combo + " 连击 · 晶石奖励提升");
  }
  lineClear(x: number, y: number, tx: number, ty: number) {
    // Test interior samples; endpoints touching a ledge do not block its own impact.
    for (let i = 1; i < 16; i++) {
      const px = x + ((tx - x) * i) / 16,
        py = y + ((ty - y) * i) / 16;
      if (
        this.platforms.some(
          (p) =>
            !p.vanished &&
            px > p.x &&
            px < p.x + p.w &&
            py > p.y + 2 &&
            py < p.y + (p.h ?? 14),
        )
      )
        return false;
    }
    return true;
  }
  area(
    x: number,
    y: number,
    r: number,
    damage = 2,
    struck = new Set<number>(),
  ) {
    for (const e of this.enemies)
      if (
        e.alive &&
        e.kind !== 4 &&
        !struck.has(e.id) &&
        Math.hypot(e.x - x, e.y - y) < r &&
        this.lineClear(x, y, e.x, e.y)
      ) {
        struck.add(e.id);
        e.hp -= damage;
        e.flash = 0.1;
        if (e.hp <= 0) this.kill(e);
      }
    if (
      this.stage === LEVELS &&
      this.bossOpen &&
      !struck.has(-1) &&
      Math.hypot(this.bossX - x, this.bossY - y) < r + 35 &&
      this.lineClear(x, y, this.bossX, this.bossY)
    ) {
      struck.add(-1);
      this.bossHp -= damage;
    }
    this.impact(x, y, "wave");
    this.burst(x, y, 0xf9d879, 18);
  }
  rollChoices() {
    const pool = upgrades.filter((u) => this.rank(u.id) < 2);
    const picked: UpgradeId[] = [];
    for (const family of [this.core ?? "barrage", "general", "other"]) {
      let eligible = pool.filter(
        (u) =>
          !picked.includes(u.id) &&
          (family === "other"
            ? u.family !== this.core && u.family !== "general"
            : u.family === family),
      );
      if (picked.length === 0 && this.stage < 2) {
        const fresh = eligible.filter((u) => !this.owned.has(u.id));
        if (fresh.length) eligible = fresh;
      }
      if (!eligible.length)
        eligible = pool.filter((u) => !picked.includes(u.id));
      if (eligible.length)
        picked.push(eligible[Math.floor(this.random() * eligible.length)].id);
    }
    this.choices = picked;
  }
  chooseCore(id: CoreId) {
    if (
      this.mode !== "upgrade" ||
      !["core", "exchange"].includes(this.rewardKind) ||
      !cores.some((c) => c.id === id)
    )
      return;
    this.core = id;
    this.completeReward();
  }
  choose(id: UpgradeId, replace?: UpgradeId) {
    if (
      this.mode !== "upgrade" ||
      this.rewardKind !== "relic" ||
      !this.choices.includes(id) ||
      this.rank(id) >= 2
    )
      return;
    if (!this.owned.has(id) && this.owned.size >= 4) {
      if (!replace || !this.owned.has(replace)) {
        this.pendingRelic = id;
        return;
      }
      this.owned.delete(replace);
      this.relicLevels.delete(replace);
      if (replace === "shield") this.shield = false;
    }
    this.pendingRelic = null;
    this.relicLevels.set(id, this.rank(id) + 1);
    this.owned.add(id);
    this.recalculate();
    if (id === "shield") this.shield = true;
    this.completeReward();
  }
  completeReward() {
    if (this.evolutionReady) {
      this.mode = "evolution";
      return;
    }
    this.resumeReward();
  }
  evolve() {
    if (this.mode !== "evolution" || !this.core) return;
    this.evolved.add(this.core);
    this.say(this.coreData!.evolution + "进化完成");
    this.resumeReward();
  }
  resumeReward() {
    this.pendingRelic = null;
    if (this.midRunUpgrade) {
      this.midRunUpgrade = false;
      this.mode = "playing";
      this.invulnerable = Math.max(1, this.invulnerable);
      return;
    }
    this.stage++;
    this.mode = "playing";
    this.loadStage();
  }
  skip() {
    if (this.mode !== "upgrade" || this.rewardKind === "core") return;
    if (this.rewardKind === "relic") this.gems += 10;
    this.resumeReward();
  }
  price(kind: string) {
    return (kind === "heal" ? 40 : kind === "ammo" ? 60 : 25) + this.zone * 10;
  }
  buy(kind: "heal" | "ammo") {
    if (
      !["upgrade", "shop"].includes(this.mode) ||
      (this.mode === "upgrade" &&
        (this.rewardKind !== "relic" || this.midRunUpgrade)) ||
      this.purchases.has(kind) ||
      this.pendingRelic
    )
      return;
    const cost = this.price(kind);
    if (
      this.gems < cost ||
      (kind === "heal" && this.hp === this.maxHp) ||
      (kind === "ammo" &&
        (this.rank("ammo") >= 2 ||
          (!this.owned.has("ammo") && this.owned.size >= 4)))
    )
      return;
    this.gems -= cost;
    this.spent += cost;
    this.purchases.add(kind);
    if (kind === "heal") this.hp = Math.min(this.maxHp, this.hp + 1);
    else {
      this.relicLevels.set("ammo", this.rank("ammo") + 1);
      this.owned.add("ammo");
      this.recalculate();
    }
  }
  reroll() {
    if (
      this.mode !== "upgrade" ||
      this.rewardKind !== "relic" ||
      this.midRunUpgrade ||
      this.rerolled ||
      this.pendingRelic ||
      this.gems < this.price("reroll")
    )
      return;
    this.gems -= this.price("reroll");
    this.spent += this.price("reroll");
    this.rerolled = true;
    this.rollChoices();
  }
  finishStage() {
    if (this.runLog.at(-1)?.stage !== this.stage) {
      const b = this.stageOpening;
      this.runLog.push({
        stage: this.stage,
        core: this.core,
        income: this.gems - b.gems + this.spent - b.spent,
        spent: this.spent - b.spent,
        hp: this.hp,
        shots: this.stats.shots - b.shots,
        stomps: this.stats.stomps - b.stomps,
        slams: this.stats.slams - b.slams,
      });
    }
    if (this.stage === LEVELS) {
      this.mode = "won";
      return;
    }
    this.rewardKind = "relic";
    this.rerolled = false;
    this.pendingRelic = null;
    this.rollChoices();
    this.mode = "upgrade";
  }
  update(dt: number, input: Input) {
    if (this.mode !== "playing") return;
    dt = Math.min(dt, 0.025);
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      return;
    }
    for (const effect of this.impacts) effect.life -= dt;
    this.impacts = this.impacts.filter((e) => e.life > 0);
    this.time += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.cooldown -= dt;
    this.slamReady = Math.max(0, this.slamReady - dt);
    this.armorReady = Math.max(0, this.armorReady - dt);
    this.noticeTime -= dt;
    this.shake = Math.max(0, this.shake - dt * 30);
    this.vx =
      ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * this.character.speed;
    if (input.pressed && this.grounded) {
      this.vy =
        this.stage === LEVELS && this.y > this.roomFloor - 60
          ? -820
          : this.stage === LEVELS && this.y > 990
            ? -600
            : -350;
      if (this.stage === LEVELS && this.y > 990)
        this.invulnerable = Math.max(this.invulnerable, 0.3);
      this.grounded = false;
    } else if (
      input.pressed &&
      this.wallJumpReady &&
      ((this.x <= 35 && input.right) || (this.x >= 385 && input.left))
    ) {
      this.vy = -350;
      this.wallJumpReady = false;
    } else if (
      input.fire &&
      !this.grounded &&
      this.cooldown <= 0 &&
      this.ammo > 0
    ) {
      const barrage = this.core === "barrage" && this.ammo >= 2;
      const damage = 1 + (this.firstShot ? this.rank("power") : 0);
      this.ammo -= barrage ? 2 : 1;
      this.firstShot = false;
      this.cooldown = (barrage ? 0.24 : 0.16) * this.character.fireRate;
      this.vy = Math.min(this.vy, this.core === "fall" ? 120 : 35);
      const angles = barrage
        ? this.evolved.has("barrage")
          ? [-220, -110, 0, 110, 220]
          : [-110, 0, 110]
        : [0];
      for (const vx of angles)
        this.bullets.push({
          x: this.x,
          y: this.y + 16,
          vx,
          life: 0.38,
          hit: [],
          damage,
          volley: this.lastShot + 1,
        });
      this.lastShot++;
      this.stats.shots++;
      this.burst(this.x, this.y + 14, 0xf9d879, 3);
    }
    const oldY = this.y,
      oldX = this.x;
    this.vy = Math.min(
      this.zone === 2 && this.stage < LEVELS ? 450 : 680,
      this.vy + (this.zone === 2 && this.stage < LEVELS ? 750 : 1100) * dt,
    );
    if (this.zone === 2 && this.stage < LEVELS) {
      this.oxygen -= dt;
      if (this.oxygen <= 0) {
        this.deathReason = "蓄水层氧气耗尽";
        this.hp = 0;
        this.mode = "dead";
        return;
      }
    }
    this.x = Math.max(34, Math.min(W - 34, this.x + this.vx * dt));
    this.y += this.vy * dt;
    this.grounded = false;
    // Solid ledges stop side-wall slipping and head-first passage through terrain.
    for (const p of this.platforms) {
      const h = p.h ?? 14;
      if (this.y + 13 > p.y && this.y - 13 < p.y + h) {
        if (oldX + 10 <= p.x && this.x + 10 > p.x) this.x = p.x - 10;
        else if (oldX - 10 >= p.x + p.w && this.x - 10 < p.x + p.w)
          this.x = p.x + p.w + 10;
      }
      if (
        this.vy < 0 &&
        oldY - 14 >= p.y + h &&
        this.y - 14 < p.y + h &&
        this.x + 10 > p.x &&
        this.x - 10 < p.x + p.w
      ) {
        this.y = p.y + h + 14;
        this.vy = 0;
      }
    }
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.phase += dt;
      e.flash = Math.max(0, (e.flash ?? 0) - dt);
      if (e.kind === 1 || e.kind === 5) {
        if (Math.abs(e.y - this.y) < 340) e.active = true;
        if (e.active && Math.abs(e.y - this.y) < 850) {
          const dx = this.x - e.x,
            dy = this.y - e.y,
            len = Math.max(1, Math.hypot(dx, dy));
          const speed =
            (e.kind === 5
              ? 155
              : this.stage === 0
                ? 85
                : this.stage === 1
                  ? 100
                  : 115) +
            this.zone * 15;
          e.x += (dx / len) * speed * dt;
          e.y += (dy / len) * speed * dt;
        }
      } else if (e.kind === 2) {
        e.x = e.origin + Math.sin(e.phase * 2.5) * 48;
      } else if (e.kind === 0 || e.kind === 4) {
        e.x = e.origin + Math.sin(e.phase) * 18;
      }
      if (e.kind === 3 && Math.abs(e.y - this.y) < 410) {
        e.shotCooldown = (e.shotCooldown ?? 2) - dt;
        if (e.shotCooldown <= 0) {
          e.shotCooldown = Math.max(1.3, 2.3 - this.stage * 0.25);
          const dx = this.x - e.x,
            dy = this.y - e.y,
            len = Math.max(1, Math.hypot(dx, dy));
          this.hazards.push({
            x: e.x,
            y: e.y,
            vx: (dx / len) * 170,
            vy: (dy / len) * 170,
          });
          this.burst(e.x, e.y, 0xef907e, 4);
        }
      }
      if (Math.abs(this.x - e.x) < 23 && Math.abs(this.y - e.y) < 27) {
        if (
          this.vy > 0 &&
          oldY + 13 <= e.y + 6 &&
          e.kind !== 2 &&
          e.kind !== 5
        ) {
          e.hp = 0;
          this.kill(e, "stomp");
          this.stats.stomps++;
          this.vy =
            (this.core === "leap" ? -350 : -290) -
            (this.rank("bounce") === 2 ? 70 : this.rank("bounce") ? 40 : 0);
          this.y = e.y - 27;
          this.refill();
          this.impact(e.x, e.y, "stomp");
          this.wallJumpReady = true;
          if (this.core === "leap")
            this.area(
              e.x,
              e.y,
              this.evolved.has("leap") ? 100 : 70,
              this.evolved.has("leap") ? 2 : 1,
            );
          if (this.rank("shock")) {
            const target = this.enemies
              .filter(
                (t) =>
                  t.alive &&
                  t.kind !== 4 &&
                  Math.hypot(t.x - e.x, t.y - e.y) <
                    (this.rank("shock") === 2 ? 130 : 90) &&
                  this.lineClear(e.x, e.y, t.x, t.y),
              )
              .sort(
                (a, b) =>
                  Math.hypot(a.x - e.x, a.y - e.y) -
                  Math.hypot(b.x - e.x, b.y - e.y),
              )[0];
            if (target) {
              target.hp--;
              target.flash = 0.1;
              if (target.hp <= 0) this.kill(target);
            }
          }
        } else this.damage();
      }
    }
    for (const spike of this.spikes) {
      if (
        this.x + 9 > spike.x &&
        this.x - 9 < spike.x + spike.w &&
        this.y + 14 > spike.y - 10 &&
        this.y - 14 < spike.y + 5
      )
        this.damage("尖刺命中");
    }
    for (const p of this.platforms) {
      if (
        this.vy >= 0 &&
        oldY + 14 <= p.y + 0.001 &&
        this.y + 14 >= p.y &&
        this.x + 10 > p.x &&
        this.x - 10 < p.x + p.w
      ) {
        const impact = this.vy;
        this.y = p.y - 14;
        this.vy = 0;
        this.grounded = true;
        if (
          this.trial?.kind === "leap" &&
          this.trial.lane === "trial" &&
          !this.trial.done
        )
          this.trial.count = 0;
        this.wallJumpReady = true;
        this.refill();
        if (impact >= 420) {
          if (this.armorReady === 0 && this.rank("rapid")) {
            this.invulnerable = Math.max(
              this.invulnerable,
              this.rank("rapid") === 2 ? 0.4 : 0.25,
            );
            this.armorReady = 2;
          }
          if (
            this.slamReady === 0 &&
            (this.core === "fall" || this.rank("slam"))
          ) {
            this.slamReady = 1;
            this.stats.slams++;
            const evolved = this.evolved.has("fall");
            const struck = new Set<number>();
            this.area(
              this.x,
              p.y - 3,
              (this.core === "fall" ? (evolved ? 130 : 90) : 50) +
                this.rank("slam") * 20,
              this.core === "fall" ? 2 : 1,
              struck,
            );
            if (this.core === "fall" && evolved) {
              this.area(p.x + 12, p.y - 3, 65, 2, struck);
              this.area(p.x + p.w - 12, p.y - 3, 65, 2, struck);
            }
          }
          if (p.breakable && (this.rank("combo") || p.trialGate)) {
            p.vanished = true;
            this.grounded = false;
            this.vy = impact;
            if (p.trialGate && this.trial?.lane === "trial")
              this.trial.count = 1;
            if (this.rank("combo") === 2)
              this.area(this.x, p.y + (p.h ?? 14) + 3, 50, 1);
          }
        }
        break;
      }
    }
    if (this.grounded) {
      this.landTime += dt;
      if (this.combo > 0) {
        const combo = this.combo;
        if (combo >= 8) this.gems += 100;
        if (combo >= 15) {
          this.bonusAmmo++;
          this.recalculate();
          this.refill();
        }
        if (combo >= 25) this.hp = Math.min(this.maxHp, this.hp + 1);
        this.say(
          combo +
            " 连击结算" +
            (combo >= 15 ? " · 弹药上限 +1" : combo >= 8 ? " · 晶石 +100" : ""),
        );
        this.combo = 0;
      }
    } else this.landTime = 0;
    for (const b of this.bullets) {
      b.y += 780 * dt;
      b.x += b.vx * dt;
      b.life -= dt;
      for (const p of this.platforms) {
        if (
          b.life > 0 &&
          b.x > p.x &&
          b.x < p.x + p.w &&
          b.y >= p.y &&
          b.y <= p.y + (p.h ?? 14)
        ) {
          if (p.breakable) {
            p.hp = (p.hp ?? 2) - 1;
            if (p.hp <= 0) {
              p.vanished = true;
              this.burst(b.x, p.y, 0xf9d879, 6);
            }
          }
          b.life = 0;
          break;
        }
      }
      for (const e of this.enemies)
        if (
          b.life > 0 &&
          e.alive &&
          !b.hit.includes(e.id) &&
          Math.abs(b.x - e.x) < 19 &&
          Math.abs(b.y - e.y) < 22
        ) {
          b.hit.push(e.id);
          if (e.kind !== 4) {
            e.hp -= b.damage ?? 1;
            e.flash = 0.1;
            this.impact(b.x, b.y, "hit");
          } else this.impact(b.x, b.y, "armor");
          if (e.hp <= 0) {
            this.kill(e, "shot");
          }
          if (e.kind === 4 || b.hit.length > this.rank("pierce")) b.life = 0;
          break;
        }
      if (
        this.stage === LEVELS &&
        this.bossHp > 0 &&
        !b.hit.includes(-1) &&
        Math.abs(b.x - this.bossX) < 38 &&
        Math.abs(b.y - this.bossY) < 35
      ) {
        if (
          this.bossOpen &&
          (b.volley === undefined || (this.bossVolleys.get(b.volley) ?? 0) < 2)
        ) {
          this.bossHp -= b.damage ?? 1;
          if (b.volley !== undefined)
            this.bossVolleys.set(
              b.volley,
              (this.bossVolleys.get(b.volley) ?? 0) + 1,
            );
        }
        this.impact(b.x, b.y, "hit");
        b.hit.push(-1);
        b.life = 0;
        this.burst(b.x, b.y, 0xef907e, 3);
      }
    }
    this.platforms = this.platforms.filter((p) => !p.vanished);
    this.bullets = this.bullets.filter(
      (b) => b.life > 0 && b.y < this.roomFloor + 50,
    );
    if (this.stage === LEVELS && this.bossHp > 0) {
      this.bossX = 210 + Math.sin(this.time * 1.2) * 110;
      this.bossTimer -= dt;
      if (this.bossTimer <= 0) {
        this.bossTimer = this.bossHp < this.bossMax / 2 ? 1.2 : 1.65;
        for (let i = -2; i <= 2; i++)
          this.hazards.push({
            x: this.bossX,
            y: this.bossY,
            vx: i * 75,
            vy: -185,
          });
      }
      if (Math.hypot(this.x - this.bossX, this.y - this.bossY) < 45) {
        if (this.vy > 0 && oldY + 14 <= this.bossY - 15) {
          if (this.bossOpen) this.bossHp -= this.core === "leap" ? 4 : 2;
          this.y = this.bossY - 49;
          this.vy = -350;
          this.refill();
          this.stats.stomps++;
          this.impact(
            this.bossX,
            this.bossY,
            this.bossOpen ? "stomp" : "armor",
          );
        } else this.damage();
      }
      if (
        this.time >= this.summonAt &&
        this.enemies.filter((e) => e.alive).length < 2
      ) {
        this.summonAt = this.time + 4;
        this.enemies.push({
          id: this.nextId++,
          x: this.bossX,
          y: this.bossY - 110,
          origin: this.bossX,
          kind: 0,
          hp: 1,
          alive: true,
          phase: 0,
        });
      }
    }
    for (const h of this.hazards) {
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      if (Math.hypot(h.x - this.x, h.y - this.y) < 19) this.damage();
    }
    this.hazards = this.hazards.filter(
      (h) => h.y > 0 && h.y < this.roomFloor && h.x > 20 && h.x < W - 20,
    );
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.depth = Math.max(this.depth, this.depthOffset + this.y);
    if (
      this.mode === "playing" &&
      this.stage === 0 &&
      !this.midpoints.has(this.stage) &&
      this.y >= 650 &&
      this.y < this.roomFloor - 100
    ) {
      this.midpoints.add(this.stage);
      this.mode = "upgrade";
      this.rewardKind = "core";
      this.midRunUpgrade = true;
      this.hp = Math.min(this.maxHp, this.hp + 1);
      this.say("补给节点 · 恢复 1 点生命");
      return;
    }
    if (this.mode !== "playing") return;
    if (this.trial && !this.trial.done) {
      const t = this.trial;
      if (!t.lane && this.y >= t.start)
        t.lane = this.x < 198 ? "safe" : "trial";
      if (this.y >= t.end) {
        t.done = true;
        const success =
          t.lane === "trial" &&
          t.count >=
            (t.kind === "fall" ? 1 : t.kind === "leap" ? 3 : t.targets.length);
        if (t.lane === "safe") {
          this.gems += 12;
          this.say("安全路线 · 晶石 +12");
        } else if (success) {
          this.gems += 40;
          this.stats.trials++;
          this.midRunUpgrade = true;
          this.mode = "upgrade";
          this.rewardKind = this.stage % 3 === 2 ? "exchange" : "relic";
          if (this.rewardKind === "relic")
            this.choices = upgrades
              .filter(
                (u) =>
                  u.family === t.kind &&
                  this.rank(u.id) > 0 &&
                  this.rank(u.id) < 2,
              )
              .map((u) => u.id);
          this.say("试炼完成 · 晶石 +40");
          return;
        } else this.say("试炼未完成 · 下一次再挑战");
      }
    }
    if (
      this.stage < LEVELS &&
      !this.shopVisited &&
      this.grounded &&
      Math.abs(this.y - (2650 - 14)) < 2 &&
      this.x < 132
    ) {
      this.shopVisited = true;
      this.mode = "shop";
      return;
    }
    if (
      this.mode === "playing" &&
      this.y >= this.roomFloor - 15 &&
      this.grounded &&
      (this.stage < LEVELS || this.bossHp <= 0)
    )
      this.finishStage();
  }
}
