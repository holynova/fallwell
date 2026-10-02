import { test } from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "./simulation";
import { LEVELS, lengths } from "./levels";
const idle = { left: false, right: false, fire: false, pressed: false };
function fresh() {
  const s = new Simulation();
  s.start(42);
  return s;
}
test("landing replenishes ammunition; pause freezes the world", () => {
  const s = fresh();
  s.y = 100;
  s.vy = 100;
  s.ammo = 1;
  for (let i = 0; i < 10; i++) s.update(0.02, idle);
  assert.equal(s.grounded, true);
  assert.equal(s.ammo, s.maxAmmo);
  s.pause();
  const y = s.y;
  s.update(0.02, { ...idle, right: true });
  assert.equal(s.y, y);
});
test("shooting spends ammo and reduces descent velocity", () => {
  const s = fresh();
  s.y = 170;
  s.vy = 400;
  s.update(0.02, { ...idle, fire: true });
  assert.equal(s.ammo, 7);
  assert.ok(s.vy < 400);
  assert.equal(s.bullets.length, 1);
});
test("soft enemies can be stomped and spiked enemies hurt", () => {
  const s = fresh();
  s.platforms = [];
  s.invulnerable = 0;
  s.enemies = [
    {
      id: 1,
      x: 210,
      y: 220,
      origin: 210,
      kind: 0,
      hp: 1,
      alive: true,
      phase: 0,
    },
  ];
  s.y = 194;
  s.vy = 400;
  s.ammo = 0;
  s.update(0.02, idle);
  assert.equal(s.kills, 1);
  assert.equal(s.combo, 1);
  assert.equal(s.ammo, s.maxAmmo);
  assert.ok(s.vy < 0);
  s.enemies = [
    {
      id: 2,
      x: 210,
      y: 220,
      origin: 210,
      kind: 2,
      hp: 2,
      alive: true,
      phase: 0,
    },
  ];
  s.y = 205;
  s.hitStop = 0;
  s.vy = 200;
  s.update(0.02, idle);
  assert.equal(s.hp, 3);
  assert.equal(s.combo, 0);
});
test("upgrade transitions preserve the build and reset the room", () => {
  const s = fresh();
  s.y = s.roomFloor - 14;
  s.update(0.02, idle);
  assert.equal(s.mode, "upgrade");
  assert.equal(s.choices.length, 3);
  const id = s.choices[0];
  s.choose(id);
  assert.equal(s.stage, 1);
  assert.equal(s.mode, "playing");
  assert.ok(s.owned.has(id));
  assert.equal(s.y, 70);
  assert.equal(s.ammo, s.maxAmmo);
});
test("boss must die before exit; bottom spring permits return to combat", () => {
  const s = fresh();
  s.stage = LEVELS;
  s.loadStage();
  s.y = s.roomFloor - 14;
  s.update(0.02, idle);
  assert.equal(s.mode, "playing");
  s.update(0.02, { ...idle, pressed: true });
  assert.ok(s.vy < -600);
  s.bossHp = 0;
  s.y = s.roomFloor - 14;
  s.vy = 0;
  s.update(0.02, idle);
  assert.equal(s.mode, "won");
});
test("seed reproduces enemy generation and rewards; damage reaches death", () => {
  const a = fresh(),
    b = fresh();
  assert.deepEqual(a.enemies, b.enemies);
  a.finishStage();
  b.finishStage();
  assert.deepEqual(a.choices, b.choices);
  a.mode = "playing";
  for (let i = 0; i < 5; i++) {
    a.invulnerable = 0;
    a.damage();
  }
  assert.equal(a.mode, "dead");
});

test("airborne ammunition never regenerates over time or on shooting kills", () => {
  const s = fresh();
  s.platforms = [];
  s.enemies = [];
  s.ammo = 2;
  s.midpoints.add(0);
  for (let i = 0; i < 600; i++) s.update(0.02, idle);
  assert.equal(s.ammo, 2);
  s.y = 170;
  s.vy = 0;
  s.owned.add("rapid");
  s.enemies = [
    {
      id: 99,
      x: 210,
      y: 240,
      origin: 210,
      kind: 0,
      hp: 1,
      alive: true,
      phase: 0,
    },
  ];
  s.bullets = [{ x: 210, y: 228, vx: 0, life: 1, hit: [] }];
  s.update(0.02, idle);
  assert.equal(s.kills, 1);
  assert.equal(s.ammo, 2);
});

test("crossing below a platform edge does not count as landing or reload", () => {
  const s = fresh();
  s.enemies = [];
  s.platforms = [{ x: 150, y: 120, w: 120 }];
  s.y = 108;
  s.vy = 20;
  s.ammo = 1;
  s.update(0.02, idle);
  assert.equal(s.grounded, false);
  assert.equal(s.ammo, 1);
});

test("empty gunboots remain empty while firing in the air", () => {
  const s = fresh();
  s.platforms = [];
  s.enemies = [];
  s.ammo = 0;
  for (let i = 0; i < 300; i++) s.update(0.02, { ...idle, fire: true });
  assert.equal(s.ammo, 0);
  assert.equal(s.lastShot, 0);
});

test("chunk layouts vary by seed, cover both walls, and span four zones", () => {
  const s = fresh();
  assert.equal(s.roomFloor, lengths[0]);
  assert.ok(s.chunks.length >= 8);
  assert.ok(s.enemies.some((e) => e.kind === 4));
  assert.ok(s.enemies.some((e) => e.kind === 1));
  assert.ok(s.platforms.some((p) => p.x === 22));
  assert.ok(s.platforms.some((p) => p.x + p.w === 398));
  s.stage = LEVELS;
  s.loadStage();
  assert.equal(s.roomFloor, 1260);
  assert.equal(
    s.depthOffset,
    lengths.reduce((a, b) => a + b, 0),
  );
});
test("spike contact deals damage; nearby sentries fire aimed projectiles", () => {
  const s = fresh();
  s.platforms = [];
  s.enemies = [];
  s.invulnerable = 0;
  s.y = 200;
  s.spikes = [{ x: 180, y: 205, w: 60 }];
  s.update(0.02, idle);
  assert.equal(s.hp, 3);
  s.spikes = [];
  s.enemies = [
    {
      id: 90,
      x: 100,
      y: 300,
      origin: 100,
      kind: 3,
      hp: 3,
      alive: true,
      phase: 0,
      shotCooldown: 0,
    },
  ];
  s.update(0.02, idle);
  assert.equal(s.hazards.length, 1);
  assert.ok(s.hazards[0].vx > 0);
  assert.ok(s.hazards[0].vy < 0);
});

test("terrain blocks bullets and solid sides; short-range fire cannot clear unseen enemies", () => {
  const s = fresh();
  s.enemies = [];
  s.platforms = [{ x: 250, y: 140, w: 80, h: 50 }];
  s.x = 237;
  s.y = 155;
  s.vy = 0;
  s.update(0.02, { ...idle, right: true });
  assert.equal(s.x, 240);
  s.bullets = [{ x: 270, y: 135, vx: 0, life: 0.38, hit: [] }];
  s.update(0.02, idle);
  assert.equal(s.bullets.length, 0);
  s.platforms = [];
  s.x = 210;
  s.y = 200;
  s.enemies = [
    {
      id: 100,
      x: 210,
      y: 700,
      origin: 210,
      kind: 2,
      hp: 2,
      alive: true,
      phase: 0,
    },
  ];
  s.update(0.02, { ...idle, fire: true });
  for (let i = 0; i < 20; i++) s.update(0.02, idle);
  assert.equal(s.enemies[0].hp, 2);
});
test("turtles resist bullets but stomps kill; pursuing bats approach a stationary player", () => {
  const s = fresh();
  s.platforms = [];
  s.y = 200;
  s.enemies = [
    {
      id: 100,
      x: 210,
      y: 270,
      origin: 210,
      kind: 4,
      hp: 3,
      alive: true,
      phase: 0,
    },
  ];
  s.bullets = [{ x: 210, y: 255, vx: 0, life: 0.38, hit: [] }];
  s.update(0.02, idle);
  assert.equal(s.enemies[0].hp, 3);
  s.hitStop = 0;
  s.y = 244;
  s.vy = 400;
  s.update(0.02, idle);
  assert.equal(s.enemies[0].alive, false);
  s.enemies = [
    {
      id: 101,
      x: 80,
      y: 250,
      origin: 80,
      kind: 1,
      hp: 1,
      alive: true,
      phase: 0,
    },
  ];
  s.x = 210;
  s.y = 200;
  s.vy = 0;
  s.hitStop = 0;
  s.update(0.02, idle);
  assert.ok(s.enemies[0].x > 80);
});
test("rest does not heal; shop purchases spend gems and landing settles combos", () => {
  const s = fresh();
  s.hp = 2;
  s.finishStage();
  assert.equal(s.hp, 2);
  s.gems = 40;
  s.buy("heal");
  assert.equal(s.hp, 3);
  assert.equal(s.gems, 0);
  s.buy("heal");
  assert.equal(s.hp, 3);
  s.mode = "playing";
  s.enemies = [];
  s.platforms = [{ x: 150, y: 120, w: 120 }];
  s.y = 105;
  s.vy = 100;
  s.combo = 15;
  s.update(0.02, idle);
  assert.equal(s.combo, 0);
  assert.equal(s.maxAmmo, 9);
  assert.equal(s.gems, 100);
});

test("one wall jump is available after landing and cannot refill ammunition", () => {
  const s = fresh();
  s.enemies = [];
  s.platforms = [];
  s.x = 34;
  s.y = 250;
  s.wallJumpReady = true;
  s.ammo = 2;
  s.update(0.02, { ...idle, right: true, pressed: true });
  assert.ok(s.vy < -300);
  assert.equal(s.wallJumpReady, false);
  assert.equal(s.ammo, 2);
});
test("destroyable rocks disappear after hits; water oxygen ends the run", () => {
  const s = fresh();
  s.enemies = [];
  s.platforms = [{ x: 180, y: 300, w: 60, h: 24, breakable: true, hp: 2 }];
  s.y = 100;
  for (let i = 0; i < 2; i++) {
    s.bullets = [{ x: 210, y: 290, vx: 0, life: 0.38, hit: [] }];
    s.update(0.02, idle);
  }
  assert.equal(s.platforms.length, 0);
  s.stage = 6;
  s.loadStage();
  s.oxygen = 0.001;
  s.update(0.02, idle);
  assert.equal(s.mode, "dead");
});

test("early upgrade pauses in place, grants a reward and resumes the same level only once", () => {
  const s = fresh();
  s.enemies = [];
  s.platforms = [];
  s.y = 650;
  s.hp = 2;
  s.ammo = 3;
  s.update(0.02, idle);
  assert.equal(s.mode, "upgrade");
  assert.equal(s.midRunUpgrade, true);
  assert.equal(s.rewardKind, "core");
  assert.equal(s.hp, 3);
  const y = s.y,
    stage = s.stage,
    layout = s.platforms;
  s.chooseCore("leap");
  assert.equal(s.mode, "playing");
  assert.equal(s.stage, stage);
  assert.equal(s.y, y);
  assert.equal(s.platforms, layout);
  assert.equal(s.core, "leap");
  assert.equal(s.ammo, 3);
  s.update(0.02, idle);
  assert.equal(s.mode, "playing");
  assert.ok(s.invulnerable > 0);
});
test("impact briefly freezes action and then resumes; first-shot relic levels cap at two", () => {
  const s = fresh();
  s.enemies = [];
  s.platforms = [];
  s.y = 200;
  s.vy = 100;
  s.impact(s.x, s.y, "stomp");
  const y = s.y;
  s.update(0.02, idle);
  assert.equal(s.y, y);
  for (let i = 0; i < 5; i++) s.update(0.02, idle);
  assert.ok(s.y > y);
  assert.ok(s.impacts.length > 0);
  s.mode = "upgrade";
  s.choices = ["power"];
  s.midRunUpgrade = true;
  s.choose("power");
  s.mode = "upgrade";
  s.choices = ["power"];
  s.midRunUpgrade = true;
  s.choose("power");
  assert.equal(s.powerStacks, 2);
});

test("reload sound event occurs only when contact restores missing ammunition", () => {
  const s = fresh();
  s.enemies = [];
  s.platforms = [{ x: 150, y: 120, w: 120 }];
  s.y = 105;
  s.vy = 100;
  s.ammo = 2;
  s.update(0.02, idle);
  assert.equal(s.reloadCount, 1);
  assert.equal(s.ammo, s.maxAmmo);
  for (let i = 0; i < 30; i++) s.update(0.02, idle);
  assert.equal(s.reloadCount, 1);
});

test("character stats apply to a new run and survive upgrades; restart clears prior build", () => {
  const s = fresh();
  s.start(42, "warden");
  assert.equal(s.hp, 6);
  assert.equal(s.maxAmmo, 6);
  s.update(0.01, { ...idle, right: true });
  assert.equal(s.vx, 205);
  s.mode = "upgrade";
  s.choices = ["ammo"];
  s.midRunUpgrade = true;
  s.choose("ammo");
  assert.equal(s.maxAmmo, 8);
  assert.equal(s.characterId, "warden");
  s.start(42, "gunner");
  assert.equal(s.hp, 3);
  assert.equal(s.maxAmmo, 12);
  assert.equal(s.owned.size, 0);
  s.start(42, "ranger");
  s.enemies = [];
  s.platforms = [];
  s.invulnerable = 0;
  s.update(0.01, { ...idle, fire: true });
  assert.equal(s.ammo, 7);
  assert.ok(Math.abs(s.cooldown - 0.136) < 0.001);
});

function emptyArena() {
  const s = fresh();
  s.platforms = [];
  s.enemies = [];
  s.spikes = [];
  s.trial = null;
  s.midpoints.add(0);
  s.y = 200;
  return s;
}
function foe(id: number, x: number, y: number, kind = 0, hp = 1) {
  return { id, x, y, origin: x, kind, hp, alive: true, phase: 0 };
}
function reward(s: Simulation, id: (typeof s.choices)[number]) {
  s.mode = "upgrade";
  s.rewardKind = "relic";
  s.midRunUpgrade = true;
  s.choices = [id];
  s.choose(id);
}

test("cores are exclusive, swapping preserves ammo, barrage uses two ammo and falls back to one", () => {
  const s = emptyArena();
  s.mode = "upgrade";
  s.rewardKind = "core";
  s.midRunUpgrade = true;
  s.ammo = 3;
  s.chooseCore("barrage");
  assert.equal(s.ammo, 3);
  s.update(0.01, { ...idle, fire: true });
  assert.equal(s.bullets.length, 3);
  assert.equal(s.ammo, 1);
  s.cooldown = 0;
  s.update(0.01, { ...idle, fire: true });
  assert.equal(s.bullets.length, 4);
  assert.equal(s.ammo, 0);
  s.mode = "upgrade";
  s.rewardKind = "exchange";
  s.midRunUpgrade = true;
  s.chooseCore("fall");
  assert.equal(s.core, "fall");
  assert.equal(s.ammo, 0);
});
test("slots require explicit replacement, cancelling is free, capacity drops immediately", () => {
  const s = emptyArena();
  for (const id of ["ammo", "shield", "heal", "power"] as const) reward(s, id);
  s.ammo = 10;
  assert.equal(s.owned.size, 4);
  assert.equal(s.maxAmmo, 10);
  s.mode = "upgrade";
  s.rewardKind = "relic";
  s.midRunUpgrade = true;
  s.choices = ["shock"];
  s.choose("shock");
  assert.equal(s.pendingRelic, "shock");
  assert.equal(s.owned.size, 4);
  s.pendingRelic = null;
  assert.equal(s.ammo, 10);
  s.choose("shock", "ammo");
  assert.equal(s.maxAmmo, 8);
  assert.equal(s.ammo, 8);
  assert.equal(s.owned.has("ammo"), false);
  assert.equal(s.rank("shock"), 1);
});
test("relic ranks cap, evolution pauses once and replay resets the whole build", () => {
  const s = emptyArena();
  s.core = "leap";
  reward(s, "shock");
  reward(s, "bounce");
  assert.equal(s.mode, "evolution");
  const y = s.y;
  s.update(0.02, idle);
  assert.equal(s.y, y);
  s.evolve();
  assert.ok(s.evolved.has("leap"));
  assert.equal(s.mode, "playing");
  reward(s, "shock");
  assert.equal(s.rank("shock"), 2);
  reward(s, "shock");
  assert.equal(s.rank("shock"), 2);
  s.start(42);
  assert.equal(s.core, null);
  assert.equal(s.owned.size, 0);
  assert.equal(s.evolved.size, 0);
  assert.equal(s.maxAmmo, 8);
});
test("weighted choices are unique, seed-stable, exclude max rank and offer new synergy early", () => {
  const a = emptyArena(),
    b = emptyArena();
  for (const s of [a, b]) {
    s.core = "leap";
    s.owned.add("shock");
    s.relicLevels.set("shock", 2);
    s.rollChoices();
  }
  assert.deepEqual(a.choices, b.choices);
  assert.equal(new Set(a.choices).size, 3);
  assert.ok(!a.choices.includes("shock"));
  assert.ok(["bounce", "hover"].includes(a.choices[0]));
});
test("first-shot damage is spent once and does not refill in air; passive explosions never recurse", () => {
  const s = emptyArena();
  reward(s, "power");
  s.update(0.01, { ...idle, fire: true });
  assert.equal(s.bullets[0].damage, 2);
  s.cooldown = 0;
  s.update(0.01, { ...idle, fire: true });
  assert.equal(s.bullets[1].damage, 1);
  reward(s, "split");
  s.enemies = [foe(1, 210, 240), foe(2, 250, 240), foe(3, 290, 240)];
  s.bullets = [{ x: 210, y: 228, vx: 0, life: 1, hit: [], damage: 1 }];
  s.update(0.02, idle);
  assert.equal(s.enemies[1].alive, false);
  assert.equal(s.enemies[2].alive, true);
  assert.equal(s.ammo, 6);
});
test("waves respect armor and walls, overlapping evolved ground waves only damage once", () => {
  const s = emptyArena();
  s.enemies = [foe(1, 230, 200, 4, 3), foe(2, 290, 200, 0, 3)];
  s.platforms = [{ x: 250, y: 170, w: 20, h: 60 }];
  s.area(210, 200, 130, 2);
  assert.equal(s.enemies[0].hp, 3);
  assert.equal(s.enemies[1].hp, 3);
  s.hitStop = 0;
  s.platforms = [{ x: 150, y: 300, w: 120, h: 14 }];
  s.core = "fall";
  s.evolved.add("fall");
  s.y = 275;
  s.vy = 600;
  s.enemies = [foe(3, 240, 270, 2, 10)];
  s.update(0.02, idle);
  assert.equal(s.enemies[0].hp, 8);
  assert.equal(s.stats.slams, 1);
});
test("heavy landing triggers, broken rock preserves descent, ordinary shooting cannot replenish", () => {
  const s = emptyArena();
  s.core = "fall";
  s.platforms = [
    { x: 150, y: 300, w: 120, h: 24, breakable: true, trialGate: true },
  ];
  s.y = 275;
  s.vy = 600;
  s.ammo = 1;
  s.update(0.02, idle);
  assert.equal(s.platforms.length, 0);
  assert.equal(s.grounded, false);
  assert.ok(s.vy > 420);
  assert.equal(s.ammo, 8);
});
test("trial rewards are lane-locked and cannot be repeated; later stages do not repeat early core selection", () => {
  const s = emptyArena();
  s.stage = 1;
  s.loadStage();
  s.enemies = [];
  s.platforms = [];
  s.spikes = [];
  s.trial!.lane = "safe";
  s.y = 2151;
  s.update(0.01, idle);
  assert.equal(s.gems, 12);
  s.update(0.01, idle);
  assert.equal(s.gems, 12);
  assert.equal(s.mode, "playing");
  s.loadStage();
  s.enemies = [];
  s.platforms = [];
  s.spikes = [];
  s.trial!.lane = "trial";
  s.trial!.count = 3;
  s.y = 2151;
  s.update(0.01, idle);
  assert.equal(s.mode, "upgrade");
  assert.equal(s.gems, 52);
  assert.ok(s.trial!.done);
  s.skip();
  assert.equal(s.stage, 1);
});
test("shop limits share across side room and rest; reroll spends once; no purchase occurs behind replacement", () => {
  const s = emptyArena();
  s.hp = 2;
  s.gems = 200;
  s.mode = "shop";
  s.buy("heal");
  assert.equal(s.gems, 160);
  s.mode = "upgrade";
  s.buy("heal");
  assert.equal(s.gems, 160);
  s.buy("ammo");
  assert.equal(s.maxAmmo, 10);
  assert.equal(s.ammo, 8);
  assert.equal(s.gems, 100);
  s.reroll();
  assert.equal(s.gems, 75);
  s.reroll();
  assert.equal(s.gems, 75);
  s.pendingRelic = "shock";
  s.purchases.clear();
  s.buy("heal");
  assert.equal(s.gems, 75);
});
test("boss weakpoint accepts bullets, stomp and quake; closed armor rejects both damage effects", () => {
  const shot = emptyArena();
  shot.stage = LEVELS;
  shot.time = 0;
  shot.bossX = 210;
  shot.bossY = 300;
  shot.bullets = [{ x: 210, y: 288, vx: 0, life: 1, hit: [] }];
  shot.update(0.02, idle);
  assert.equal(shot.bossHp, 47);
  const quake = emptyArena();
  quake.stage = LEVELS;
  quake.bossX = 210;
  quake.bossY = 300;
  quake.area(210, 330, 90, 2);
  assert.equal(quake.bossHp, 46);
  quake.time = 3;
  quake.area(210, 330, 90, 2);
  assert.equal(quake.bossHp, 46);
  const stomp = emptyArena();
  stomp.stage = LEVELS;
  stomp.core = "leap";
  stomp.bossY = 300;
  stomp.y = 250;
  stomp.vy = 600;
  stomp.update(0.02, idle);
  assert.equal(stomp.bossHp, 44);
  assert.ok(stomp.vy < 0);
});

test("generated trial sections can all be completed using only movement and fire inputs", () => {
  for (const [stage, core] of [
    [0, "barrage"],
    [1, "leap"],
    [2, "fall"],
  ] as const) {
    const s = fresh();
    s.core = core;
    s.stage = stage;
    s.loadStage();
    s.midpoints.add(0);
    s.x = 300;
    s.y = 1460;
    for (let i = 0; i < 12000 && s.mode === "playing" && s.y < 2190; i++) {
      let target = 300,
        fire = false;
      if (core === "leap") {
        const e = s.enemies
          .filter(
            (e) => s.trial!.targets.includes(e.id) && e.alive && e.y > s.y + 10,
          )
          .sort((a, b) => a.y - b.y)[0];
        if (e) target = e.x;
      }
      if (core === "barrage") {
        const first = s.enemies.find((e) => e.id === s.trial!.targets[0]),
          second = s.enemies.find((e) => e.id === s.trial!.targets[1]);
        if (first?.alive) {
          target = first.x;
          fire = first.y - s.y < 280;
        } else if (s.y < 1740) target = 247;
        else if (second?.alive) {
          target = second.x;
          fire = second.y - s.y < 280;
        } else target = 247;
      }
      s.update(1 / 120, {
        left: s.x > target + 3,
        right: s.x < target - 3,
        fire,
        pressed: false,
      });
    }
    assert.equal(s.mode, "upgrade", core);
    assert.equal(s.stats.trials, 1, core);
    assert.ok(s.hp > 0, core);
    assert.ok(s.gems >= 40, core);
  }
});
test("boss launch pads allow high-speed landing and closed weakpoint bounces stomps safely", () => {
  const s = emptyArena();
  s.stage = LEVELS;
  s.loadStage();
  s.x = 170;
  s.y = 1036;
  s.grounded = true;
  s.update(0.01, { ...idle, pressed: true });
  assert.ok(s.vy < -550);
  assert.ok(s.invulnerable > 0);
  const b = emptyArena();
  b.stage = LEVELS;
  b.time = 3;
  b.x = 210 + Math.sin(3.02 * 1.2) * 110;
  b.bossY = 300;
  b.y = 250;
  b.vy = 600;
  b.update(0.02, idle);
  assert.equal(b.bossHp, 48);
  assert.ok(b.vy < 0);
  assert.equal(b.ammo, 8);
});
test("a scatter volley cannot multiply single-target boss damage with all five pellets", () => {
  const s = emptyArena();
  s.stage = LEVELS;
  s.bossX = 210;
  s.bossY = 300;
  s.bullets = Array.from({ length: 5 }, () => ({
    x: 210,
    y: 288,
    vx: 0,
    life: 1,
    hit: [],
    volley: 1,
  }));
  s.update(0.02, idle);
  assert.equal(s.bossHp, 46);
});
