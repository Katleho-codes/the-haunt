/**
 * A small recording stand-in for the Web Audio API. It does not make sound: it records every node, every scheduled
 * gain value and every start/stop so tests can check levels, lengths and routing.
 */

export interface ParamEvent { kind: string; value: number; time: number }

export class FakeParam {
  value: number;
  readonly events: ParamEvent[] = [];
  readonly inputs: FakeNode[] = [];
  constructor(value = 0) { this.value = value; }
  setValueAtTime(value: number, time: number) { this.events.push({ kind: "set", value, time }); this.value = value; return this; }
  linearRampToValueAtTime(value: number, time: number) { this.events.push({ kind: "linear", value, time }); this.value = value; return this; }
  exponentialRampToValueAtTime(value: number, time: number) {
    if (value <= 0) throw new RangeError("exponential ramp target must be positive");
    this.events.push({ kind: "exp", value, time }); this.value = value; return this;
  }
  setTargetAtTime(value: number, time: number, constant: number) { this.events.push({ kind: "target", value, time: time + constant }); return this; }
  cancelScheduledValues(time: number) { this.events.push({ kind: "cancel", value: Number.NaN, time }); return this; }
  /** Highest value this parameter was ever set or ramped to. */
  max(): number { return Math.max(this.value, ...this.events.filter((e) => !Number.isNaN(e.value)).map((e) => e.value)); }
}

export class FakeNode {
  readonly outputs: Array<FakeNode | FakeParam> = [];
  constructor(readonly ctx: FakeAudioContext, readonly kind: string) { ctx.nodes.push(this); }
  connect<T extends FakeNode | FakeParam>(target: T): T {
    this.outputs.push(target);
    if (target instanceof FakeParam) target.inputs.push(this);
    return target;
  }
  disconnect() { this.outputs.length = 0; }
}

export class FakeSource extends FakeNode {
  startedAt: number | null = null;
  startOffset = 0;
  stoppedAt: number | null = null;
  start(time = 0, offset = 0) { if (this.startedAt !== null) throw new Error("started twice"); this.startedAt = time; this.startOffset = offset; }
  stop(time = 0) { this.stoppedAt = time; }
}

export class FakeOscillator extends FakeSource {
  type = "sine";
  readonly frequency = new FakeParam(440);
  readonly detune = new FakeParam(0);
  constructor(ctx: FakeAudioContext) { super(ctx, "oscillator"); }
}

export class FakeBufferSource extends FakeSource {
  buffer: FakeBuffer | null = null;
  loop = false;
  readonly playbackRate = new FakeParam(1);
  constructor(ctx: FakeAudioContext) { super(ctx, "buffer-source"); }
}

export class FakeGain extends FakeNode {
  readonly gain = new FakeParam(1);
  constructor(ctx: FakeAudioContext) { super(ctx, "gain"); }
}

export class FakeFilter extends FakeNode {
  type = "lowpass";
  readonly frequency = new FakeParam(350);
  readonly Q = new FakeParam(1);
  readonly gain = new FakeParam(0);
  constructor(ctx: FakeAudioContext) { super(ctx, "filter"); }
}

export class FakeCompressor extends FakeNode {
  readonly threshold = new FakeParam(-24);
  readonly knee = new FakeParam(30);
  readonly ratio = new FakeParam(12);
  readonly attack = new FakeParam(0.003);
  readonly release = new FakeParam(0.25);
  constructor(ctx: FakeAudioContext) { super(ctx, "compressor"); }
}

export class FakeConvolver extends FakeNode {
  buffer: FakeBuffer | null = null;
  constructor(ctx: FakeAudioContext) { super(ctx, "convolver"); }
}

export class FakeBuffer {
  private readonly channels: Float32Array[];
  constructor(readonly numberOfChannels: number, readonly length: number, readonly sampleRate: number) {
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  get duration() { return this.length / this.sampleRate; }
  getChannelData(index: number) { return this.channels[index]; }
}

export class FakeAudioContext {
  readonly nodes: FakeNode[] = [];
  readonly destination: FakeNode;
  currentTime = 0;
  sampleRate: number;
  state: "running" | "suspended" | "closed" = "running";
  decodeDuration = 0.4;

  constructor(sampleRate = 8000) {
    this.sampleRate = sampleRate;
    this.destination = new FakeNode(this, "destination");
  }
  createOscillator() { return new FakeOscillator(this); }
  createBufferSource() { return new FakeBufferSource(this); }
  createGain() { return new FakeGain(this); }
  createBiquadFilter() { return new FakeFilter(this); }
  createDynamicsCompressor() { return new FakeCompressor(this); }
  createConvolver() { return new FakeConvolver(this); }
  createBuffer(channels: number, length: number, rate: number) { return new FakeBuffer(channels, length, rate); }
  async decodeAudioData(data: ArrayBuffer) {
    if (data.byteLength === 0) throw new Error("could not decode");
    return new FakeBuffer(1, Math.floor(this.sampleRate * this.decodeDuration), this.sampleRate);
  }
  async resume() { this.state = "running"; }
  async suspend() { this.state = "suspended"; }

  sources(): FakeSource[] { return this.nodes.filter((n): n is FakeSource => n instanceof FakeSource); }
  gains(): FakeGain[] { return this.nodes.filter((n): n is FakeGain => n instanceof FakeGain); }
}

/** Casts for passing the fake where Web Audio types are expected. */
export const asContext = (ctx: FakeAudioContext) => ctx as unknown as AudioContext;
export const asNode = (node: FakeNode) => node as unknown as AudioNode;
