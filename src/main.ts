import Phaser from "phaser";
import { GameAudio } from "./audio";
import { Simulation } from "./simulation";
import {
  W,
  upgrades,
  relicEffect,
  cores,
  type CoreId,
  characters,
  type CharacterId,
  type UpgradeId,
} from "./data";
import { LEVELS, zoneNames } from "./levels";
import "./style.css";
import { ArtView, ASSETS } from "./art";
export const sim = new Simulation();
let selectedCharacter: CharacterId = "scout";
try {
  const saved = localStorage.getItem("fallwell-character");
  if (characters.some((c) => c.id === saved))
    selectedCharacter = saved as CharacterId;
} catch {}
const audio = new GameAudio();
function readBest() {
  try {
    return JSON.parse(
      localStorage.getItem("fallwell-best") || '{"depth":0,"combo":0}',
    );
  } catch {
    return { depth: 0, combo: 0 };
  }
}
let best = readBest();
document.querySelector("#app")!.innerHTML = `
  <div class="stage-fit"><main class="shell" data-mode="menu">
    <header><a class="brand" href="${import.meta.env.BASE_URL}" aria-label="坠井者首页">F<span>↓</span>W</a><span class="edition">FALLWELL <small class="version">${__APP_VERSION__}</small></span><a class="repo-link" href="https://github.com/holynova/fallwell" target="_blank" rel="noopener noreferrer" aria-label="GitHub 源码">GitHub ↗</a><button id="sound" class="icon" aria-label="切换音效">声音 开</button></header>
    <section class="cabinet" aria-label="游戏区域">
      <div class="hud"><div><label>生命</label><strong id="health"></strong></div><div class="hud-depth"><label id="stage">废弃矿井</label><strong id="depth">0000<span>m</span></strong></div><button id="pause" class="icon" aria-label="暂停游戏">Ⅱ</button></div>
      <div class="viewport"><div id="game"></div><div id="core-badge"></div><div id="route-signs"></div><div id="notice" aria-live="polite"></div><div id="overlay"></div><div id="bossbar"><span>井底守卫</span><div><i></i></div></div></div>
      <div class="bottom-hud"><div><label>弹药</label><span id="ammo"></span></div><div><span class="crystal">◆</span> <strong id="gems">0</strong></div><div class="combo"><strong id="combo">0</strong><label>连击</label></div></div>
    </section>
    <div class="controls-hint"><span><kbd>← →</kbd> 移动</span><span><kbd>空格</kbd> 跳跃 / 开火</span><span><kbd>ESC</kbd> 暂停</span></div>
  </main></div>`;
// Scale the entire stage together: the playfield, HUD and DOM menus share one
// coordinate system, so resizing never crops the well or changes its physics.
const app = document.getElementById("app")!;
const stageFit = document.querySelector<HTMLElement>(".stage-fit")!;
function fitStage() {
  const style = getComputedStyle(app);
  const width = app.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const height = app.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const scale = Math.max(0.01, Math.min(width / 422, height / 720));
  stageFit.style.width = `${422 * scale}px`;
  stageFit.style.height = `${720 * scale}px`;
  stageFit.style.setProperty("--stage-scale", String(scale));
}
new ResizeObserver(fitStage).observe(app);
window.visualViewport?.addEventListener("resize", fitStage);
fitStage();
const el = (id: string) => document.getElementById(id)!;
let modeCache = "",
  saved = false;
function shopHtml() {
  return `<div class="shop"><button data-buy="heal" ${sim.gems < sim.price("heal") || sim.hp === sim.maxHp || sim.purchases.has("heal") ? "disabled" : ""}>补 1 生命 · ${sim.price("heal")} ◆</button><button data-buy="ammo" ${sim.gems < sim.price("ammo") || sim.purchases.has("ammo") || sim.rank("ammo") === 2 || (!sim.owned.has("ammo") && sim.owned.size === 4) ? "disabled" : ""}>扩容匣 +1 级 · ${sim.price("ammo")} ◆</button><small>持有 ${sim.gems} ◆ · 本关购买次数共享</small></div>`;
}
function overlay() {
  const mode = sim.mode;
  if (mode === modeCache) return;
  modeCache = mode;
  document.querySelector<HTMLElement>(".shell")!.dataset.mode = mode;
  const root = el("overlay");
  root.className = mode === "playing" ? "hidden" : "";
  if (mode === "menu")
    root.innerHTML = `<div class="panel start-panel"><h2>坠井者</h2><p class="menu-intro">选一位角色，向深井出发。</p><div class="character-grid" role="group" aria-label="选择角色">${characters.map((c) => `<button class="character-card ${c.id === selectedCharacter ? "selected" : ""}" data-character="${c.id}" aria-pressed="${c.id === selectedCharacter}" style="--character-color:${c.color}"><span class="character-portrait" aria-hidden="true"></span><span><strong>${c.name}</strong><small>${c.hp} 生命 · ${c.ammo} 弹药</small></span></button>`).join("")}</div><p id="character-description" class="character-description">${characters.find((c) => c.id === selectedCharacter)!.desc}</p><button class="primary" id="start">进入深井 <span>↓</span></button><small class="landing-tip">空中开火减速 · 落地补弹</small></div>`;
  if (mode === "paused")
    root.innerHTML = `<div class="panel pause-panel"><div class="eyebrow">PAUSED / ${sim.character.name}</div><h2>暂停</h2><div id="loadout">${loadoutHtml()}</div><p class="record">个人纪录 ${best.depth} m · ${best.combo} 连击</p><button class="primary" id="resume">继续下落 <span>↓</span></button><button class="secondary" id="restart">重新开始</button></div>`;
  if (mode === "upgrade") {
    if (sim.pendingRelic) {
      const item = upgrades.find((u) => u.id === sim.pendingRelic)!;
      root.innerHTML = `<div class="panel upgrades replacement"><div class="eyebrow">REPLACE / 遗物槽 4 / 4</div><h2>用${item.name}替换哪一件？</h2><p>${relicEffect(item.id, 1)}</p>${[
        ...sim.owned,
      ]
        .map((id) => {
          const old = upgrades.find((u) => u.id === id)!;
          return `<button class="choice" data-replace="${id}" style="--accent:${old.color}"><img class="item-icon" src="${import.meta.env.BASE_URL}assets/icons/${id}.svg" alt=""><div><h3>替换 ${old.name} · ${sim.rank(id)} 级</h3><p>${relicEffect(old.id, sim.rank(old.id))}</p></div></button>`;
        })
        .join(
          "",
        )}<button class="secondary" id="cancel-replace">取消，返回选择</button></div>`;
    } else if (sim.rewardKind !== "relic") {
      root.innerHTML = `<div class="panel upgrades"><div class="eyebrow">${sim.rewardKind === "core" ? "FIRST CORE / 首次补给" : "CORE EXCHANGE / 试炼奖励"}</div><h2>${sim.rewardKind === "core" ? "选择这局的打法。" : "换一种打法？"}</h2><p>${sim.rewardKind === "core" ? "已恢复 1 点生命 · 核心立即生效" : "更换不补弹 · 已获得 40 晶石"}</p>${cores.map((c, i) => `<button class="choice" data-core="${c.id}" style="--accent:${c.color}"><span class="choice-num">0${i + 1}</span><img class="item-icon" src="${import.meta.env.BASE_URL}assets/icons/core-${c.id}.svg" alt=""><div><small>${c.tag}${sim.core === c.id ? " · 当前核心" : ""}</small><h3>${c.name}</h3><p>${c.desc}</p></div></button>`).join("")}${sim.rewardKind === "exchange" ? '<button class="secondary" id="skip">保留当前核心</button>' : "<small>核心只能有一个 · 落地或踩怪补弹</small>"}</div>`;
    } else {
      root.innerHTML = `<div class="panel upgrades"><div class="eyebrow">${sim.midRunUpgrade ? "TRIAL / 同类强化" : "REST / 关末构筑"}</div><h2>让这局形成组合。</h2><p>${sim.coreData?.goal ?? "收集遗物完善打法"} · 槽位 ${sim.owned.size}/4</p>${sim.choices
        .map((id, i) => {
          const u = upgrades.find((u) => u.id === id)!;
          return `<button class="choice" data-upgrade="${id}" style="--accent:${u.color}"><span class="choice-num">0${i + 1}</span><img class="item-icon" src="${import.meta.env.BASE_URL}assets/icons/${id}.svg" alt=""><div><small>${u.tag}${u.family === sim.core ? " · 核心协同" : ""}</small><h3>${u.name} · ${sim.rank(id) + 1} 级</h3><p>${relicEffect(u.id, sim.rank(id) + 1)}${sim.owned.has(id) ? " 升级现有遗物。" : sim.owned.size === 4 ? " 需要替换一件。" : ""}</p></div></button>`;
        })
        .join(
          "",
        )}${!sim.choices.length ? "<p>同类遗物均已满级或尚未装备，可带着晶石继续。</p>" : ""}${sim.midRunUpgrade ? "" : shopHtml()}<div class="reward-actions"><button class="secondary" id="reroll" ${sim.rerolled || sim.midRunUpgrade || sim.gems < sim.price("reroll") ? "disabled" : ""}>重抽 · ${sim.price("reroll")} ◆</button><button class="secondary" id="skip">跳过 · +10 ◆</button></div></div>`;
    }
  }
  if (mode === "shop")
    root.innerHTML = `<div class="panel"><div class="eyebrow">SIDE SHOP / 本关继续</div><h2>补给，还是强化？</h2><p>每项每关限购一次 · 容量提升不会补弹</p>${shopHtml()}<button class="primary" id="leave-shop">继续下落 ↓</button></div>`;
  if (mode === "evolution")
    root.innerHTML = `<div class="panel"><div class="seal">✦</div><div class="eyebrow">EVOLUTION / 两件同类遗物</div><h2>${sim.coreData!.name} → ${sim.coreData!.evolution}</h2><p>${sim.core === "barrage" ? "散射弹从 3 枚增加至 5 枚，消耗仍为 2。" : sim.core === "leap" ? "踩踏冲击扩大至 100，伤害提升至 2。" : "落地冲击扩大至 130，向平台两侧延伸。"}</p><button class="primary" id="evolve">确认进化，继续 ↓</button></div>`;
  if (mode === "dead" || mode === "won") {
    if (!saved) {
      best = {
        depth: Math.max(best.depth, Math.floor(sim.depth)),
        combo: Math.max(best.combo, sim.bestCombo),
      };
      try {
        localStorage.setItem("fallwell-best", JSON.stringify(best));
      } catch {}
      saved = true;
    }
    root.innerHTML = `<div class="panel"><div class="seal">${mode === "won" ? "✦" : "↓"}</div><div class="eyebrow">${mode === "won" ? "THE CORE IS YOURS" : "ONE MORE DESCENT"}</div><h2>${mode === "won" ? "你抵达了井底。" : "深井记住了你。"}</h2><p>${mode === "won" ? "核心已取回。下一次，试试不同的构筑。" : "换一条路线，再往下走一次。"}</p><p>本局：${sim.coreData ? (sim.evolved.has(sim.core!) ? sim.coreData.evolution : sim.coreData.name) : "标准枪靴"} · ${sim.owned.size} 件遗物<br>${sim.deathReason || "下次试试另一种组合"}<br>射击 ${sim.stats.shots} · 踩踏 ${sim.stats.stomps} · 重坠 ${sim.stats.slams}</p><div class="results"><div><strong>${Math.floor(sim.depth)}</strong><label>下落深度</label></div><div><strong>${sim.bestCombo}</strong><label>最高连击</label></div><div><strong>${sim.kills}</strong><label>击败敌人</label></div></div><button class="primary" id="restart">再来一局 ↓</button><button class="secondary" id="characters">更换角色</button></div>`;
  }
  const refresh = () => {
    modeCache = "";
    overlay();
  };
  root.querySelectorAll<HTMLButtonElement>("[data-core]").forEach(
    (b) =>
      (b.onclick = () => {
        sim.chooseCore(b.dataset.core as CoreId);
        audio.cue("select");
        refresh();
      }),
  );
  root.querySelectorAll<HTMLButtonElement>("[data-replace]").forEach(
    (b) =>
      (b.onclick = () => {
        sim.choose(sim.pendingRelic!, b.dataset.replace as UpgradeId);
        audio.cue("select");
        refresh();
      }),
  );
  root.querySelector("#cancel-replace")?.addEventListener("click", () => {
    sim.pendingRelic = null;
    refresh();
  });
  root.querySelector("#skip")?.addEventListener("click", () => {
    sim.skip();
    refresh();
  });
  root.querySelector("#reroll")?.addEventListener("click", () => {
    sim.reroll();
    refresh();
  });
  root.querySelector("#evolve")?.addEventListener("click", () => {
    sim.evolve();
    audio.cue("won");
    refresh();
  });
  root.querySelector("#leave-shop")?.addEventListener("click", () => {
    sim.mode = "playing";
    sim.invulnerable = Math.max(1, sim.invulnerable);
    refresh();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-character]").forEach(
    (b) =>
      (b.onclick = () => {
        selectedCharacter = b.dataset.character as CharacterId;
        try {
          localStorage.setItem("fallwell-character", selectedCharacter);
        } catch {}
        audio.cue("gem");
        modeCache = "";
        overlay();
      }),
  );
  root.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach(
    (b) =>
      (b.onclick = () => {
        sim.buy(b.dataset.buy as "heal" | "ammo");
        modeCache = "";
      }),
  );
  root.querySelector("#characters")?.addEventListener("click", () => {
    sim.mode = "menu";
    modeCache = "";
    overlay();
  });
  root.querySelector("#start")?.addEventListener("click", start);
  root.querySelector("#restart")?.addEventListener("click", start);
  root.querySelector("#resume")?.addEventListener("click", () => sim.pause());
  root.querySelectorAll<HTMLButtonElement>("[data-upgrade]").forEach(
    (b) =>
      (b.onclick = () => {
        sim.choose(b.dataset.upgrade as UpgradeId);
        modeCache = "";
        void audio.unlock();
        audio.cue("select");
      }),
  );
}
function start() {
  saved = false;
  sim.start(Date.now(), selectedCharacter);
  void audio.unlock().then(() => audio.cue("start"));
}
el("sound").textContent = "声音 " + (audio.enabled ? "开" : "关");
window.addEventListener(
  "pointerdown",
  () => {
    void audio.unlock();
  },
  { once: true },
);
window.addEventListener(
  "keydown",
  () => {
    void audio.unlock();
  },
  { once: true },
);
el("pause").onclick = () => sim.pause();
el("sound").onclick = () => {
  audio.toggle();
  el("sound").textContent = "声音 " + (audio.enabled ? "开" : "关");
  el("sound").setAttribute("aria-pressed", String(audio.enabled));
};
window.addEventListener("blur", () => {
  if (sim.mode === "playing") sim.pause();
});
function loadoutHtml() {
  return (sim.coreData
    ? `<div class="core-summary" style="--accent:${sim.coreData.color}"><strong>${sim.evolved.has(sim.core!) ? sim.coreData.evolution : sim.coreData.name}</strong><small>${sim.evolved.has(sim.core!) ? "已进化" : sim.coreData.goal}</small></div>`
    : '<p class="empty-loadout">650 m 获得首个核心</p>') +
    (sim.owned.size
      ? `<div class="equipped-grid">${[...sim.owned].map((id) => {
        const u = upgrades.find((u) => u.id === id)!;
        return `<div class="equipped"><img class="loadout-icon" src="${import.meta.env.BASE_URL}assets/icons/${u.id}.svg" alt=""><div><strong>${u.name} · ${sim.rank(id)} 级</strong><small>${relicEffect(id, sim.rank(id))}</small></div></div>`;
      }).join("")}</div>`
      : '<p class="empty-loadout">遗物 0 / 4 · 完成试炼或关卡获得</p>');
}
function hud() {
  el("health").innerHTML = Array.from(
    { length: sim.maxHp },
    (_, i) => `<span class="hp-heart ${i < sim.hp ? "" : "empty"}">♥</span>`,
  ).join("");
  el("depth").innerHTML =
    String(Math.floor(sim.depth)).padStart(4, "0") + "<span>m</span>";
  el("stage").textContent =
    sim.stage === LEVELS
      ? "井底 / 守卫"
      : zoneNames[sim.zone] +
        " / " +
        (sim.zone + 1) +
        "-" +
        ((sim.stage % 3) + 1) +
        (sim.zone === 2 ? " · 氧气 " + Math.ceil(sim.oxygen) + "s" : "");
  el("ammo").innerHTML = Array.from(
    { length: sim.maxAmmo },
    (_, i) => `<i class="${i < sim.ammo ? "full" : ""}"></i>`,
  ).join("");
  el("gems").textContent = String(sim.gems);
  el("combo").textContent = String(sim.combo);
  el("notice").textContent =
    sim.noticeTime > 0 && sim.mode === "playing" ? sim.notice : "";
  el("bossbar").style.display =
    sim.stage === LEVELS && sim.mode === "playing" && sim.bossHp > 0
      ? "block"
      : "none";
  (el("bossbar").querySelector("i") as HTMLElement).style.width =
    Math.max(0, (sim.bossHp / sim.bossMax) * 100) + "%";
  el("core-badge").style.display=sim.mode==="playing"?"flex":"none";
  el("route-signs").style.display=sim.mode==="playing"?"flex":"none";
  el("core-badge").innerHTML = sim.coreData
    ? `<strong>${sim.evolved.has(sim.core!) ? sim.coreData.evolution : sim.coreData.name}</strong><span>${sim.owned.size}/4 遗物${sim.core === "fall" && sim.vy >= 420 ? " · 重坠就绪" : ""}</span>`
    : "650m 解锁核心";
  const trial = sim.trial;
  const visible =
    trial && !trial.done && sim.y > trial.start - 500 && sim.y < trial.end;
  el("route-signs").innerHTML = visible
    ? `<span>← 安全 · +12 ◆</span><span>${cores.find((c) => c.id === trial.kind)!.tag}试炼 →<small>${trial.kind === "fall" ? "高速落地破岩" : trial.kind === "leap" ? "连续踩 3 只" : "射击清 2 座炮台"} · +40 ◆</small></span>`
    : "";
  overlay();
}
class WellScene extends Phaser.Scene {
  g!: Phaser.GameObjects.Graphics;
  art!: ArtView;
  preload() {
    this.load.image("art-atlas", ASSETS.atlas);
    this.load.image("art-biomes", ASSETS.background);
  }
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  camY = 0;
  accumulator = 0;
  pendingJump = false;
  create() {
    this.g = this.add.graphics().setDepth(20);
    this.art = new ArtView(this);
    this.keys = this.input.keyboard!.addKeys(
      "LEFT,RIGHT,A,D,SPACE,ESC",
    ) as typeof this.keys;
    this.input.keyboard!.addCapture(["SPACE", "LEFT", "RIGHT"]);
  }
  update(_t: number, delta: number) {
    const k = this.keys;
    if (Phaser.Input.Keyboard.JustDown(k.ESC)) sim.pause();
    this.pendingJump ||= Phaser.Input.Keyboard.JustDown(k.SPACE);
    const action = {
      left: k.LEFT.isDown || k.A.isDown,
      right: k.RIGHT.isDown || k.D.isDown,
      fire: k.SPACE.isDown,
      pressed: this.pendingJump,
    };
    this.accumulator += Math.min(delta / 1000, 0.1);
    while (this.accumulator >= 1 / 120) {
      sim.update(1 / 120, action);
      action.pressed = false;
      this.pendingJump = false;
      this.accumulator -= 1 / 120;
    }
    audio.update(sim);
    this.camY =
      sim.y < 100
        ? 0
        : Phaser.Math.Linear(
            this.camY,
            Math.max(0, Math.min(sim.roomFloor - 540, sim.y - 170)),
            0.12,
          );
    this.draw();
    hud();
  }
  draw() {
    const g = this.g;
    g.clear();
    const offset = this.camY;
    const sy = (y: number) => y - offset;
    this.art.render(sim, offset);
    // Collision-aligned edges and warnings remain above the textured art.
    for (const p of sim.platforms) {
      const y = sy(p.y);
      if (y + (p.h ?? 14) < -80 || y > 550) continue;
      g.fillStyle(p.breakable ? 0xf9d879 : 0x91d8be, 0.85);
      g.fillRect(p.x, y, p.w, 2);
      g.lineStyle(1, 0x0a161b, 0.8);
      g.strokeRect(p.x, y, p.w, p.h ?? 14);
    }
    for (const e of sim.enemies) {
      if (!e.alive) continue;
      const y = sy(e.y);
      if (y < -35 || y > 570) continue;
      if (e.kind !== 2 && e.kind !== 5) {
        g.fillStyle(0x91d8be, 0.9);
        g.fillRect(e.x - 3, y - 17, 6, 2);
      }
      if (e.kind === 3 && (e.shotCooldown ?? 2) < 0.55) {
        g.lineStyle(1, 0xef907e, 0.8);
        g.strokeCircle(e.x, y, 22);
      }
      if ((e.flash ?? 0) > 0) {
        g.lineStyle(2, 0xffffff, 0.8);
        g.strokeCircle(e.x, y, 18);
      }
    }
    if (sim.core === "fall" && sim.vy >= 420) {
      g.lineStyle(2, 0xef907e, 0.8);
      g.strokeCircle(sim.x, sy(sim.y), 21);
    }
    if (sim.rank("hover"))
      for (const e of sim.enemies)
        if (
          e.alive &&
          e.kind !== 2 &&
          e.kind !== 5 &&
          Math.hypot(e.x - sim.x, e.y - sim.y) <
            (sim.rank("hover") === 2 ? 200 : 140)
        ) {
          g.lineStyle(1, 0x91d8be, 0.7);
          g.strokeCircle(e.x, sy(e.y), 22);
        }
    if (sim.trial && !sim.trial.done) {
      g.lineStyle(2, 0xf9d879, 0.6);
      g.strokeRect(230, sy(sim.trial.start) - 12, 160, 20);
    }
    if (sim.stage < LEVELS && !sim.shopVisited) {
      g.fillStyle(0xf9d879);
      g.fillRect(58, sy(2650) - 38, 24, 24);
      g.fillStyle(0x10181b);
      g.fillRect(68, sy(2650) - 34, 4, 16);
      g.fillRect(62, sy(2650) - 28, 16, 4);
    }
    if (sim.stage === LEVELS) {
      g.lineStyle(3, sim.bossOpen ? 0x91d8be : 0xef907e, 0.9);
      g.strokeCircle(sim.bossX, sy(sim.bossY), 44);
      el("bossbar").querySelector("span")!.textContent = sim.bossOpen
        ? "井底守卫 · 弱点开放"
        : "井底守卫 · 装甲闭合";
    }
    for (const h of sim.hazards) {
      g.fillStyle(0xef907e, 0.15);
      g.fillCircle(h.x, sy(h.y), 12);
      g.fillStyle(0xef907e);
      g.fillCircle(h.x, sy(h.y), 6);
    }
    for (const p of sim.particles) {
      g.fillStyle(p.color, Math.min(1, p.life * 2));
      g.fillRect(p.x - 2, sy(p.y) - 2, 4, 4);
    }
    for (const effect of sim.impacts) {
      const t = 1 - effect.life / 0.26,
        x = effect.x,
        y = sy(effect.y);
      g.lineStyle(
        effect.kind === "stomp" ? 3 : 2,
        effect.kind === "armor" ? 0xf9d879 : 0xf6f0d8,
        1 - t,
      );
      g.strokeCircle(
        x,
        y,
        8 +
          t *
            (effect.kind === "wave" ? 110 : effect.kind === "stomp" ? 44 : 22),
      );
      if (effect.life > 0.19) {
        g.fillStyle(0xffffff, 0.9);
        g.fillRect(x - 15, y - 2, 30, 4);
        g.fillRect(x - 2, y - 15, 4, 30);
      }
    }
    if (sim.shield) {
      g.lineStyle(1, 0xaebbe9, 0.8);
      g.strokeCircle(sim.x, sy(sim.y), 25);
    }
    // Slow dust makes the shaft feel deep without hiding silhouettes.
    for (let i = 0; i < 14; i++) {
      const x = 36 + ((i * 79) % 348),
        y = (i * 97 + sim.time * (3 + (i % 4)) - offset * 0.35) % 540;
      g.fillStyle(0x9cbeb6, 0.13);
      g.fillRect(x, (y + 540) % 540, 2, 2);
    }
    if (sim.cooldown > 0.115 && !sim.grounded) {
      g.fillStyle(0xf9d879, 0.8);
      g.fillTriangle(
        sim.x - 10,
        sy(sim.y) + 17,
        sim.x + 10,
        sy(sim.y) + 17,
        sim.x,
        sy(sim.y) + 34,
      );
    }
    if (sim.stage === LEVELS) {
      g.fillStyle(0xf9d879);
      g.fillRect(165, sy(sim.roomFloor) - 4, 90, 4);
    }
    this.cameras.main.setScroll(
      sim.shake ? Math.sin(sim.time * 90) * sim.shake * 0.3 : 0,
      0,
    );
  }
}
new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: 540,
  parent: "game",
  backgroundColor: "#10181b",
  pixelArt: true,
  scene: WellScene,
  scale: { mode: Phaser.Scale.NONE },
  audio: { noAudio: true },
});
