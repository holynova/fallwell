import type { Simulation } from "./simulation";

/** Original procedural score: look-ahead scheduling, independent music/SFX buses. */
export class GameAudio {
  enabled = true;
  constructor() {
    try {
      this.enabled = localStorage.getItem("fallwell-audio") !== "off";
    } catch {}
  }
  private ctx?: AudioContext;
  private master?: GainNode;
  private music?: GainNode;
  private effects?: GainNode;
  private noise?: AudioBuffer;
  private next = 0;
  private step = 0;
  private mode = "menu";
  private zone = 0;
  private boss = false;
  private pressure = false;
  private timer?: number;
  private snapshot?: number[];
  async unlock() {
    if (!this.ctx) {
      const c = (this.ctx = new AudioContext());
      const compressor = c.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 12;
      compressor.ratio.value = 5;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.15;
      this.master = c.createGain();
      this.master.gain.value = this.enabled ? 0.7 : 0;
      this.master.connect(compressor);
      compressor.connect(c.destination);
      this.music = c.createGain();
      this.music.gain.value = 0.45;
      this.music.connect(this.master);
      this.effects = c.createGain();
      this.effects.connect(this.master);
      this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.next = c.currentTime + 0.04;
      this.timer = window.setInterval(() => this.schedule(), 25);
    }
    await this.ctx.resume();
  }
  toggle() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem("fallwell-audio", this.enabled ? "on" : "off");
    } catch {}
    void this.unlock();
    this.master?.gain.setTargetAtTime(
      this.enabled ? 0.7 : 0,
      this.ctx!.currentTime,
      0.03,
    );
  }
  private note(
    freq: number,
    duration: number,
    gain: number,
    type: OscillatorType = "triangle",
    delay = 0,
    end = freq,
    music = false,
  ) {
    const c = this.ctx;
    if (!c || !this.enabled) return;
    const at = c.currentTime + delay,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), at + duration);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    o.connect(g);
    g.connect(music ? this.music! : this.effects!);
    o.start(at);
    o.stop(at + duration + 0.01);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  private hiss(
    duration: number,
    gain: number,
    frequency: number,
    delay = 0,
    music = false,
  ) {
    const c = this.ctx;
    if (!c || !this.noise || !this.enabled) return;
    const at = c.currentTime + delay,
      source = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain();
    source.buffer = this.noise;
    f.type = "bandpass";
    f.frequency.value = frequency;
    f.Q.value = 0.7;
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(f);
    f.connect(g);
    g.connect(music ? this.music! : this.effects!);
    source.start(at);
    source.stop(at + duration);
    source.onended = () => {
      source.disconnect();
      f.disconnect();
      g.disconnect();
    };
  }
  cue(name: string, combo = 0) {
    if (name === "shot") {
      this.note(150, 0.07, 0.12, "square", 0, 45);
      this.hiss(0.045, 0.12, 2200);
    }
    if (name === "hit") {
      this.hiss(0.055, 0.17, 1100);
      this.note(260, 0.06, 0.08, "triangle", 0, 90);
    }
    if (name === "armor") {
      this.note(980, 0.12, 0.09, "sine", 0, 680);
      this.note(1460, 0.08, 0.04, "sine");
    }
    if (name === "wave") {
      this.note(95, 0.24, 0.2, "sine", 0, 28);
      this.hiss(0.13, 0.14, 700);
    }
    if (name === "stomp") {
      this.note(130, 0.16, 0.24, "sine", 0, 38);
      this.hiss(0.08, 0.14, 600);
    }
    if (name === "kill") {
      this.hiss(0.1, 0.18, 1600);
      this.note(360 + Math.min(combo, 15) * 24, 0.12, 0.1, "square", 0, 150);
    }
    if (name === "reload") {
      this.hiss(0.035, 0.12, 3200);
      this.note(560, 0.045, 0.07, "square", 0.035);
      this.note(1120, 0.12, 0.09, "triangle", 0.075);
    }
    if (name === "hurt") {
      this.note(180, 0.28, 0.16, "sawtooth", 0, 40);
      this.hiss(0.18, 0.18, 450);
      this.music?.gain.setTargetAtTime(0.18, this.ctx!.currentTime, 0.01);
    }
    if (name === "gem") {
      this.note(1320, 0.08, 0.04, "sine");
      this.note(1760, 0.1, 0.025, "sine", 0.035);
    }
    if (name === "land") {
      this.hiss(0.07, 0.08, 420);
      this.note(80, 0.09, 0.08, "sine", 0, 40);
    }
    if (name === "jump") this.note(180, 0.09, 0.07, "triangle", 0, 420);
    if (name === "combo")
      [0, 3, 7].forEach((n, i) =>
        this.note(440 * 2 ** (n / 12), 0.18, 0.07, "triangle", i * 0.05),
      );
    if (["start", "upgrade", "select", "won"].includes(name)) {
      const notes =
        name === "won"
          ? [0, 7, 12, 15, 19, 24]
          : name === "upgrade"
            ? [0, 7, 10, 14]
            : [0, 3, 7, 12];
      notes.forEach((n, i) =>
        this.note(330 * 2 ** (n / 12), 0.32, 0.085, "triangle", i * 0.075),
      );
    }
    if (name === "dead")
      [0, -3, -7, -12].forEach((n, i) =>
        this.note(220 * 2 ** (n / 12), 0.4, 0.1, "triangle", i * 0.15),
      );
  }
  update(s: Simulation) {
    const v = [
      s.lastShot,
      s.impactCount,
      s.reloadCount,
      s.lastHit,
      s.gems,
      Number(s.grounded),
      s.combo,
      s.stage,
    ];
    if (this.snapshot) {
      const p = this.snapshot;
      if (v[0] > p[0]) this.cue("shot");
      if (v[1] > p[1]) this.cue(s.impactKind, s.combo);
      if (v[2] > p[2]) this.cue("reload");
      if (v[3] > p[3]) this.cue("hurt");
      if (v[4] > p[4]) this.cue("gem");
      if (s.mode === "playing" && v[5] !== p[5]) {
        if (v[5]) this.cue("land");
        else if (s.vy < 0) this.cue("jump");
      }
      if (v[6] === 0 && p[6] >= 5) this.cue("combo");
    }
    if (s.mode !== this.mode) {
      if (["upgrade", "dead", "won"].includes(s.mode)) this.cue(s.mode);
      this.mode = s.mode;
      this.step = 0;
      this.next = (this.ctx?.currentTime ?? 0) + 0.05;
    }
    this.zone = s.zone;
    this.boss = s.stage === 12;
    this.pressure = s.hp === 1;
    this.snapshot = v;
    if (this.ctx)
      this.music?.gain.setTargetAtTime(
        s.mode === "playing" ? 0.45 : 0.22,
        this.ctx.currentTime,
        0.3,
      );
  }
  private schedule() {
    const c = this.ctx;
    if (!c || c.state !== "running") return;
    if (!this.enabled || ["paused", "dead", "won"].includes(this.mode)) {
      this.next = c.currentTime + 0.05;
      return;
    }
    if (this.next < c.currentTime) this.next = c.currentTime + 0.02;
    const bpm = this.boss ? 140 : [108, 118, 96, 132][this.zone];
    const beat = 60 / bpm,
      unit = beat / 4,
      calm = this.mode !== "playing";
    const scales = [
      [0, 3, 5, 7, 10],
      [0, 2, 3, 7, 9],
      [0, 3, 5, 8, 10],
      [0, 1, 5, 7, 8],
    ];
    const root = [110, 123.47, 98, 103.83][this.zone];
    while (this.next < c.currentTime + 0.12) {
      const delay = Math.max(0, this.next - c.currentTime),
        n = this.step % 64;
      const chord = [0, 0, 5, 3][Math.floor(n / 16)],
        scale = scales[this.zone];
      if (n % 4 === 0)
        this.note(
          root * 2 ** (chord / 12),
          beat * 0.8,
          0.07,
          "triangle",
          delay,
          root * 2 ** (chord / 12),
          true,
        );
      if (n % 2 === 0) {
        const melody =
          scale[[0, 2, 4, 2, 1, 3, 4, 1][Math.floor(n / 2) % 8]] + chord + 12;
        const freq = root * 2 ** (melody / 12);
        this.note(
          freq,
          unit * (calm ? 3 : 1.5),
          calm ? 0.035 : 0.045,
          "triangle",
          delay,
          freq,
          true,
        );
      }
      if (!calm) {
        if (n % 8 === 0) this.note(105, 0.14, 0.19, "sine", delay, 35, true);
        if (n % 8 === 4) this.hiss(0.09, 0.1, 1800, delay, true);
        if (n % 2 === 0)
          this.hiss(0.025, n % 4 === 0 ? 0.04 : 0.025, 6800, delay, true);
        if (this.boss || this.pressure)
          if (n % 4 === 2)
            this.note(root * 4, 0.04, 0.025, "square", delay, root * 2, true);
      }
      this.next += unit;
      this.step++;
    }
  }
  dispose() {
    if (this.timer) clearInterval(this.timer);
    void this.ctx?.close();
  }
}
