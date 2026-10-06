import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Anchored,
  Broker,
  Btn,
  Card,
  ControlBar,
  InsightCard,
  MsgToken,
  Node,
  Particle,
  Prediction,
  QueueChip,
  Segmented,
  Stage,
  StatPill,
  Toggle,
} from "../components/kit";
import { useFlow } from "../components/useFlow";

const SOURCE = { x: 15, y: 40 },
  HUB = { x: 48, y: 40 },
  TARGET = { x: 83, y: 40 };
export default function Lesson01FireAndForget() {
  const [mode, setMode] = useState<"direct" | "guaranteed">("direct");
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<string[]>([]);
  const [published, setPublished] = useState(0);
  const [delivered, setDelivered] = useState(0);
  const [lost, setLost] = useState(0);
  const [latest, setLatest] = useState("—");
  const { flyers, emit, remove, clear } = useFlow();
  const busy = flyers.length > 0;
  const reset = () => {
    clear();
    setQueue([]);
    setPublished(0);
    setDelivered(0);
    setLost(0);
    setLatest("—");
    setOnline(true);
  };
  const send = () => {
    const label =
      mode === "direct"
        ? `${(72.4 + published * 0.2).toFixed(1)}°C`
        : `Material consumed · ${published + 1}`;
    setPublished((p) => p + 1);
    emit({
      tone: "green",
      from: SOURCE,
      to: HUB,
      label,
      meta: { incoming: true },
      duration: 0.6,
    });
  };
  useEffect(() => {
    if (mode !== "guaranteed" || !online || busy || !queue.length) return;
    const timer = window.setTimeout(
      () =>
        emit({
          tone: "green",
          from: HUB,
          to: TARGET,
          label: queue[0],
          meta: { drain: true },
        }),
      150,
    );
    return () => window.clearTimeout(timer);
  }, [mode, online, busy, queue, emit]);
  return (
    <div className="lesson-layout">
      <div>
        <Stage
          minHeight={430}
          note={
            mode === "direct"
              ? "Direct delivery serves matching connected subscribers. This demo stores no readings for an offline dashboard."
              : "Guaranteed publications are stored for the configured durable queue. This demo assumes successful processing and acknowledgement when the consumer is online."
          }
        >
          <svg
            className="flow-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <line
              className="flow-line active"
              x1={15}
              y1={40}
              x2={48}
              y2={40}
              vectorEffect="non-scaling-stroke"
            />
            <line
              className={`flow-line ${online ? "active" : "dead"}`}
              x1={48}
              y1={40}
              x2={83}
              y2={40}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <Anchored pt={SOURCE}>
            <Node
              name={mode === "direct" ? "PLC gateway" : "MES"}
              role="Producer"
              sub={
                mode === "direct" ? "Temperature measured" : "Material consumed"
              }
              style={{ width: 145 }}
            />
          </Anchored>
          <Anchored pt={HUB}>
            <Broker active={busy} />
          </Anchored>
          {mode === "guaranteed" && (
            <Anchored pt={{ x: 48, y: 70 }}>
              <QueueChip depth={queue.length} label="Inventory Management queue" />
            </Anchored>
          )}
          <Anchored pt={TARGET}>
            <Node
              name={
                mode === "direct"
                  ? "Operator dashboard"
                  : "Inventory Management"
              }
              role="Consumer"
              sub={latest}
              value={online ? "Online" : "Offline"}
              offline={!online}
              accent="cyan"
              style={{ width: 165 }}
            />
          </Anchored>
          <AnimatePresence>
            {flyers.map((f) => (
              <Particle
                key={f.id}
                from={f.from}
                to={f.to}
                duration={0.6}
                onDone={() => {
                  remove(f.id);
                  if (f.meta?.incoming) {
                    if (mode === "guaranteed") setQueue((q) => [...q, f.label]);
                    else if (online)
                      emit({
                        tone: "green",
                        from: HUB,
                        to: TARGET,
                        label: f.label,
                      });
                    else setLost((n) => n + 1);
                  } else if (online) {
                    setLatest(f.label);
                    setDelivered((n) => n + 1);
                    if (f.meta?.drain) setQueue((q) => q.slice(1));
                  } else if (!f.meta?.drain) {
                    setLost((n) => n + 1);
                  }
                }}
              >
                <MsgToken label={f.label} />
              </Particle>
            ))}
          </AnimatePresence>
        </Stage>
        <ControlBar>
          <div className="control-row">
            <Segmented
              value={mode}
              options={[
                { value: "direct", label: "Direct: live telemetry" },
                { value: "guaranteed", label: "Guaranteed: business events" },
              ]}
              onChange={(m) => {
                reset();
                setMode(m);
              }}
            />
            <Toggle
              checked={online}
              onChange={setOnline}
              label="Consumer online"
            />
          </div>
          <div className="control-row">
            <Btn variant="primary" disabled={busy} onClick={send}>
              {mode === "direct" ? "Publish a reading" : "Consume material"}
            </Btn>
          </div>
          <div className="control-row">
            <StatPill label="Published" value={published} />
            <StatPill label="Delivered" value={delivered} tone="cyan" />
            <StatPill label="Queued" value={queue.length} tone="amber" />
            <StatPill label="Missed" value={lost} tone="red" />
          </div>
        </ControlBar>
      </div>
      <div className="rail">
        <Card title="Scenario">
          <div className="prose">
            <p>
              A dashboard needs fresh temperature readings. Inventory Management
              needs each material-consumed event from MES to deduct the consumed
              quantity from stock.
            </p>
            <p>
              This durable queue belongs to Inventory Management. Another
              independent consumer application would typically have its own queue
              and receive its own copy of matching events. Multiple instances of
              Inventory Management can share this queue and divide the work.
            </p>
            <p>
              Take the consumer offline and publish three messages. Reconnect
              it. Direct delivery resumes with new publications; Guaranteed
              delivery retains queued events and automatically delivers them in
              order when the consumer comes back online.
            </p>
            <p>
              Direct can suit replaceable live updates. Guaranteed suits work
              that must survive temporary consumer outages, provided a durable
              queue and appropriate policies are configured.
            </p>
          </div>
        </Card>
        <InsightCard
          items={[
            "Direct (fire-and-forget) delivery trades offline recovery for live delivery without durable storage.",
            "Guaranteed delivery stores messages for a durable endpoint until acknowledgement, subject to capacity and expiration policies.",
            "A queue serves a consumer application. Independent applications typically have separate queues; instances of one application can share a queue.",
            "Telemetry is not always expendable: historian, compliance, or traceability consumers may need every reading.",
            "Delivery acknowledgement is not proof of a successful business transaction. Later lessons cover processing, retries, and duplicates.",
          ]}
        />
        <Prediction
          question="Inventory Management is offline when material is consumed. Which setup supports receiving that event later?"
          choices={[
            { id: "a", text: "Direct delivery to its live subscription" },
            {
              id: "b",
              text: "Guaranteed delivery into its configured durable queue",
              correct: true,
            },
          ]}
          reveal="The durable queue stores the event during the outage. The application must then process it safely and acknowledge it; expiration and storage limits still apply."
        />
      </div>
    </div>
  );
}
