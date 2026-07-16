import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
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

const MACHINE: Pt = { x: 12, y: 50 };
const HUB: Pt = { x: 45, y: 42 };
const RETAIN: Pt = { x: 45, y: 82 };
const LIVE: Pt = { x: 83, y: 25 };
const LATE: Pt = { x: 83, y: 72 };

type State = "RUNNING" | "STOPPED";

export default function Lesson02RetainedState() {
  const { flyers, emit, remove } = useFlow();
  const [observed, setObserved] = useState<State | null>(null);
  const [retained, setRetained] = useState<State | null>(null);
  const [rbe, setRbe] = useState(true);
  const [lastSuppressed, setLastSuppressed] = useState(false);
  const [stats, setStats] = useState({ sampled: 0, published: 0, suppressed: 0 });
  const [liveHistory, setLiveHistory] = useState<State[]>([]);
  const [lateConnected, setLateConnected] = useState(false);
  const [lateValue, setLateValue] = useState<State | null>(null);
  const [lateEmpty, setLateEmpty] = useState(false);
  const lateConnectedRef = useRef(lateConnected);
  const retainedRef = useRef(retained);
  lateConnectedRef.current = lateConnected;
  retainedRef.current = retained;
  const timers = useRef<number[]>([]);
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const publish = (state: State) => {
    setObserved(state);
    setStats((s) => ({ ...s, sampled: s.sampled + 1 }));
    if (rbe && retainedRef.current === state) {
      setLastSuppressed(true);
      setStats((s) => ({ ...s, suppressed: s.suppressed + 1 }));
      return;
    }
    setLastSuppressed(false);
    setRetained(state);
    retainedRef.current = state;
    setStats((s) => ({ ...s, published: s.published + 1 }));
    const tone = state === "RUNNING" ? "green" : "amber";
    // producer → broker, then broker stores it down into the retained slot
    emit({ from: MACHINE, to: HUB, tone, label: state, duration: 0.7 });
    later(720, () => emit({ from: HUB, to: RETAIN, tone, label: state, duration: 0.6 }));
    // live consumer receives the transition (state applied on arrival, once)
    later(720, () => emit({ from: HUB, to: LIVE, tone, label: state, duration: 1 }));
    later(1720, () => setLiveHistory((h) => [...h, state]));
    if (lateConnectedRef.current) {
      later(720, () => emit({ from: HUB, to: LATE, tone, label: state, duration: 1 }));
      later(1720, () => setLateValue(state));
    }
  };

  const connectLate = () => {
    setLateConnected(true);
    if (retained) {
      setLateEmpty(false);
      const tone = retained === "RUNNING" ? "green" : "amber";
      // hop 1: retained slot → broker (the broker replays what it holds)
      emit({ from: RETAIN, to: HUB, tone, label: `${retained} · retained`, duration: 0.7 });
      // hop 2: broker → late consumer (single, deterministic)
      later(700, () => emit({ from: HUB, to: LATE, tone, label: retained, duration: 0.9 }));
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
    setLastSuppressed(false);
  };

  const reset = () => {
    setObserved(null);
    setRetained(null);
    retainedRef.current = null;
    setLastSuppressed(false);
    setLiveHistory([]);
    setStats({ sampled: 0, published: 0, suppressed: 0 });
    disconnectLate();
  };

  const stateTone = (s: State) => (s === "RUNNING" ? "green" : "amber");

  return (
    <div className="lesson-layout">
      <div>
        <Stage
          note={
            lastSuppressed && observed !== null
              ? `Report by Exception is on. Repeating ${observed} is sampled by the PLC but suppressed; the broker continues holding the last published state.`
              : retained
              ? `The broker is holding one retained value: ${retained}. Anyone connecting now receives exactly that — and nothing about how it got there.`
              : "No retained value is stored. A consumer connecting now would receive nothing until the next publish."
          }
          minHeight={400}
        >
          <svg className="flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line className="flow-line active" x1={MACHINE.x} y1={MACHINE.y} x2={HUB.x} y2={HUB.y} vectorEffect="non-scaling-stroke" />
            <line className="flow-line active" x1={HUB.x} y1={HUB.y} x2={LIVE.x} y2={LIVE.y} vectorEffect="non-scaling-stroke" />
            <line className={`flow-line ${lateConnected ? "active" : "dead"}`} x1={HUB.x} y1={HUB.y} x2={LATE.x} y2={LATE.y} vectorEffect="non-scaling-stroke" />
          </svg>

          <Anchored pt={MACHINE}>
            <Node icon="⚙" name="Filler #3 PLC" role="State publisher" accent="green" value={observed ?? "—"} sub={rbe ? "reports changes only" : "reports every sample"} />
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
                {retained ? <MsgToken label={retained} tone={stateTone(retained)} /> : <span className="dim" style={{ fontSize: 12 }}>empty</span>}
              </div>
            </div>
          </Anchored>

          <Anchored pt={LIVE}>
            <Node icon="◎" name="Live Monitor" role="Always connected" accent="cyan" badge={{ text: "Sees every change", kind: "ok" }}>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                {liveHistory.length === 0 ? (
                  <span className="dim" style={{ fontSize: 11 }}>waiting…</span>
                ) : (
                  liveHistory.map((h, i) => (
                    <span key={i} className="mono" style={{ fontSize: 10, color: h === "RUNNING" ? "var(--green-bright)" : "var(--amber)" }}>
                      {h}
                    </span>
                  ))
                )}
              </div>
            </Node>
          </Anchored>

          <Anchored pt={LATE}>
            <Node
              icon="▦"
              name="Late Dashboard"
              role="Connects late"
              accent={lateConnected ? "violet" : "slate"}
              value={lateConnected ? lateValue ?? (lateEmpty ? "—" : "…") : "—"}
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
              <Btn variant="primary" onClick={() => publish("RUNNING")}>Sample RUNNING</Btn>
              <Btn onClick={() => publish("STOPPED")}>Sample STOPPED</Btn>
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
          question="You publish RUNNING, then STOPPED. A dashboard connects afterwards. What does it receive?"
          choices={[
            { id: "a", text: "Both RUNNING and STOPPED, in order" },
            { id: "b", text: "STOPPED only — the current retained state", correct: true },
            { id: "c", text: "Nothing until the next publish" },
          ]}
          reveal={
            <>
              <b>STOPPED only.</b> The retained value answers “what is true now?” The late dashboard
              never sees that a RUNNING→STOPPED transition occurred — that history lived in the{" "}
              <em>events</em>, which it wasn't around to receive.
            </>
          }
        />

        <Card title="Scenario">
          <div className="prose">
            <p>
              A machine publishes state <strong>RUNNING</strong>, then later <strong>STOPPED</strong>.
              The broker <strong>retains</strong> only the latest value for that topic.
            </p>
            <p>
              With <strong>Report by Exception</strong>, repeated samples of the same state are not
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
