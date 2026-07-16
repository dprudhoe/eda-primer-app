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
} from "../components/kit";
import { useFlow, Pt } from "../components/useFlow";

const EDGE: Pt = { x: 31, y: 36 };
const PLC: Pt = { x: 31, y: 80 };
const HUB: Pt = { x: 59, y: 36 };
const DASH: Pt = { x: 86, y: 36 };

function drift(prev: number) {
  const d = (Math.random() - 0.5) * 1.8;
  return Math.round(Math.min(96, Math.max(58, prev + d)) * 10) / 10;
}

export default function Lesson01FireAndForget() {
  const { flyers, emit, remove } = useFlow();
  const [connected, setConnected] = useState(true);
  const [running, setRunning] = useState(false);
  const [temp, setTemp] = useState(72.4);
  const [dashValue, setDashValue] = useState<number | null>(72.4);
  const [stats, setStats] = useState({ published: 0, delivered: 0, lost: 0 });

  const tempRef = useRef(temp);
  const connectedRef = useRef(connected);
  tempRef.current = temp;
  connectedRef.current = connected;
  const timers = useRef<number[]>([]);
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const sample = () => {
    const t = drift(tempRef.current);
    tempRef.current = t;
    setTemp(t);
    // the raw reading always rises from the PLC into the Ignition Edge gateway
    emit({ from: PLC, to: EDGE, tone: "green", label: `${t.toFixed(1)}°C`, duration: 0.5 });

    const isConnected = connectedRef.current;
    setStats((s) => ({
      ...s,
      published: s.published + 1,
      delivered: s.delivered + (isConnected ? 1 : 0),
      lost: s.lost + (isConnected ? 0 : 1),
    }));
    later(330, () =>
      emit({
        from: EDGE,
        to: isConnected ? DASH : HUB,
        tone: isConnected ? "green" : "red",
        label: `${t.toFixed(1)}°C`,
        duration: isConnected ? 1.0 : 0.6,
        dropAtEnd: !isConnected,
        meta: { value: t, delivered: isConnected },
      }),
    );
  };

  useEffect(() => {
    if (!running) return;
    const iv = window.setInterval(sample, 1150);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const note = !connected
    ? "The dashboard is disconnected. Ignition keeps publishing, but the broker has no one to deliver to — those readings are simply dropped."
    : "Every fresh reading flows PLC → Ignition → broker → dashboard. If the dashboard is absent, nothing is stored for later.";

  return (
    <div className="lesson-layout">
      <div>
        <Stage note={note} minHeight={380}>
          <svg className="flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line className="flow-line active" x1={PLC.x} y1={PLC.y} x2={EDGE.x} y2={EDGE.y} vectorEffect="non-scaling-stroke" />
            <line className="flow-line active" x1={EDGE.x} y1={EDGE.y} x2={HUB.x} y2={HUB.y} vectorEffect="non-scaling-stroke" />
            <line className={`flow-line ${connected ? "active" : "dead"}`} x1={HUB.x} y1={HUB.y} x2={DASH.x} y2={DASH.y} vectorEffect="non-scaling-stroke" />
          </svg>

          <Anchored pt={PLC}>
            <Node
              icon="▤"
              name="Line 1 PLC"
              role="Sensor / PLC"
              accent="green"
              value={`${temp.toFixed(1)}°C`}
              sub={running ? "sampling 1/s" : "idle"}
              lit={running}
              style={{ minWidth: 120 }}
            />
          </Anchored>

          <Anchored pt={EDGE}>
            <Node
              icon={<img src={ignitionLogo} alt="Ignition Edge" style={{ width: 30, height: 22, objectFit: "contain" }} />}
              name="Ignition Edge"
              accent="green"
              sub={!running ? "idle" : "publishing every reading"}
              lit={running}
              style={{ minWidth: 120 }}
            />
          </Anchored>

          <Anchored pt={HUB}>
            <Broker active={running} />
          </Anchored>

          <Anchored pt={DASH}>
            <Node
              icon="▦"
              name="Operator Dashboard"
              role="Consumer"
              accent={connected ? "cyan" : "slate"}
              value={connected ? (dashValue != null ? `${dashValue.toFixed(1)}°C` : "—") : "—"}
              sub={connected ? "live" : "no data while offline"}
              badge={connected ? { text: "Connected", kind: "ok" } : { text: "Disconnected", kind: "off" }}
              offline={!connected}
              style={{ minWidth: 128 }}
            />
          </Anchored>

          <AnimatePresence>
            {flyers.map((f) => (
              <Particle
                key={f.id}
                from={f.from}
                to={f.to}
                duration={f.duration}
                onDone={() => {
                  if (!f.dropAtEnd && (f.meta as any)?.delivered) setDashValue((f.meta as any).value as number);
                  remove(f.id);
                }}
              >
                <MsgToken label={f.label} tone={f.tone} dim={f.dropAtEnd} />
              </Particle>
            ))}
          </AnimatePresence>
        </Stage>

        <ControlBar>
          <div className="control-row">
            <ControlGroup label="Publisher">
              <Btn variant="primary" onClick={sample}>Publish one reading</Btn>
              <Btn onClick={() => setRunning((r) => !r)}>{running ? "⏸ Stop continuous" : "▶ Start continuous"}</Btn>
            </ControlGroup>
            <ControlGroup label="Consumer">
              {connected ? (
                <Btn variant="danger" onClick={() => setConnected(false)}>Disconnect dashboard</Btn>
              ) : (
                <Btn onClick={() => setConnected(true)}>Reconnect dashboard</Btn>
              )}
            </ControlGroup>
          </div>
          <div className="control-row">
            <StatPill label="Published" value={stats.published} tone="green" />
            <StatPill label="Delivered" value={stats.delivered} tone="cyan" />
            <StatPill label="Lost" value={stats.lost} tone="red" />
            <Btn variant="ghost" sm onClick={() => setStats({ published: 0, delivered: 0, lost: 0 })}>Reset counters</Btn>
          </div>
        </ControlBar>
      </div>

      <div className="rail">
        <Prediction
          question="The dashboard disconnects for 10 seconds while Ignition keeps publishing. When it reconnects, what does it see?"
          choices={[
            { id: "a", text: "All 10 missed readings, replayed in order" },
            { id: "b", text: "The current live reading — the missed ones are gone", correct: true },
            { id: "c", text: "An error, because messages were lost" },
          ]}
          reveal={
            <>
              <b>The current live reading.</b> Best-effort (fire-and-forget) messages are not stored
              for an absent consumer. Disconnect, watch readings drop, then reconnect — the dashboard
              simply resumes with fresh values.
            </>
          }
        />

        <Card title="Scenario">
          <div className="prose">
            <p>
              A <strong>Line 1 PLC</strong> is sampled once per second by an{" "}
              <strong>Ignition Edge</strong> gateway, which publishes to the broker. An{" "}
              <strong>operator dashboard</strong> subscribes and shows the live value.
            </p>
            <p>
              Delivery is <strong>best-effort</strong>: the broker keeps nothing for a consumer that
              isn't connected. That tradeoff is appropriate here because another fresh reading will
              arrive shortly.
            </p>
          </div>
        </Card>

        <InsightCard
          items={[
            "Messages are not stored for an unavailable consumer.",
            "Occasional loss is acceptable when another update arrives shortly.",
            "For telemetry, freshness often matters more than perfect delivery.",
          ]}
        />

        <TagCard
          title="Typical uses"
          tags={["Sensor telemetry", "PLC values", "Heartbeats", "Vibration", "Temperature", "Fast-changing process values"]}
        />
      </div>
    </div>
  );
}
