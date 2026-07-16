import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Broker, Btn, Card, ControlBar, ControlGroup, InsightCard, Node } from "../components/kit";
import { anySubMatches } from "../components/topics";

type QMsg = { id: number; topic: string };
type Consumer = "none" | "running" | "paused";
type Queue = {
  id: number;
  name: string;
  subs: string[];
  msgs: QMsg[];
  consumer: Consumer;
  flash?: boolean;
};

const EXAMPLE_EVENTS = [
  "factory/line1/alarm",
  "factory/line2/alarm",
  "factory/line1/temperature",
  "factory/line1/quality/failed",
  "factory/line2/quality/passed",
  "factory/line1/production/started",
];

const SAMPLE_SEQUENCE = [
  "factory/line1/alarm",
  "factory/line1/temperature",
  "factory/line2/alarm",
  "factory/line1/quality/failed",
  "factory/line2/quality/passed",
  "factory/line1/production/started",
];

let qid = 1;
let mid = 1;

function guidedQueues(): Queue[] {
  return [
    { id: qid++, name: "Alarm Queue", subs: ["factory/*/alarm"], msgs: [], consumer: "none" },
    { id: qid++, name: "Line 1 Queue", subs: ["factory/line1/>"], msgs: [], consumer: "none" },
    { id: qid++, name: "Quality Queue", subs: ["factory/*/quality/>"], msgs: [], consumer: "none" },
  ];
}

export default function Lesson04Queues() {
  const [queues, setQueues] = useState<Queue[]>(() => guidedQueues());
  const [lastEvent, setLastEvent] = useState<{ topic: string; matched: string[] } | null>(null);
  const [customTopic, setCustomTopic] = useState("factory/line1/alarm");
  const queuesRef = useRef(queues);
  queuesRef.current = queues;

  // consumer processing loop: each running queue dequeues its front message
  useEffect(() => {
    const iv = window.setInterval(() => {
      setQueues((cur) =>
        cur.map((q) =>
          q.consumer === "running" && q.msgs.length > 0 ? { ...q, msgs: q.msgs.slice(1) } : q,
        ),
      );
    }, 1400);
    return () => window.clearInterval(iv);
  }, []);

  const flashQueues = (ids: number[]) => {
    setQueues((cur) => cur.map((q) => (ids.includes(q.id) ? { ...q, flash: true } : q)));
    window.setTimeout(() => {
      setQueues((cur) => cur.map((q) => (ids.includes(q.id) ? { ...q, flash: false } : q)));
    }, 600);
  };

  const publish = (topic: string) => {
    // compute matches from the ref (no side effects inside the setState updater)
    const matched = queuesRef.current.filter((q) => anySubMatches(q.subs, topic));
    const matchedIds = matched.map((q) => q.id);
    const matchedNames = matched.map((q) => q.name);
    setQueues((cur) =>
      cur.map((q) => (matchedIds.includes(q.id) ? { ...q, msgs: [...q.msgs, { id: mid++, topic }] } : q)),
    );
    setLastEvent({ topic, matched: matchedNames });
    if (matchedIds.length) flashQueues(matchedIds);
  };

  const publishSequence = () => {
    SAMPLE_SEQUENCE.forEach((topic, i) => window.setTimeout(() => publish(topic), i * 650));
  };

  const setConsumer = (id: number, consumer: Consumer) =>
    setQueues((cur) => cur.map((q) => (q.id === id ? { ...q, consumer } : q)));

  const resetAll = () =>
    setQueues((cur) => cur.map((q) => ({ ...q, msgs: [], consumer: "none" })));

  return (
    <div className="lesson-layout lesson4-layout">
      <div>
        <div className="stage-card">
          {/* publishers introduce the event; the broker fans it into matching queues below */}
          <div className="stage" style={{ minHeight: 118, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "18px 24px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Node icon="▣" name="Publishers" role="Publish to topics" accent="green" sub="lines 1 & 2" />
              <div style={{ fontSize: 20, lineHeight: 1, color: "var(--text-mute)" }}>↓</div>
              <Broker active={!!lastEvent} />
            </div>
            <div style={{ height: 34, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              {lastEvent ? (
                <div className="row" style={{ gap: 8, justifyContent: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-mute)" }}>Last event</span>
                  <span className="mono" style={{ fontSize: 12.5, color: "var(--green-bright)" }}>{lastEvent.topic}</span>
                  <span style={{ fontSize: 11.5, color: lastEvent.matched.length ? "var(--text-dim)" : "var(--amber)" }}>
                    {lastEvent.matched.length ? `→ matched ${lastEvent.matched.join(", ")}` : "→ no queue attracted this event"}
                  </span>
                </div>
              ) : (
                <div className="dim" style={{ fontSize: 12 }}>
                  Publish an event — the broker compares its topic against every queue's subscriptions.
                </div>
              )}
            </div>
          </div>

          {/* stacked queues — fixed height, internal scroll (no layout jump) */}
          <div className="stage" style={{ borderTop: "1px solid var(--line-soft)", padding: "16px 8px" }}>
            <div className="queue-fanout">
              <svg className="queue-fan-lines" viewBox="0 0 1000 360" preserveAspectRatio="none" aria-hidden="true">
                <path className={queues[0]?.flash ? "active" : ""} d="M 500 0 L 165 72" />
                <path className={queues[1]?.flash ? "active" : ""} d="M 500 0 L 500 72" />
                <path className={queues[2]?.flash ? "active" : ""} d="M 500 0 L 835 72" />
              </svg>
              <div className="queue-fan-targets">
                {queues.map((q) => (
                  <QueueRow key={q.id} q={q} onConsumer={(c) => setConsumer(q.id, c)} />
                ))}
              </div>
            </div>
          </div>

          <div className="stage-note">
            <span className="dot" />
            Publishers send to <span className="mono" style={{ margin: "0 4px" }}>topics</span>; each queue attracts matching events through its subscriptions and holds them until a consumer is ready.
          </div>
        </div>

        <ControlBar>
          <div className="control-row">
            <ControlGroup label="Example events — click to publish">
              <div className="example-grid">
                {EXAMPLE_EVENTS.map((t) => (
                  <Btn key={t} className="block" onClick={() => publish(t)}>
                    {t}
                  </Btn>
                ))}
              </div>
            </ControlGroup>
          </div>
          <div className="control-row">
            <ControlGroup label="Sequences">
              <Btn variant="primary" onClick={publishSequence}>
                ▶ Publish sample sequence
              </Btn>
              <Btn variant="ghost" sm onClick={resetAll}>
                Reset queues
              </Btn>
            </ControlGroup>
          </div>
          <div className="control-row">
            <ControlGroup label="Custom event">
              <input className="text-input" value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} style={{ minWidth: 240 }} />
              <Btn onClick={() => publish(customTopic)}>Publish</Btn>
            </ControlGroup>
          </div>
        </ControlBar>
      </div>

      <div className="rail">
        <Card title="Try this (guided)">
          <div className="prose" style={{ fontSize: 13.5 }}>
            <p><b style={{ color: "var(--green-bright)" }}>1.</b> Publish the sample sequence and watch each queue attract only what its subscription matches.</p>
            <p><b style={{ color: "var(--green-bright)" }}>2.</b> Notice <code>factory/line1/quality/failed</code> lands in <em>both</em> Line 1 Queue and Quality Queue.</p>
            <p><b style={{ color: "var(--green-bright)" }}>3.</b> Attach a consumer to drain a queue; pause it and keep publishing to watch its depth grow.</p>
          </div>
        </Card>

        <Card title="Wildcards">
          <div className="prose" style={{ fontSize: 13 }}>
            <p><code>*</code> matches exactly one level — <code>factory/*/alarm</code>.</p>
            <p><code>&gt;</code> matches one or more trailing levels — <code>factory/line1/&gt;</code>.</p>
          </div>
        </Card>

        <InsightCard
          items={[
            "A durable queue is a broker-managed object that attracts matching events through subscriptions and holds them until a consumer acknowledges them.",
            "Publishers publish to topics, not directly to queues.",
            "Subscriptions define which messages a queue attracts.",
            "A queue can hold multiple subscriptions; multiple queues can attract the same event.",
            "Each queue keeps its own independent copy.",
            "Queues buffer messages until their consumers are ready.",
            "Publishers never need to know which queues or consumers exist.",
          ]}
        />
      </div>
    </div>
  );
}

function QueueRow({ q, onConsumer }: { q: Queue; onConsumer: (c: Consumer) => void }) {
  return (
    <div className={`queue-row ${q.flash ? "flash" : ""}`}>
      <div className="qr-queue">
        <div className="qr-info">
          <div className="queue-head">
            <span className="queue-name">{q.name}</span>
          </div>
          <div className="queue-subs">
            {q.subs.map((s) => (
              <span key={s} className="queue-sub">{s}</span>
            ))}
          </div>
        </div>

        <div className="qr-msgs">
          <AnimatePresence initial={false}>
            {q.msgs.length === 0 ? (
              <div className="queue-empty" key="empty">empty</div>
            ) : (
              q.msgs.map((m) => (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 36, scale: 0.85 }}
                  transition={{ duration: 0.26 }}
                  className="queue-msg"
                >
                  <span>{m.topic}</span>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
        <div className="queue-depth-footer">
          Queue depth <span className="queue-depth">{q.msgs.length}</span>
        </div>
      </div>

      <div className={`queue-consumer-link ${q.consumer === "running" ? "active" : ""}`}>↓</div>

      <Node
        name="Consumer"
        role={q.consumer === "running" ? "Receiving messages" : "Not attached"}
        accent={q.consumer === "running" ? "green" : "slate"}
        lit={q.consumer === "running"}
        style={{ minWidth: 0, justifyContent: "center", padding: 10 }}
      >
        <div className="queue-consumer-controls">
          {q.consumer === "running" ? (
            <Btn sm onClick={() => onConsumer("none")}>Stop consuming</Btn>
          ) : (
            <Btn sm variant="primary" onClick={() => onConsumer("running")}>Start consuming</Btn>
          )}
          <div className="queue-consumer-status">
            {q.consumer === "running" ? "messages leave on ack" : "messages accumulate"}
          </div>
        </div>
      </Node>
    </div>
  );
}
