import Phaser from "phaser";
import type { Simulation } from "./simulation";
import { LEVELS } from "./levels";
export const ASSETS = {
  atlas: "/assets/art/characters-v1.webp",
  background: "/assets/art/biomes-v1.webp",
};
const names = [
  "hero-idle",
  "hero-run-a",
  "hero-run-b",
  "hero-air",
  "slime",
  "bat",
  "spike",
  "sentry",
  "turtle",
  "ghost",
  "boss",
  "gem",
  "bullet",
  "rock",
  "spikes",
  "heart",
];
export class ArtView {
  private hero: Phaser.GameObjects.Sprite;
  private boss: Phaser.GameObjects.Sprite;
  private backgrounds: Phaser.GameObjects.TileSprite[] = [];
  private enemies = new Map<number, Phaser.GameObjects.Sprite>();
  private platforms: Phaser.GameObjects.TileSprite[] = [];
  private spikes: Phaser.GameObjects.TileSprite[] = [];
  private glyphs: Phaser.GameObjects.Image[] = [];
  private heroScale = 1;
  private bullets: Phaser.GameObjects.Image[] = [];
  constructor(private scene: Phaser.Scene) {
    const tex = scene.textures.get("art-atlas"),
      source = tex.getSourceImage() as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(source, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const cw = Math.floor(canvas.width / 4),
      ch = Math.floor(canvas.height / 4);
    let heroHeight = 0;
    names.forEach((name, index) => {
      const ox = (index % 4) * cw,
        oy = Math.floor(index / 4) * ch;
      let left = cw,
        right = 0,
        top = ch,
        bottom = 0;
      for (let y = 0; y < ch; y++)
        for (let x = 0; x < cw; x++)
          if (pixels[((oy + y) * canvas.width + ox + x) * 4 + 3] > 100) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
      if (right <= left) {
        left = 0;
        top = 0;
        right = cw - 1;
        bottom = ch - 1;
      }
      const frame = tex.add(
        name,
        0,
        ox + left,
        oy + top,
        right - left + 1,
        bottom - top + 1,
      )!;
      if (index < 3) heroHeight = Math.max(heroHeight, frame.height);
    });
    this.heroScale = 36 / heroHeight;
    for (const [property, frame] of [
      ["--gem-sprite", "gem"],
      ["--heart-sprite", "heart"],
      ["--hero-sprite", "hero-idle"],
    ]) {
      document.documentElement.style.setProperty(
        property,
        'url("' + scene.textures.getBase64("art-atlas", frame) + '")',
      );
    }
    const bg = scene.textures
      .get("art-biomes")
      .getSourceImage() as HTMLImageElement;
    for (let zone = 0; zone < 4; zone++) {
      const width = Math.floor(bg.width / 4);
      scene.textures
        .get("art-biomes")
        .add("zone-" + zone, 0, zone * width, 0, width, bg.height);
      const layer = scene.add
        .tileSprite(210, 270, 420, 540, "art-biomes", "zone-" + zone)
        .setDepth(-100)
        .setAlpha(0.58);
      layer.setTileScale(420 / width);
      this.backgrounds.push(layer);
      const tile = scene.textures.createCanvas("stone-" + zone, 32, 32)!;
      const c = tile.context;
      const colors = [
        ["#293f40", "#1b2b31", "#5b7870"],
        ["#3e3549", "#282332", "#817186"],
        ["#264654", "#182e3b", "#6b9c9b"],
        ["#3a304b", "#201d30", "#827496"],
      ][zone];
      c.fillStyle = colors[1];
      c.fillRect(0, 0, 32, 32);
      c.fillStyle = colors[0];
      c.fillRect(1, 1, 30, 14);
      c.fillRect(1, 17, 14, 14);
      c.fillRect(17, 17, 14, 14);
      c.fillStyle = colors[2];
      c.fillRect(2, 2, 27, 1);
      c.fillRect(3, 18, 10, 1);
      c.fillRect(19, 18, 10, 1);
      c.fillStyle = colors[1];
      c.fillRect(22, 8, 5, 2);
      c.fillRect(6, 24, 3, 2);
      tile.refresh();
    }
    this.hero = scene.add
      .sprite(210, 70, "art-atlas", "hero-idle")
      .setOrigin(0.5, 1)
      .setScale(this.heroScale)
      .setDepth(-5);
    this.boss = scene.add
      .sprite(210, 0, "art-atlas", "boss")
      .setDisplaySize(82, 82)
      .setDepth(-15);
  }
  render(sim: Simulation, offset: number) {
    this.backgrounds.forEach((bg, i) => {
      bg.setVisible(sim.zone === i);
      bg.tilePositionY = offset * 0.18;
    });
    // Pools keep image objects stable while the simulation remains the only source of collision state.
    sim.platforms.forEach((p, i) => {
      let tile = this.platforms[i];
      if (!tile) {
        tile = this.scene.add
          .tileSprite(0, 0, 1, 1, "stone-0")
          .setOrigin(0)
          .setDepth(-30);
        this.platforms[i] = tile;
      }
      tile.setTexture("stone-" + sim.zone);
      tile.setPosition(p.x, p.y - offset);
      tile.setSize(p.w, p.h ?? 14);
      tile.setVisible(p.y - offset < 560 && p.y + (p.h ?? 14) - offset > 0);
      tile.setTint(p.breakable ? 0xeac780 : 0xffffff);
      let mark = this.glyphs[i];
      if (!mark) {
        mark = this.scene.add.image(0, 0, "art-atlas", "rock").setDepth(-25);
        this.glyphs[i] = mark;
      }
      mark
        .setVisible(!!p.breakable && tile.visible)
        .setPosition(p.x + p.w / 2, p.y - offset + (p.h ?? 14) / 2)
        .setDisplaySize(Math.min(p.w, 32), Math.min(p.h ?? 14, 32));
    });
    for (let i = sim.platforms.length; i < this.platforms.length; i++) {
      this.platforms[i].setVisible(false);
      this.glyphs[i].setVisible(false);
    }
    sim.spikes.forEach((p, i) => {
      let image = this.spikes[i];
      if (!image) {
        image = this.scene.add
          .tileSprite(0, 0, 1, 1, "art-atlas", "spikes")
          .setOrigin(0, 1)
          .setDepth(-20);
        this.spikes[i] = image;
      }
      image.setPosition(p.x, p.y - offset + 5);
      image.setSize(p.w, 18);
      const frame = image.frame;
      image.setTileScale(36 / frame.width, 18 / frame.height);
      image.setVisible(p.y - offset > -20 && p.y - offset < 560);
    });
    for (let i = sim.spikes.length; i < this.spikes.length; i++)
      this.spikes[i].setVisible(false);
    const aliveIds = new Set<number>();
    for (const e of sim.enemies) {
      aliveIds.add(e.id);
      let sprite = this.enemies.get(e.id);
      if (!sprite) {
        sprite = this.scene.add
          .sprite(e.x, e.y, "art-atlas", names[4 + e.kind])
          .setDepth(-10);
        this.enemies.set(e.id, sprite);
      }
      const y = e.y - offset;
      sprite.setPosition(e.x, y).setVisible(e.alive && y > -40 && y < 580);
      const frame = sprite.frame;
      const width = e.kind === 1 ? 40 : e.kind === 5 ? 34 : 28;
      const scale = width / frame.width;
      const pulse = e.kind === 0 ? Math.sin(e.phase * 3) * 0.035 : 0;
      sprite
        .setScale(scale * (1 + pulse), scale * (1 - pulse))
        .setFlipX(e.kind === 1 && e.x > sim.x);
      if ((e.flash ?? 0) > 0) sprite.setTintFill(0xffffff);
      else sprite.clearTint();
      sprite.setAlpha(e.kind === 5 ? 0.8 : 1);
    }
    for (const [id, sprite] of this.enemies)
      if (!aliveIds.has(id)) {
        sprite.destroy();
        this.enemies.delete(id);
      }
    const shooting = !sim.grounded && sim.cooldown > 0.09;
    const frame = !sim.grounded
      ? shooting
        ? "hero-air"
        : "hero-run-b"
      : Math.abs(sim.vx) > 10
        ? Math.floor(sim.time * 10) % 2
          ? "hero-run-a"
          : "hero-run-b"
        : "hero-idle";
    this.hero
      .setOrigin(0.5, shooting ? 0.65 : 1)
      .setFrame(frame)
      .setPosition(sim.x, sim.y - offset + 14)
      .setScale(this.heroScale)
      .setTint(sim.character.tint)
      .setFlipX(sim.vx < 0)
      .setVisible(
        sim.invulnerable <= 0 || Math.floor(sim.invulnerable * 12) % 2 === 0,
      );
    this.hero.setAngle(
      !sim.grounded ? Phaser.Math.Clamp(sim.vx / 60, -4, 4) : 0,
    );
    sim.bullets.forEach((b, i) => {
      let image = this.bullets[i];
      if (!image) {
        image = this.scene.add.image(0, 0, "art-atlas", "bullet").setDepth(5);
        this.bullets[i] = image;
      }
      image
        .setPosition(b.x, b.y - offset)
        .setDisplaySize(7, 18)
        .setVisible(b.y - offset > -20 && b.y - offset < 560);
    });
    for (let i = sim.bullets.length; i < this.bullets.length; i++)
      this.bullets[i].setVisible(false);
    this.boss
      .setPosition(sim.bossX, sim.bossY - offset)
      .setVisible(sim.stage === LEVELS && sim.bossHp > 0);
    this.boss.setScale(
      (82 / this.boss.frame.width) * (1 + Math.sin(sim.time * 3) * 0.015),
    );
  }
}
