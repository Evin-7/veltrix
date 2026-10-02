"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";

export type GameSound =
  | "chip-place"
  | "card-deal"
  | "blackjack-hit"
  | "blackjack-stand"
  | "blackjack-double"
  | "win"
  | "loss"
  | "push"
  | "blackjack"
  | "slot-spin-start"
  | "slot-reel-stop"
  | "slot-win"
  | "slot-big-win"
  | "slot-no-win"
  | "roulette-spin"
  | "roulette-settle"
  | "roulette-result"
  | "baccarat-player"
  | "baccarat-banker"
  | "baccarat-tie"
  | "dice-shake"
  | "dice-roll"
  | "dice-land"
  | "arcade-start"
  | "arcade-lane"
  | "arcade-token"
  | "arcade-milestone"
  | "arcade-complete"
  | "arcade-high-score";

type PlayOptions = { delayMs?: number; volume?: number };
type AmbientKind = "arcade";
type AudioContextConstructor = new () => AudioContext;
type AudioGraph = {
  context: AudioContext;
  master: GainNode;
  sfx: GainNode;
  ambient: GainNode;
};
type AmbientHandle = { sources: AudioScheduledSourceNode[] };

type GameAudioContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean | ((current: boolean) => boolean)) => void;
  masterVolume: number;
  setMasterVolume: (value: number) => void;
  play: (sound: GameSound, options?: PlayOptions) => void;
  startAmbient: (kind: AmbientKind) => void;
  stopAmbient: () => void;
  stopAll: () => void;
};

const GameAudioContext = createContext<GameAudioContextValue | null>(null);
const soundPreferenceEvent = "veltrix:sound-preference";

function subscribeToSoundPreference(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(soundPreferenceEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(soundPreferenceEvent, onChange);
  };
}

function getSoundPreference() {
  try {
    return window.localStorage.getItem("veltrix-sound") !== "off";
  } catch {
    return true;
  }
}

function getServerSoundPreference() {
  return true;
}

function audioContextConstructor() {
  const browserWindow = window as typeof window & {
    webkitAudioContext?: AudioContextConstructor;
  };
  return browserWindow.AudioContext ?? browserWindow.webkitAudioContext;
}

function trackSource(source: AudioScheduledSourceNode, sources: Set<AudioScheduledSourceNode>) {
  sources.add(source);
  source.addEventListener("ended", () => sources.delete(source), { once: true });
}

function scheduleTone(
  graph: AudioGraph,
  sources: Set<AudioScheduledSourceNode>,
  frequency: number,
  duration: number,
  volume: number,
  startAt: number,
  type: OscillatorType = "sine",
  endFrequency = frequency,
) {
  const { context, sfx } = graph;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  if (endFrequency !== frequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), startAt + duration);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), startAt + Math.min(0.018, duration * 0.2));
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain).connect(sfx);
  trackSource(oscillator, sources);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.03);
}

function scheduleNoise(
  graph: AudioGraph,
  sources: Set<AudioScheduledSourceNode>,
  duration: number,
  volume: number,
  startAt: number,
  filterFrequency = 1800,
) {
  const { context, sfx } = graph;
  const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * duration)), context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) channel[index] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(filterFrequency, startAt);
  filter.Q.setValueAtTime(0.7, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), startAt + Math.min(0.01, duration * 0.25));
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  source.connect(filter).connect(gain).connect(sfx);
  trackSource(source, sources);
  source.start(startAt);
  source.stop(startAt + 0.025 + duration);
}

function renderSound(graph: AudioGraph, sources: Set<AudioScheduledSourceNode>, sound: GameSound, startAt: number, volume: number) {
  const tone = (frequency: number, duration: number, level = volume, offset = 0, type: OscillatorType = "sine", endFrequency = frequency) => scheduleTone(graph, sources, frequency, duration, level, startAt + offset, type, endFrequency);
  const noise = (duration: number, level = volume, offset = 0, filterFrequency?: number) => scheduleNoise(graph, sources, duration, level, startAt + offset, filterFrequency);

  switch (sound) {
    case "chip-place":
      tone(620, 0.055, volume * 0.55, 0, "triangle");
      tone(920, 0.075, volume * 0.35, 0.045, "sine");
      break;
    case "card-deal":
      noise(0.055, volume * 0.55, 0, 2400);
      tone(190, 0.09, volume * 0.32, 0.015, "triangle", 120);
      break;
    case "blackjack-hit":
      tone(330, 0.1, volume * 0.42, 0, "triangle", 250);
      break;
    case "blackjack-stand":
      tone(280, 0.13, volume * 0.4, 0, "sine", 220);
      break;
    case "blackjack-double":
      tone(300, 0.09, volume * 0.42, 0, "triangle");
      tone(450, 0.14, volume * 0.32, 0.08, "triangle");
      break;
    case "win":
      tone(520, 0.14, volume * 0.5, 0, "sine");
      tone(660, 0.18, volume * 0.46, 0.1, "sine");
      tone(880, 0.25, volume * 0.38, 0.21, "sine");
      break;
    case "loss":
      tone(280, 0.18, volume * 0.36, 0, "triangle", 190);
      tone(180, 0.24, volume * 0.3, 0.15, "triangle", 130);
      break;
    case "push":
      tone(390, 0.13, volume * 0.36, 0, "sine");
      tone(390, 0.15, volume * 0.3, 0.14, "sine");
      break;
    case "blackjack":
      tone(660, 0.14, volume * 0.5, 0, "sine");
      tone(830, 0.16, volume * 0.45, 0.1, "sine");
      tone(1040, 0.28, volume * 0.42, 0.22, "sine");
      tone(1310, 0.32, volume * 0.28, 0.34, "sine");
      break;
    case "slot-spin-start":
      noise(0.16, volume * 0.28, 0, 750);
      tone(120, 0.35, volume * 0.2, 0, "sawtooth", 250);
      tone(180, 0.22, volume * 0.18, 0.18, "triangle", 280);
      break;
    case "slot-reel-stop":
      noise(0.045, volume * 0.5, 0, 1800);
      tone(220, 0.09, volume * 0.3, 0.02, "triangle", 140);
      break;
    case "slot-win":
      tone(440, 0.12, volume * 0.42, 0, "sine");
      tone(554, 0.14, volume * 0.36, 0.08, "sine");
      tone(660, 0.2, volume * 0.32, 0.18, "sine");
      break;
    case "slot-big-win":
      tone(440, 0.12, volume * 0.42, 0, "sine");
      tone(554, 0.14, volume * 0.38, 0.08, "sine");
      tone(660, 0.16, volume * 0.36, 0.18, "sine");
      tone(880, 0.3, volume * 0.38, 0.3, "sine");
      break;
    case "slot-no-win":
      tone(230, 0.16, volume * 0.22, 0, "triangle", 185);
      break;
    case "roulette-spin":
      noise(0.32, volume * 0.18, 0, 1000);
      for (let index = 0; index < 5; index += 1) tone(210 + index * 24, 0.045, volume * 0.22, index * 0.07, "square");
      break;
    case "roulette-settle":
      tone(360, 0.12, volume * 0.32, 0, "triangle", 260);
      tone(190, 0.16, volume * 0.24, 0.1, "triangle", 140);
      break;
    case "roulette-result":
      tone(500, 0.12, volume * 0.4, 0, "sine");
      tone(750, 0.18, volume * 0.32, 0.11, "sine");
      break;
    case "baccarat-player":
      tone(460, 0.15, volume * 0.34, 0, "sine");
      tone(620, 0.2, volume * 0.3, 0.12, "sine");
      break;
    case "baccarat-banker":
      tone(330, 0.15, volume * 0.34, 0, "sine");
      tone(440, 0.2, volume * 0.3, 0.12, "sine");
      break;
    case "baccarat-tie":
      tone(390, 0.13, volume * 0.3, 0, "sine");
      tone(520, 0.16, volume * 0.28, 0.13, "sine");
      tone(390, 0.18, volume * 0.25, 0.28, "sine");
      break;
    case "dice-shake":
      noise(0.22, volume * 0.32, 0, 3200);
      noise(0.15, volume * 0.2, 0.17, 2600);
      break;
    case "dice-roll":
      tone(160, 0.32, volume * 0.28, 0, "triangle", 300);
      break;
    case "dice-land":
      noise(0.07, volume * 0.5, 0, 1200);
      tone(250, 0.12, volume * 0.32, 0.02, "triangle", 170);
      break;
    case "arcade-start":
      tone(110, 0.32, volume * 0.28, 0, "sawtooth", 220);
      tone(330, 0.18, volume * 0.28, 0.18, "square");
      break;
    case "arcade-lane":
      tone(720, 0.045, volume * 0.25, 0, "square", 520);
      break;
    case "arcade-token":
      tone(620, 0.08, volume * 0.32, 0, "sine");
      tone(930, 0.12, volume * 0.28, 0.07, "sine");
      break;
    case "arcade-milestone":
      tone(440, 0.12, volume * 0.34, 0, "sine");
      tone(660, 0.15, volume * 0.3, 0.1, "sine");
      tone(880, 0.22, volume * 0.26, 0.22, "sine");
      break;
    case "arcade-complete":
      tone(380, 0.12, volume * 0.28, 0, "triangle");
      tone(520, 0.18, volume * 0.32, 0.1, "triangle");
      break;
    case "arcade-high-score":
      tone(660, 0.12, volume * 0.38, 0, "sine");
      tone(880, 0.15, volume * 0.34, 0.1, "sine");
      tone(1320, 0.28, volume * 0.3, 0.22, "sine");
      break;
    default:
      break;
  }
}

function startArcadeAmbient(graph: AudioGraph): AmbientHandle {
  const { context, ambient } = graph;
  const engine = context.createOscillator();
  const engineGain = context.createGain();
  const modulation = context.createOscillator();
  const modulationGain = context.createGain();
  engine.type = "sawtooth";
  engine.frequency.setValueAtTime(72, context.currentTime);
  engineGain.gain.setValueAtTime(0.025, context.currentTime);
  modulation.type = "sine";
  modulation.frequency.setValueAtTime(2.2, context.currentTime);
  modulationGain.gain.setValueAtTime(12, context.currentTime);
  modulation.connect(modulationGain).connect(engine.frequency);
  engine.connect(engineGain).connect(ambient);
  engine.start();
  modulation.start();
  return { sources: [engine, modulation] };
}

export function GameAudioProvider({ children }: { children: React.ReactNode }) {
  const enabled = useSyncExternalStore(subscribeToSoundPreference, getSoundPreference, getServerSoundPreference);
  const [masterVolume, setMasterVolumeState] = useState(0.42);
  const graphRef = useRef<AudioGraph | null>(null);
  const activeSourcesRef = useRef(new Set<AudioScheduledSourceNode>());
  const ambientRef = useRef<AmbientHandle | null>(null);

  const stopAmbient = useCallback(() => {
    ambientRef.current?.sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // The source may already have been stopped by the browser.
      }
    });
    ambientRef.current = null;
  }, []);

  const stopAll = useCallback(() => {
    activeSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // The source may already have ended.
      }
    });
    activeSourcesRef.current.clear();
    stopAmbient();
  }, [stopAmbient]);

  const getGraph = useCallback(() => {
    if (graphRef.current) return graphRef.current;
    const Constructor = audioContextConstructor();
    if (!Constructor) return null;
    const context = new Constructor();
    const master = context.createGain();
    const sfx = context.createGain();
    const ambient = context.createGain();
    master.gain.value = masterVolume;
    sfx.gain.value = 0.82;
    ambient.gain.value = 0.14;
    sfx.connect(master);
    ambient.connect(master);
    master.connect(context.destination);
    graphRef.current = { context, master, sfx, ambient };
    return graphRef.current;
  }, [masterVolume]);

  const setEnabled = useCallback((value: boolean | ((current: boolean) => boolean)) => {
    const next = typeof value === "function" ? value(getSoundPreference()) : value;
    try {
      window.localStorage.setItem("veltrix-sound", next ? "on" : "off");
    } catch {
      // Preference persistence is best effort.
    }
    window.dispatchEvent(new Event(soundPreferenceEvent));
    if (!next) stopAll();
  }, [stopAll]);

  const setMasterVolume = useCallback((value: number) => {
    const next = Math.min(1, Math.max(0, value));
    setMasterVolumeState(next);
    if (graphRef.current) graphRef.current.master.gain.setTargetAtTime(next, graphRef.current.context.currentTime, 0.02);
    try {
      window.localStorage.setItem("veltrix-master-volume", String(next));
    } catch {
      // Preference persistence is best effort.
    }
  }, []);

  const play = useCallback((sound: GameSound, options: PlayOptions = {}) => {
    if (!enabled) return;
    const graph = getGraph();
    if (!graph) return;
    const render = () => renderSound(graph, activeSourcesRef.current, sound, graph.context.currentTime + Math.max(0, options.delayMs ?? 0) / 1000, Math.min(1, Math.max(0.05, options.volume ?? 0.7)));
    if (graph.context.state === "suspended") void graph.context.resume().then(render).catch(() => undefined);
    else render();
  }, [enabled, getGraph]);

  const startAmbient = useCallback((kind: AmbientKind) => {
    if (!enabled) return;
    const graph = getGraph();
    if (!graph) return;
    const start = () => {
      stopAmbient();
      if (kind === "arcade") ambientRef.current = startArcadeAmbient(graph);
    };
    if (graph.context.state === "suspended") void graph.context.resume().then(start).catch(() => undefined);
    else start();
  }, [enabled, getGraph, stopAmbient]);

  useEffect(() => {
    if (!enabled) stopAll();
  }, [enabled, stopAll]);

  useEffect(() => () => {
    stopAll();
    const context = graphRef.current?.context;
    if (context) void context.close().catch(() => undefined);
  }, [stopAll]);

  const value = useMemo(() => ({ enabled, setEnabled, masterVolume, setMasterVolume, play, startAmbient, stopAmbient, stopAll }), [enabled, masterVolume, play, setEnabled, setMasterVolume, startAmbient, stopAmbient, stopAll]);
  return <GameAudioContext.Provider value={value}>{children}</GameAudioContext.Provider>;
}

export function useGameAudio() {
  const value = useContext(GameAudioContext);
  if (!value) throw new Error("useGameAudio must be used inside GameAudioProvider");
  const { stopAll } = value;
  useEffect(() => () => stopAll(), [stopAll]);
  return value;
}

export function GameSoundToggle({ className = "" }: { className?: string }) {
  const { enabled, setEnabled } = useGameAudio();
  return <button aria-label={enabled ? "Turn sound off" : "Turn sound on"} aria-pressed={enabled} className={`focus-ring inline-flex items-center gap-2 ${className}`} onClick={() => setEnabled((current) => !current)} type="button">{enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}<span className="hidden sm:inline">Sound {enabled ? "on" : "off"}</span></button>;
}
