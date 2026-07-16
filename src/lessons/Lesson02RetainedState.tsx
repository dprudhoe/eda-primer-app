import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import ignitionLogo from "../assets/ignition-edge.webp";
import {
  Anchored,
  Broker,
  Btn,
  Card,
  ControlBar,
  ControlGroup,
  InsightCard,
  MsgToken,
  Node,
  Particle,
  Prediction,
  Stage,
  StatPill,
  TagCard,
  Toggle,
} from "../components/kit";
import { useFlow, Pt } from "../components/useFlow";

const PLC: Pt = { x: 16, y: 78 };
const EDGE: Pt = { x: 16, y: 30 };
const HUB: Pt = { x: 45, y: 42 };
const RETAIN: Pt = { x: 45, y: 82 };
const LIVE: Pt = { x: 83, y: 25 };
const LATE: Pt = { x: 83, y: 72 };

type State = number;
const formatPressure = (value: number) => `${value.toFixed(1)} PSI`;

export default function Lesson02RetainedState() {
  const { flyers, emit, remove } = useFlow();
  const [observed, setObserved] = useState<State>(42.0);
  const [retained, setRetained] = useState<State | null>(null);
  const [rbe, setRbe] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastSuppressed, setLastSuppressed] = useState(false);
  const [stats, setStats] = useState({ sampled: 0, published: 0, suppressed: 0 });
  const [liveValue, setLiveValue] = useState<State | null>(null);
  const [lateConnected, setLateConnected] = useState(false);
  const [lateValue, setLateValue] = useState<State | null>(null);
  const [lateEmpty, setLateEmpty] = useState(false);
  const lateConnectedRef = useRef(lateConnected);
  const retainedRef = useRef(retained);
  const lastPublishedRef = useRef<State | null>(null);
  const observedRef = useRef(observed);
  const rbeRef = useRef(rbe);
  lateConnectedRef.current = lateConnected;
  retainedRef.current = retained;
  observedRef.current = observed;
  rbeRef.current = rbe;
  const timers = useRef<number[]>([]);
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const sample = () => {
    const previous = observedRef.current;
    const state = Math.random() < 0.45 ? previous : Math.round((previous + (Math.random() > 0.5 ? 0.5 : -0.4)) * 10) / 10;
    setObserved(state);
    observedRef.current = state;
    setStats((s) => ({ ...s, sampled: s.sampled + 1 }));
    emit({ from: PLC, to: EDGE, tone: "green", label: formatPressure(state), duration: 0.5 });
    if (rbeRef.current && lastPublishedRef.current === state) {
      setLastSuppressed(true);
      setStats((s) => ({ ...s, suppressed: s.suppressed + 1 }));
      return;
    }
    setLastSuppressed(false);
    lastPublishedRef.current = state;
    setStats((s) => ({ ...s, published: s.published + 1 }));
    const tone = "green" as const;
    // PLC sample rises to Ignition; changed values continue to broker and retained slot
    later(520, () => emit({ from: EDGE, to: HUB, tone, label: formatPressure(state), duration: 0.7 }));
    later(1240, () => emit({ from: HUB, to: RETAIN, tone, label: formatPressure(state), duration: 0.6 }));
    later(1840, () => {
      setRetained(state);
      retainedRef.current = state;
    });
    // live consumer receives the transition (state applied on arrival, once)
    later(1240, () => emit({ from: HUB, to: LIVE, tone, label: formatPressure(state), duration: 1 }));
    later(2240, () => setLiveValue(state));
    if (lateConnectedRef.current) {
      later(1240, () => emit({ from: HUB, to: LATE, tone, label: formatPressure(state), duration: 1 }));
      later(2240, () => setLateValue(state));
    }
  };

  useEffect(() => {
    if (!running) return;
    const iv = window.setInterval(sample, 1150);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const connectLate = () => {
    setLateConnected(true);
    if (retained != null) {
      setLateEmpty(false);
      const tone = "green" as const;
      // hop 1: retained slot → broker (the broker replays what it holds)
      emit({ from: RETAIN, to: HUB, tone, label: `${formatPressure(retained)} · retained`, duration: 0.7 });
      // hop 2: broker → late consumer (single, deterministic)
      later(700, () => emit({ from: HUB, to: LATE, tone, label: formatPressure(retained), duration: 0.9 }));
      later(1650, () => setLateValue(retained));
    } else {
      setLateEmpty(true);
      setLateValue(null);
    }
  };

  const disconnectLate = () => {
    setLateConnected(false);
    setLateValue(null);
    setLateEmpty(false);
  };

  const clearRetained = () => {
    setRetained(null);
    retainedRef.current = null;
    lastPublishedRef.current = null;
    setLastSuppressed(false);
  };

  const reset = () => {
    setObserved(42.0);
    observedRef.current = 42.0;
    setRunning(false);
    setRetained(null);
    retainedRef.current = null;
    lastPublishedRef.current = null;
    setLastSuppressed(false);
    setLiveValue(null);
    setStats({ sampled: 0, published: 0, suppressed: 0 });
    disconnectLate();
  };

  return (
    <div className="lesson-layout">
      <div>
        <Stage
          note={
            lastSuppressed
              ? `Report by Exception suppressed the unchanged ${formatPressure(observed)} sample. The broker still retains the last published pressure.`
              : retained
              ? `The broker is holding one retained value: ${formatPressure(retained)}. Anyone connecting now receives it immediately.`
              : "No retained value is stored. A consumer connecting now would receive nothing until the next publish."
          }
          minHeight={400}
        >
          <svg className="flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line className="flow-line active" x1={PLC.x} y1={PLC.y} x2={EDGE.x} y2={EDGE.y} vectorEffect="non-scaling-stroke" />
            <line className="flow-line active" x1={EDGE.x} y1={EDGE.y} x2={HUB.x} y2={HUB.y} vectorEffect="non-scaling-stroke" />
            <line className="flow-line active" x1={HUB.x} y1={HUB.y} x2={LIVE.x} y2={LIVE.y} vectorEffect="non-scaling-stroke" />
            <line className={`flow-line ${lateConnected ? "active" : "dead"}`} x1={HUB.x} y1={HUB.y} x2={LATE.x} y2={LATE.y} vectorEffect="non-scaling-stroke" />
          </svg>

          <Anchored pt={PLC}>
            <Node icon="▤" name="Pressure PLC" role="Sensor / PLC" accent="green" value={formatPressure(observed)} sub={running ? "sampling 1/s" : "idle"} lit={running} style={{ minWidth: 126 }} />
          </Anchored>
          <Anchored pt={EDGE}>
            <Node icon={<img src={ignitionLogo} alt="Ignition Edge" style={{ width: 30, height: 22, objectFit: "contain" }} />} name="Ignition Edge" accent="green" sub={rbe ? "publishes changes" : "publishes every sample"} style={{ minWidth: 126 }} />
          </Anchored>

          <Anchored pt={HUB}>
            <Broker />
          </Anchored>

          <Anchored pt={RETAIN}>
            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "10px 14px",
                background: "rgba(0,0,0,0.3)",
                textAlign: "center",
                minWidth: 150,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-mute)" }}>
                Retained slot
              </div>
              <div style={{ marginTop: 6 }}>
                {retained != null ? <MsgToken label={formatPressure(retained)} /> : <span className="dim" style={{ fontSize: 12 }}>empty</span>}
              </div>
            </div>
          </Anchored>

          <Anchored pt={LIVE}>
            <Node
              icon="▦"
              name="Live Monitor"
              role="Always connected"
              accent="cyan"
              value={liveValue != null ? formatPressure(liveValue) : "—"}
              sub={liveValue != null ? "current live value" : "waiting…"}
              badge={{ text: "Connected", kind: "ok" }}
            />
          </Anchored>

          <Anchored pt={LATE}>
            <Node
              icon="▦"
              name="Late Dashboard"
              role="Connects late"
              accent={lateConnected ? "violet" : "slate"}
              value={lateConnected ? lateValue != null ? formatPressure(lateValue) : lateEmpty ? "—" : "…" : "—"}
              sub={!lateConnected ? "offline" : lateEmpty ? "connected — nothing retained" : lateValue ? "current state only" : "connecting…"}
              badge={lateConnected ? { text: "Connected", kind: "ok" } : { text: "Offline", kind: "off" }}
              offline={!lateConnected}
            />
          </Anchored>

          <AnimatePresence>
            {flyers.map((f) => (
              <Particle
                key={f.id}
                from={f.from}
                to={f.to}
                duration={f.duration}
                onDone={() => remove(f.id)}
              >
                <MsgToken label={f.label} tone={f.tone} />
              </Particle>
            ))}
          </AnimatePresence>
        </Stage>

        <ControlBar>
          <div className="control-row">
            <ControlGroup label="Publisher">
              <Btn variant="primary" onClick={sample}>Publish one reading</Btn>
              <Btn onClick={() => setRunning((value) => !value)}>{running ? "⏸ Stop continuous" : "▶ Start continuous"}</Btn>
              <Btn variant="danger" onClick={clearRetained} disabled={!retained}>Clear retained</Btn>
            </ControlGroup>
            <ControlGroup label="Publisher behavior">
              <Toggle checked={rbe} onChange={setRbe} label="Report by exception" />
            </ControlGroup>
            <ControlGroup label="Late consumer">
              {lateConnected ? (
                <Btn onClick={disconnectLate}>Disconnect</Btn>
              ) : (
                <Btn onClick={connectLate}>Connect late consumer</Btn>
              )}
            </ControlGroup>
            <Btn variant="ghost" sm onClick={reset}>Reset</Btn>
          </div>
          <div className="control-row">
            <StatPill label="PLC samples" value={stats.sampled} tone="cyan" />
            <StatPill label="MQTT publishes" value={stats.published} tone="green" />
            <StatPill label="Suppressed (RBE)" value={stats.suppressed} tone="amber" />
          </div>
        </ControlBar>
      </div>

      <div className="rail">
        <Prediction
          question="Pressure changes several times while a dashboard is offline. What does it receive when it connects?"
          choices={[
            { id: "a", text: "Every pressure sample, in order" },
            { id: "b", text: "The last published pressure only", correct: true },
            { id: "c", text: "Nothing until the next publish" },
          ]}
          reveal={
            <>
              <b>The last published pressure only.</b> Report by Exception avoids publishing stable
              duplicates, while retain gives the late dashboard the latest known value immediately.
            </>
          }
        />

        <Card title="Scenario">
          <div className="prose">
            <p>
              A pressure transmitter is sampled by <strong>Ignition Edge</strong>. The PLC may report
              the same pressure repeatedly, but only changed values need to cross the network.
            </p>
            <p>
              With <strong>Report by Exception</strong>, repeated samples of the same value are not
              republished. Retain still gives a late subscriber the last known change, combining
              bandwidth efficiency with immediate state recovery.
            </p>
            <p>
              The <strong>Live Monitor</strong> is always connected, so it witnesses every
              transition. The <strong>Late Dashboard</strong> connects afterwards and receives only
              the retained value.
            </p>
          </div>
        </Card>

        <InsightCard
          items={[
            "Report by Exception suppresses unchanged samples before they use network bandwidth.",
            "MQTT retain gives late subscribers the last state that was actually published.",
            <>Retained messages answer <b>“What is true now?”</b></>,
            <>They do <b>not</b> answer <b>“What happened?”</b></>,
            "State and events serve different purposes.",
          ]}
        />

        <TagCard
          title="Typical uses"
          tags={[
            "Current machine status",
            "Last known value",
            "Current alarm state",
            "OEE dashboards",
            "Equipment availability",
            "Operator displays",
          ]}
        />
      </div>
    </div>
  );
}
