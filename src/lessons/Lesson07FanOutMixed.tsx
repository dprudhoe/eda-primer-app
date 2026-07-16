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
  desc: string;
  online: boolean;
  received: number; // direct
  missed: number; // direct
  depth: number; // queue/http
  delivered: number; // queue/http
};

const PUB: Pt = { x: 13, y: 50 };
const HUB: Pt = { x: 34, y: 50 };
const EVENT = "InspectionResult";

const base = { online: true, received: 0, missed: 0, depth: 0, delivered: 0 };
const INITIAL: Lane[] = [
  { id: "ops", name: "Operations Dashboard", icon: "◎", accent: "cyan", pattern: "direct", desc: "Live notification", ...base },
  { id: "hist", name: "Historian", icon: "▥", accent: "green", pattern: "direct", desc: "Streaming copy", ...base },
  { id: "analytics", name: "Analytics Platform", icon: "▤", accent: "violet", pattern: "direct", desc: "Fan-out copy", ...base },
  { id: "ai", name: "AI Application", icon: "✦", accent: "amber", pattern: "direct", desc: "Trigger", ...base },
  { id: "qms", name: "Quality Mgmt System", icon: "✓", accent: "blue", pattern: "queue", desc: "Durable queue", ...base },
  { id: "maint", name: "Maintenance", icon: "✦", accent: "red", pattern: "queue", desc: "Durable queue", ...base },
  { id: "rest", name: "REST Endpoint", icon: "⇄", accent: "green", pattern: "http", desc: "HTTP via queue", ...base },
];

const QUEUE_TONE: Record<string, "blue" | "red" | "green"> = { qms: "blue", maint: "red", rest: "green" };

export default function Lesson07FanOutMixed() {
  const { flyers, emit, remove } = useFlow();
  const [lanes, setLanes] = useState<Lane[]>(INITIAL);
  const [pubCount, setPubCount] = useState(0);
  const lanesRef = useRef(lanes);
  lanesRef.current = lanes;

  const laneY = (i: number) => 8 + i * (84 / (INITIAL.length - 1));
  const queuePt = (i: number): Pt => ({ x: 63, y: laneY(i) });
  const cardPt = (i: number, queued: boolean): Pt => ({ x: queued ? 84 : 79, y: laneY(i) });

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
    emit({ from: PUB, to: HUB, tone: "green", label: EVENT, duration: 0.5 });
    const cur = lanesRef.current;
    window.setTimeout(() => {
      cur.forEach((l, i) => {
        if (l.pattern === "direct") {
          // direct: only live consumers receive; offline simply misses
          if (l.online) emit({ from: HUB, to: cardPt(i, false), tone: "green", label: "live", duration: 0.85 });
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
    }, 420);
  };

  const publishSequence = () => {
    for (let i = 0; i < 5; i++) window.setTimeout(publish, i * 700);
  };

  const toggleOnline = (id: string) => setLanes((ls) => ls.map((l) => (l.id === id ? { ...l, online: !l.online } : l)));

  return (
    <div className="lesson-layout">
      <div>
        <Stage
          note="One publish, seven independent deliveries — each on its own contract. Live consumers react instantly (and miss events while offline); durable queues and the queue-backed REST endpoint accumulate while their app is offline, then drain on reconnect. The publisher never changes."
          minHeight={600}
        >
          <svg className="flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line className="flow-line active" x1={PUB.x} y1={PUB.y} x2={HUB.x} y2={HUB.y} vectorEffect="non-scaling-stroke" />
            {lanes.map((l, i) => {
              const queued = l.pattern === "queue" || l.pattern === "http";
              const dead = l.pattern === "direct" && !l.online;
              if (queued) {
                const q = queuePt(i);
                const c = cardPt(i, true);
                return (
                  <g key={l.id}>
                    <line className="flow-line active" x1={HUB.x} y1={HUB.y} x2={q.x} y2={q.y} vectorEffect="non-scaling-stroke" />
                    <line className="flow-line active" x1={q.x} y1={q.y} x2={c.x} y2={c.y} vectorEffect="non-scaling-stroke" />
                  </g>
                );
              }
              const c = cardPt(i, false);
              return <line key={l.id} className={`flow-line ${dead ? "dead" : "active"}`} x1={HUB.x} y1={HUB.y} x2={c.x} y2={c.y} vectorEffect="non-scaling-stroke" />;
            })}
          </svg>

          <Anchored pt={PUB}>
            <Node icon="◈" name="Vision Inspection" role="Publisher" accent="green" sub="one event" />
          </Anchored>
          <Anchored pt={HUB}>
            <Broker active={pubCount > 0} />
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
                <Anchored pt={cardPt(i, queued)}>
                  <div className={`node accent-${l.accent}`} style={{ minWidth: 176, padding: "8px 10px", opacity: !l.online ? 0.55 : 1, flexDirection: "row", alignItems: "center", gap: 9 }}>
                    <div className="node-icon" style={{ width: 28, height: 28, fontSize: 14 }}>{l.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="node-name" style={{ fontSize: 12 }}>{l.name}</div>
                      <div className="node-role" style={{ marginTop: 0 }}>{metric}</div>
                    </div>
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
            <ControlGroup label="Publish">
              <Btn variant="primary" onClick={publish}>Publish {EVENT}</Btn>
              <Btn onClick={publishSequence}>Publish sequence (5)</Btn>
              <span className="dim" style={{ fontSize: 12 }}>published {pubCount}</span>
            </ControlGroup>
          </div>
          <div className="control-row" style={{ gap: 8 }}>
            <ControlGroup label="Take consumer apps online / offline">
              {lanes.map((l) => (
                <Btn key={l.id} sm variant={l.online ? "default" : "ghost"} onClick={() => toggleOnline(l.id)}>
                  {l.online ? "🟢" : "⚪"} {l.name}
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
              A single <strong>InspectionResult</strong> event feeds seven consumers. Four take it
              <strong> live</strong> (dashboard, historian, analytics, AI trigger), two through
              <strong> durable queues</strong> (QMS, maintenance), and one via a queue-backed
              <strong> REST</strong> endpoint.
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
