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
  Toggle,
} from "../components/kit";
import { useFlow, Pt } from "../components/useFlow";

const CLIENT: Pt = { x: 15, y: 26 };
const BROKER: Pt = { x: 40, y: 50 };
const SUB: Pt = { x: 72, y: 24 };
const QUEUE: Pt = { x: 60, y: 78 };
const REST: Pt = { x: 87, y: 78 };

export default function Lesson07Rest() {
  const { flyers, emit, remove } = useFlow();
  const [healthy, setHealthy] = useState(true);
  const [ingressReceived, setIngressReceived] = useState(0);
  const [depth, setDepth] = useState(0);
  const [delivered, setDelivered] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [posting, setPosting] = useState(false);

  const refs = useRef({ healthy, depth, posting });
  refs.current = { healthy, depth, posting };
  const timers = useRef<number[]>([]);
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // an HTTP POST publishes to the broker; the broker then fans the event
  // to its live subscriber AND enqueues a copy for the REST consumer
  const httpPost = () => {
    emit({ from: CLIENT, to: BROKER, tone: "green", label: "POST /publish", duration: 0.8 });
    later(850, () => {
      emit({ from: BROKER, to: SUB, tone: "green", label: "InspectionResult", duration: 0.8 });
      later(850, () => setIngressReceived((n) => n + 1));
      emit({ from: BROKER, to: QUEUE, tone: "green", label: "queued", duration: 0.7 });
      setDepth((d) => d + 1);
    });
  };

  // egress: broker posts each queued message to the REST endpoint,
  // dequeuing ONLY on a 2xx response
  useEffect(() => {
    const iv = window.setInterval(() => {
      const r = refs.current;
      if (r.depth <= 0 || r.posting) return;
      setPosting(true);
      const ok = r.healthy;
      emit({ from: QUEUE, to: REST, tone: ok ? "green" : "red", label: ok ? "POST → 200 OK" : "POST → 503", duration: 0.9 });
      later(950, () => {
        if (ok) {
          setDepth((d) => Math.max(0, d - 1)); // 2xx → dequeue
          setDelivered((n) => n + 1);
        } else {
          setAttempts((n) => n + 1); // non-2xx → message stays, will retry
        }
        setPosting(false);
      });
    }, 1500);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="lesson-layout">
      <div>
        <Stage
          note={
            healthy
              ? "Top: any HTTP client can POST straight to the broker — no MQTT library required. Bottom: the broker posts each queued message to the REST endpoint and dequeues only after a 2xx response."
              : "The REST endpoint is returning 5xx. The broker keeps the message in the queue and retries — nothing is dequeued until it gets a 2xx."
          }
          minHeight={440}
        >
          <svg className="flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line className="flow-line active" x1={CLIENT.x} y1={CLIENT.y} x2={BROKER.x} y2={BROKER.y} vectorEffect="non-scaling-stroke" />
            <line className="flow-line active" x1={BROKER.x} y1={BROKER.y} x2={SUB.x} y2={SUB.y} vectorEffect="non-scaling-stroke" />
            <line className="flow-line active" x1={BROKER.x} y1={BROKER.y} x2={QUEUE.x} y2={QUEUE.y} vectorEffect="non-scaling-stroke" />
            <line className={`flow-line ${healthy ? "active" : "dead"}`} x1={QUEUE.x} y1={QUEUE.y} x2={REST.x} y2={REST.y} vectorEffect="non-scaling-stroke" />
          </svg>

          <Anchored pt={CLIENT}>
            <Node icon="⇄" name="HTTP Client" role="curl / ERP / cloud" accent="cyan" sub="no MQTT needed" />
          </Anchored>
          <Anchored pt={BROKER}>
            <Broker active={ingressReceived > 0 || depth > 0} />
          </Anchored>
          <Anchored pt={SUB}>
            <Node icon="◎" name="Live Subscriber" role="Consumer" accent="green" sub={`received ${ingressReceived}`} />
          </Anchored>

          <Anchored pt={QUEUE}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <QueueChip depth={depth} label="REST queue" tone="green" />
              <span className="lane-arrow">→</span>
            </div>
          </Anchored>
          <Anchored pt={REST}>
            <Node
              icon="⇄"
              name="REST Endpoint"
              role="External API"
              accent={healthy ? "green" : "red"}
              sub={healthy ? `delivered ${delivered}` : `5xx · ${attempts} retries`}
              offline={!healthy}
              badge={healthy ? { text: "200 OK", kind: "ok" } : { text: "5xx", kind: "err" }}
            />
          </Anchored>

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
            <ControlGroup label="Publish (HTTP POST)">
              <Btn variant="primary" onClick={httpPost}>HTTP POST to broker</Btn>
              <span className="dim" style={{ fontSize: 12 }}>delivers live to the subscriber and enqueues a copy for REST</span>
            </ControlGroup>
          </div>
          <div className="control-row">
            <ControlGroup label="REST endpoint">
              <Toggle checked={healthy} onChange={setHealthy} label="Endpoint responds 2xx" />
              <span className="dim" style={{ fontSize: 12 }}>
                {healthy ? "healthy — messages dequeue on 200" : "failing — messages stay queued & retry"}
              </span>
            </ControlGroup>
          </div>
        </ControlBar>
      </div>

      <div className="rail">
        <Prediction
          question="A queue is configured to deliver to a REST endpoint. The endpoint returns 503. What happens to the message?"
          choices={[
            { id: "a", text: "It's dropped — HTTP delivery is best-effort" },
            { id: "b", text: "It stays in the queue and retries until a 2xx", correct: true },
          ]}
          reveal={
            <>
              <b>It stays and retries.</b> Broker-managed REST delivery only dequeues a message on a
              <b> 2xx</b> response. A 4xx/5xx leaves the message safely in the queue, so a flaky or
              down API never loses data — it just drains once the endpoint recovers.
            </>
          }
        />

        <Card title="Two directions">
          <div className="prose" style={{ fontSize: 13.5 }}>
            <p><b style={{ color: "var(--green-bright)" }}>Ingress:</b> any system that can make an HTTP POST can publish to the broker — no MQTT client, no SDK. Great for ERPs, cloud functions, and webhooks.</p>
            <p><b style={{ color: "var(--green-bright)" }}>Egress:</b> a queue can push each message to an external REST API, dequeuing only on a 2xx. The broker handles retries and back-pressure.</p>
          </div>
        </Card>

        <Card title="Try this">
          <div className="prose" style={{ fontSize: 13 }}>
            <p>POST a few messages, then flip the endpoint to <b>5xx</b> — watch the REST queue hold and retry instead of losing data. Flip it back to 2xx and it drains.</p>
          </div>
        </Card>

        <InsightCard
          items={[
            "An HTTP POST can publish to the broker — no messaging client required.",
            "Queues can deliver outbound to a REST endpoint via broker-managed HTTP.",
            "A message is dequeued only on a 2xx response.",
            "Non-2xx responses keep the message queued and retried — no data loss.",
            "REST bridges legacy and cloud systems into the event-driven world.",
          ]}
        />
      </div>
    </div>
  );
}
