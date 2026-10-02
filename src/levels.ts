// Original chunk designs based on Downwell's open-space / enemy-platform relationship.
// Pixel dimensions are this prototype's tuning values, not extracted original-game data.
export const LEVELS = 12;
export const lengths = [
  5200, 5600, 6000, 5400, 5800, 6200, 5600, 6000, 6400, 5400, 5800, 6200,
];
export const zoneNames = ["矿洞", "墓穴", "蓄水层", "虚空"];
export type Terrain = {
  x: number;
  y: number;
  w: number;
  h?: number;
  breakable?: boolean;
  hp?: number;
  vanished?: boolean;
  trialGate?: boolean;
};
export type Encounter = { x: number; y: number; kind: number };
export function createLevel(stage: number, random: () => number) {
  const zone = Math.floor(stage / 3);
  const floor = lengths[stage] ?? 1260;
  const platforms: Terrain[] = [
    { x: 154, y: 120, w: 112, h: 16 },
    { x: 22, y: floor, w: 376, h: 24 },
  ];
  const spikes: { x: number; y: number; w: number }[] = [];
  const enemies: Encounter[] = [];
  const chunks: string[] = [];
  const place = (x: number, y: number, w: number, h = 20, breakable = false) =>
    platforms.push({ x, y, w, h, breakable, hp: breakable ? 2 : undefined });
  const spawn = (x: number, y: number, kind: number) =>
    enemies.push({ x, y, kind });
  if (stage === LEVELS) {
    place(22, 280, 120, 20);
    place(278, 460, 120, 20);
    place(22, 650, 110, 20);
    // Combat pads launch high enough for both stomps and high-speed landings.
    place(110, 1050, 90, 16);
    place(250, 1050, 90, 16);
    return { floor, platforms, spikes, enemies, chunks: ["boss"] };
  }
  // Each 340-pixel chunk has a readable entry, an encounter, and a different exit route.
  let previous = -1;
  for (let y = 300, index = 0; y < floor - 330; y += 340, index++) {
    let type = Math.floor(random() * 6);
    if (type === previous) type = (type + 1) % 6;
    previous = type;
    const mirror = random() < 0.5;
    const mx = (x: number, w = 0) => (mirror ? 420 - x - w : x);
    const p = (x: number, dy: number, w: number, h = 20, b = false) =>
      place(mx(x, w), y + dy, w, h, b);
    const e = (x: number, dy: number, k: number) => spawn(mx(x), y + dy, k);
    const spike = (x: number, dy: number, w: number) =>
      spikes.push({ x: mx(x, w), y: y + dy, w });
    chunks.push(
      [
        "ledge-cross",
        "stomp-chain",
        "rock-gate",
        "crossfire",
        "red-fork",
        "broken-stair",
      ][type] + (mirror ? "-R" : "-L"),
    );
    if (type === 0) {
      // wall protrusions close both wall shortcuts; open diagonal flight path
      p(22, 30, 126, 64);
      p(284, 210, 114, 48);
      e(85, 13, 4);
      e(305, 130, 1);
      e(205, 240, zone >= 2 ? 2 : 1);
    } else if (type === 1) {
      p(22, 35, 88, 40);
      p(320, 240, 78, 40);
      e(155, 45, 1);
      e(222, 140, 0);
      e(285, 235, 1);
      e(335, 185, 2);
    } else if (type === 2) {
      p(22, 35, 96, 48);
      p(302, 160, 96, 48);
      p(157, 118, 32, 32, true);
      p(189, 118, 32, 32, true);
      p(221, 118, 32, 32, true);
      e(100, 18, 0);
      e(285, 235, 1);
      e(205, 268, zone > 0 ? 2 : 1);
    } else if (type === 3) {
      p(22, 40, 104, 40);
      p(294, 210, 104, 40);
      e(76, 23, 3);
      e(348, 193, zone > 0 ? 3 : 0);
      e(210, 130, 1);
      e(175, 250, 2);
    } else if (type === 4) {
      p(22, 50, 110, 48);
      p(292, 235, 106, 32);
      e(194, 80, 2);
      e(260, 175, 4);
      e(125, 240, 1);
      if (zone > 0) spike(22, 50, 70);
    } else {
      p(22, 20, 90, 40);
      p(178, 150, 48, 24, true);
      p(310, 260, 88, 40);
      e(140, 85, 1);
      e(267, 215, 2);
      e(349, 243, 4);
    }
    // Escaped enemies catch up: open space remains dangerous without carpet-bombing the screen.
    if (stage > 0 || index % 3 === 2) e(45, 295, 1);
    if (zone > 0 && index % 2 === 1) {
      e(225, 305, 5);
      spike(310, 260, 88);
    }
    if (zone >= 2 && type === 1) {
      platforms[platforms.length - 1].breakable = true;
      platforms[platforms.length - 1].hp = 2;
    }
    if (zone === 3) {
      // sparse footholds; deliberate stomp routes carry the refill economy
      for (const t of platforms)
        if (t.y >= y && t.y < y + 340 && t.x > 130 && t.x < 280)
          t.vanished = true;
      e(200, 185, 0);
    }
  }
  // One visible, physically divided fork; geometry is independent of the player's build.
  for (let i = platforms.length - 1; i >= 0; i--)
    if (platforms[i].y >= 1250 && platforms[i].y < 2300) platforms.splice(i, 1);
  for (let i = enemies.length - 1; i >= 0; i--)
    if (enemies[i].y >= 1250 && enemies[i].y < 2300) enemies.splice(i, 1);
  for (let i = spikes.length - 1; i >= 0; i--)
    if (spikes[i].y >= 1250 && spikes[i].y < 2300) spikes.splice(i, 1);
  place(198, 1450, 24, 680);
  place(22, 1740, 100, 18);
  place(92, 2060, 70, 18);
  if (stage % 3 === 0) {
    place(280, 1710, 100, 18);
    place(280, 1960, 100, 18);
    spawn(315, 1660, 3);
    spawn(315, 1910, 3);
  }
  if (stage % 3 === 1) {
    spawn(282, 1570, 4);
    spawn(305, 1810, 4);
    spawn(275, 2050, 4);
  }
  if (stage % 3 === 2) {
    place(230, 1770, 168, 24, true);
    platforms[platforms.length - 1].trialGate = true;
    spawn(300, 1850, 0);
  }
  place(22, 2650, 110, 20);
  if (stage === 0) {
    // The opening teaches stomping first; red threats and sentries arrive after the first reward.
    for (const e of enemies)
      if (e.y < 1000 && (e.kind === 2 || e.kind === 3)) e.kind = 0;
  }
  return {
    floor,
    platforms: platforms.filter((p) => !p.vanished),
    spikes,
    enemies,
    chunks,
  };
}
