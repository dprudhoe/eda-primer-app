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
  QueueChip,
  Stage,
  Accent,
} from "../components/kit";
import { useFlow, Pt } from "../components/useFlow";

type Pattern = "direct" | "queue" | "http";
type Lane = {
  id: string;
  name: string;
  icon: string;
  accent: Accent;
  pattern: Pattern;
  protocol: "MQTT" | "AMQP" | "REST" | "SMF";
  desc: string;
  online: boolean;
  received: number; // direct
  missed: number; // direct
  depth: number; // queue/http
  delivered: number; // queue/http
};

const CAMERA: Pt = { x: 8, y: 50 };
const AI_QUEUE: Pt = { x: 21, y: 50 };
const AI: Pt = { x: 34, y: 50 };
const HUB: Pt = { x: 56, y: 50 };
const EVENT = "InspectionResult";

const base = { online: true, received: 0, missed: 0, depth: 0, delivered: 0 };
const INITIAL: Lane[] = [
  { id: "ops", name: "Operations Dashboard", icon: "◎", accent: "cyan", pattern: "direct", protocol: "MQTT", desc: "Live notification", ...base },
  { id: "hist", name: "Historian", icon: "▥", accent: "green", pattern: "queue", protocol: "SMF", desc: "Durable ingestion", ...base },
  { id: "analytics", name: "Analytics Platform", icon: "▤", accent: "violet", pattern: "queue", protocol: "AMQP", desc: "Durable analytics", ...base },
  { id: "qms", name: "Quality Mgmt System", icon: "✓", accent: "blue", pattern: "queue", protocol: "AMQP", desc: "Durable queue", ...base },
  { id: "hmi", name: "Line HMI", icon: "▦", accent: "amber", pattern: "direct", protocol: "MQTT", desc: "Live notification", ...base },
  { id: "rest", name: "REST Endpoint", icon: "⇄", accent: "green", pattern: "http", protocol: "REST", desc: "HTTP via queue", ...base },
];

const QUEUE_TONE: Record<string, "blue" | "red" | "green" | "violet"> = { hist: "green", analytics: "violet", qms: "blue", rest: "green" };

export default function Lesson07FanOutMixed() {
  const { flyers, emit, remove } = useFlow();
  const [lanes, setLanes] = useState<Lane[]>(INITIAL);
  const [pubCount, setPubCount] = useState(0);
  const [aiDepth, setAiDepth] = useState(0);
  const lanesRef = useRef(lanes);
  lanesRef.current = lanes;

  const laneY = (i: number) => 8 + i * (84 / (INITIAL.length - 1));
  const queuePt = (i: number): Pt => ({ x: 64, y: laneY(i) });
  const cardPt = (i: number): Pt => ({ x: 84, y: laneY(i) });

  // drain durable queues (queue + http) whenever their app is online
  useEffect(() => {
    const iv = window.setInterval(() => {
      setLanes((ls) =>
        ls.map((l) =>
          (l.pattern === "queue" || l.pattern === "http") && l.online && l.depth > 0
            ? { ...l, depth: l.depth - 1, delivered: l.delivered + 1 }
            : l,
        ),
      );
    }, 1200);
    return () => window.clearInterval(iv);
  }, []);

  const publish = () => {
    setPubCount((c) => c + 1);
    setAiDepth((depth) => depth + 1);
    emit({ from: CAMERA, to: AI_QUEUE, tone: "green", label: "camera frame", duration: 0.55 });
    window.setTimeout(() => {
      setAiDepth((depth) => Math.max(0, depth - 1));
      emit({ from: AI_QUEUE, to: AI, tone: "green", label: "dequeued", duration: 0.45 });
    }, 560);
    window.setTimeout(() => emit({ from: AI, to: HUB, tone: "violet", label: EVENT, duration: 0.55 }), 1020);
    const cur = lanesRef.current;
    window.setTimeout(() => {
      cur.forEach((l, i) => {
        if (l.pattern === "direct") {
          // direct: only live consumers receive; offline simply misses
          if (l.online) emit({ from: HUB, to: cardPt(i), tone: "green", label: "live", duration: 0.85 });
        } else {
          // durable queue / HTTP: the event lands in the queue that fronts the consumer
          emit({ from: HUB, to: queuePt(i), tone: l.online ? "green" : "amber", label: l.online ? "queued" : "buffered", duration: 0.85 });
        }
      });
      setLanes((ls) =>
        ls.map((l) => {
          if (l.pattern === "direct") return l.online ? { ...l, received: l.received + 1 } : { ...l, missed: l.missed + 1 };
          return { ...l, depth: l.depth + 1 };
        }),
      );
    }, 1590);
  };

  const publishSequence = () => {
    for (let i = 0; i < 5; i++) window.setTimeout(publish, i * 700);
  };

  const toggleOnline = (id: string) => setLanes((ls) => ls.map((l) => (l.id === id ? { ...l, online: !l.online } : l)));

  return (
    <div className="lesson-layout">
      <div>
        <Stage
          note="A camera frame enters the AI inference queue. The AI trigger inspects it, publishes one InspectionResult, and the broker fans that result out using the delivery contract each downstream consumer needs."
          minHeight={600}
        >
          <svg className="flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line className="flow-line active" x1={CAMERA.x} y1={CAMERA.y} x2={AI_QUEUE.x} y2={AI_QUEUE.y} vectorEffect="non-scaling-stroke" />
            <line className="flow-line active" x1={AI_QUEUE.x} y1={AI_QUEUE.y} x2={AI.x} y2={AI.y} vectorEffect="non-scaling-stroke" />
            <line className="flow-line active" x1={AI.x} y1={AI.y} x2={HUB.x} y2={HUB.y} vectorEffect="non-scaling-stroke" />
            {lanes.map((l, i) => {
              const queued = l.pattern === "queue" || l.pattern === "http";
              const dead = l.pattern === "direct" && !l.online;
              if (queued) {
                const q = queuePt(i);
                const c = cardPt(i);
                return (
                  <g key={l.id}>
                    <line className="flow-line active" x1={HUB.x} y1={HUB.y} x2={q.x} y2={q.y} vectorEffect="non-scaling-stroke" />
                    <line className="flow-line active" x1={q.x} y1={q.y} x2={c.x} y2={c.y} vectorEffect="non-scaling-stroke" />
                  </g>
                );
              }
              const c = cardPt(i);
              return <line key={l.id} className={`flow-line ${dead ? "dead" : "active"}`} x1={HUB.x} y1={HUB.y} x2={c.x} y2={c.y} vectorEffect="non-scaling-stroke" />;
            })}
          </svg>

          <Anchored pt={CAMERA}>
            <Node icon="◉" name="Camera" role="Inspection feed" accent="cyan" style={{ width: 76, minWidth: 76, padding: "7px" }} />
          </Anchored>
          <Anchored pt={AI_QUEUE}>
            <QueueChip depth={aiDepth} label="AI Q" cap={3} tone="violet" />
          </Anchored>
          <Anchored pt={AI}>
            <Node icon="✦" name="AI" role="Publishes result" accent="violet" style={{ width: 76, minWidth: 76, padding: "7px" }} />
          </Anchored>
          <Anchored pt={HUB}>
            <Broker small active={pubCount > 0} />
          </Anchored>

          {lanes.map((l, i) => {
            const queued = l.pattern === "queue" || l.pattern === "http";
            const metric = queued
              ? `delivered ${l.delivered}`
              : l.online ? `received ${l.received}` : `missed ${l.missed}`;
            return (
              <div key={l.id}>
                {queued ? (
                  <Anchored pt={queuePt(i)}>
                    <QueueChip depth={l.depth} label="" cap={4} tone={QUEUE_TONE[l.id]} />
                  </Anchored>
                ) : null}
                <Anchored pt={cardPt(i)}>
                  <div className={`node accent-${l.accent}`} style={{ width: 164, minWidth: 164, padding: "8px 9px", opacity: !l.online ? 0.55 : 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <div className="node-icon" style={{ width: 28, height: 28, fontSize: 14 }}>{l.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="node-name" style={{ fontSize: 12 }}>{l.name}</div>
                      <div className="node-role" style={{ marginTop: 0 }}>{metric}</div>
                    </div>
                    <span className="queue-sub" style={{ fontSize: 8.5 }}>{l.protocol}</span>
                    {!l.online ? <span className="node-badge badge-off" style={{ alignSelf: "center", margin: 0 }}>Offline</span> : null}
                  </div>
                </Anchored>
              </div>
            );
          })}

          <AnimatePresence>
            {flyers.map((f) => (
              <Particle key={f.id} from={f.from} to={f.to} duration={f.duration} onDone={() => remove(f.id)}>
                <MsgToken label={f.label} tone={f.tone} />
              </Particle>
            ))}
          </AnimatePresence>
        </Stage>

        <ControlBar>
          <div className="control-row">
            <ControlGroup label="Run inspection workflow">
              <Btn variant="primary" onClick={publish}>Feed one camera frame</Btn>
              <Btn onClick={publishSequence}>Feed sequence (5)</Btn>
              <span className="dim" style={{ fontSize: 12 }}>results published {pubCount}</span>
            </ControlGroup>
          </div>
          <div className="control-row" style={{ gap: 8 }}>
            <ControlGroup label="Take consumer apps online / offline">
              {lanes.map((l) => (
                <Btn key={l.id} sm className={`status-btn ${l.online ? "online" : "offline"}`} onClick={() => toggleOnline(l.id)}>
                  {l.online ? "ON" : "OFF"} · {l.name}
                </Btn>
              ))}
            </ControlGroup>
          </div>
        </ControlBar>
      </div>

      <div className="rail">
        <Prediction
          question="An InspectionResult event is published once. How many consumers can receive it — and must they all use the same delivery method?"
          choices={[
            { id: "a", text: "One consumer, one method" },
            { id: "b", text: "Many consumers, each on the delivery contract it needs", correct: true },
          ]}
          reveal={
            <>
              <b>Many consumers, each on its own contract.</b> Fan-out means publish once, consume
              many times — and each consumer can demand a different guarantee: live for a dashboard,
              a durable queue for QMS, a queue-backed HTTP push for a REST API. The publisher is
              unaware of any of it.
            </>
          }
        />

        <Card title="Scenario">
          <div className="prose">
            <p>
              A camera frame is queued for AI inspection. The AI application publishes an
              <strong> InspectionResult</strong>, which feeds six downstream consumers. The operations
              dashboard and line HMI take it <strong>live</strong>; historian, analytics, and QMS use
              <strong> durable queues</strong>; REST is queue-backed. MQTT, AMQP, REST, and SMF coexist.
            </p>
          </div>
        </Card>

        <Card title="Try this">
          <div className="prose" style={{ fontSize: 13 }}>
            <p><b style={{ color: "var(--green-bright)" }}>Take the QMS app offline</b> and publish — its queue depth grows while live consumers keep reacting; bring it back and it drains.</p>
            <p><b style={{ color: "var(--green-bright)" }}>Take a direct consumer offline</b> — it simply misses events, no buffering. The others are unaffected.</p>
            <p><b style={{ color: "var(--green-bright)" }}>The REST endpoint is backed by a queue</b>, so it buffers offline and flushes on reconnect — unlike a plain direct consumer.</p>
          </div>
        </Card>

        <InsightCard
          items={[
            "Publish once, consume many times — consumers stay independent.",
            "New use cases can be added without changing the source system.",
            "Different consumers require different guarantees.",
            "Direct messaging, durable queues, and queue-backed HTTP can coexist for one event.",
            "The publisher stays independent of each consumer's delivery needs.",
          ]}
        />
      </div>
    </div>
  );
}
