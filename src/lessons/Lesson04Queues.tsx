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
  Toggle,
} from "../components/kit";
import { topicMatches } from "../components/topics";
import { useFlow } from "../components/useFlow";

type Message = { id: number; topic: string };
const subscription = "factory/*/material/consumed";
const topics = [
  "factory/line1/material/consumed",
  "factory/line2/material/consumed",
  "factory/line1/temperature",
];
const source = { x: 13, y: 24 },
  hub = { x: 43, y: 24 },
  queuePt = { x: 43, y: 68 },
  consumerPt = { x: 83, y: 68 };
export default function Lesson04Queues() {
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<Message[]>([]);
  const [acknowledged, setAcknowledged] = useState(0);
  const [last, setLast] = useState(
    "Publish a material-consumed event, then take Inventory Management offline and publish again.",
  );
  const nextId = useRef(1);
  const { flyers, emit, remove } = useFlow();
  const busy = flyers.length > 0;
  const publish = (topic: string) => {
    const message = { id: nextId.current++, topic };
    emit({
      from: source,
      to: hub,
      tone: "green",
      label: topic,
      duration: 0.6,
      meta: { phase: "publish", message },
    });
    setLast(
      topicMatches(subscription, topic)
        ? "The queue subscription matches. The broker stores this event for Inventory Management."
        : "The temperature topic does not match the material-consumed subscription. This queue stores no copy.",
    );
  };
  useEffect(() => {
    if (!online || busy || !queue.length) return;
    const timer = window.setTimeout(
      () =>
        emit({
          from: queuePt,
          to: consumerPt,
          tone: "green",
          label: `Material consumed · ${queue[0].id}`,
          meta: { phase: "deliver", message: queue[0] },
        }),
      180,
    );
    return () => window.clearTimeout(timer);
  }, [online, busy, queue, emit]);
  return (
    <div className="lesson-layout">
      <div>
        <Stage minHeight={540} note={last}>
          <svg
            className="flow-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <line
              className="flow-line active"
              x1={source.x}
              y1={source.y}
              x2={hub.x}
              y2={hub.y}
              vectorEffect="non-scaling-stroke"
            />
            <line
              className="flow-line active"
              x1={hub.x}
              y1={hub.y}
              x2={queuePt.x}
              y2={queuePt.y}
              vectorEffect="non-scaling-stroke"
            />
            <line
              className={`flow-line ${online ? "active" : "dead"}`}
              x1={queuePt.x}
              y1={queuePt.y}
              x2={consumerPt.x}
              y2={consumerPt.y}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <Anchored pt={source}>
            <Node
              name="MES"
              role="Publishes to topics"
              style={{ width: 140 }}
            />
          </Anchored>
          <Anchored pt={hub}>
            <Broker active={busy} />
          </Anchored>
          <Anchored pt={queuePt}>
            <div className="durable-queue-demo">
              <div className="node-name">Inventory Management queue</div>
              <div className="node-role">Subscription: {subscription}</div>
              <div className="durable-queue-messages">
                {queue.length ? (
                  queue.map((m) => (
                    <div key={m.id} className="queue-msg">
                      #{m.id} · {m.topic}
                    </div>
                  ))
                ) : (
                  <div className="queue-empty">Empty</div>
                )}
              </div>
              <div className="node-sub">
                {queue.length} stored · removed after acknowledgement
              </div>
            </div>
          </Anchored>
          <Anchored pt={consumerPt}>
            <Node
              name="Inventory Management"
              role="Consumer application"
              value={online ? "Online" : "Offline"}
              sub={`Acknowledged ${acknowledged}`}
              offline={!online}
              accent="cyan"
              style={{ width: 180 }}
            />
          </Anchored>
          <AnimatePresence>
            {flyers.map((f) => (
              <Particle
                key={f.id}
                from={f.from}
                to={f.to}
                duration={0.65}
                onDone={() => {
                  remove(f.id);
                  const message = f.meta?.message as Message;
                  if (f.meta?.phase === "publish") {
                    if (topicMatches(subscription, message.topic))
                      emit({
                        from: hub,
                        to: queuePt,
                        tone: "green",
                        label: `Store event #${message.id}`,
                        meta: { phase: "store", message },
                      });
                  } else if (f.meta?.phase === "store")
                    setQueue((q) => [...q, message]);
                  else if (f.meta?.phase === "deliver" && online)
                    emit({
                      from: consumerPt,
                      to: queuePt,
                      tone: "amber",
                      label: `ACK #${message.id}`,
                      meta: { phase: "ack", message },
                    });
                  else if (f.meta?.phase === "ack" && online) {
                    setQueue((q) => q.filter((m) => m.id !== message.id));
                    setAcknowledged((n) => n + 1);
                  }
                }}
              >
                <MsgToken label={f.label} tone={f.tone} />
              </Particle>
            ))}
          </AnimatePresence>
        </Stage>
        <ControlBar>
          <ControlGroup label="Example topics — click to publish">
            <div className="example-grid">
              {topics.map((t) => (
                <Btn key={t}  onClick={() => publish(t)}>
                  {t}
                </Btn>
              ))}
            </div>
          </ControlGroup>
          <div className="control-row">
            <Toggle
              checked={online}
              onChange={setOnline}
              label="Inventory Management online"
            />
          </div>
          <div className="control-row">
            <StatPill label="Stored" value={queue.length} tone="amber" />
            <StatPill label="Acknowledged" value={acknowledged} tone="cyan" />
          </div>
        </ControlBar>
      </div>
      <div className="rail">
        <Card title="Scenario">
          <div className="prose">
            <p>
              MES publishes material-consumed events using Guaranteed delivery.
              Inventory Management has a durable queue subscribed to those
              events from both production lines.
            </p>
            <p>
              The subscription determines which events enter the queue. The
              queue stores them while Inventory Management is offline. Reconnect
              it to watch delivery and the acknowledgement return to the queue.
            </p>
            <p>
              This example assumes successful processing before acknowledgement.
              If the consumer disconnects before acknowledgement, the stored
              event remains available for redelivery.
            </p>
          </div>
        </Card>
        <Card title="Try this">
          <div className="prose">
            <p>
              Take Inventory Management offline. Publish one material-consumed
              event from each line, then a temperature reading. Only the
              matching events accumulate.
            </p>
            <p>
              Reconnect the consumer. Each event stays stored during delivery,
              then leaves after the acknowledgement reaches the broker.
            </p>
          </div>
        </Card>
        <InsightCard
          items={[
            "A topic labels a message; a subscription matches it; a durable queue stores the matching copy.",
            "This queue serves Inventory Management. Independent consumer applications typically have their own queues.",
            "A consumer receives from its queue and acknowledges messages after processing.",
            "Unacknowledged events can be redelivered. Applications must handle duplicates safely.",
            "The next lesson connects multiple instances of one consumer application to the same queue to divide the work.",
          ]}
        />
        <Prediction
          question="Inventory Management receives an event but disconnects before acknowledging it. Is the stored event removed?"
          choices={[
            { id: "a", text: "Yes, receiving it is enough" },
            {
              id: "b",
              text: "No, it remains available for redelivery",
              correct: true,
            },
          ]}
          reveal="The queue retains the event until the broker receives acknowledgement, subject to storage and expiration policies. A redelivery may repeat work, so processing must account for duplicates."
        />
      </div>
    </div>
  );
}
