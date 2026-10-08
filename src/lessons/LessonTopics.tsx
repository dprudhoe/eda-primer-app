import { useState } from "react";
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
} from "../components/kit";
import { useFlow } from "../components/useFlow";
import { topicMatches } from "../components/topics";

const events = [
  {
    topic: "factory/line1/alarm",
    payload: '{ "machineId": "PRESS-01", "code": "OVERHEAT" }',
  },
  {
    topic: "factory/line2/alarm",
    payload: '{ "machineId": "PUMP-02", "code": "LOW_PRESSURE" }',
  },
  {
    topic: "factory/line1/temperature",
    payload: '{ "machineId": "PRESS-01", "temperatureC": 72.4 }',
  },
  {
    topic: "factory/line1/quality/failed",
    payload: '{ "partId": "PART-101", "result": "fail" }',
  },
];
const source = { x: 14, y: 49 },
  hub = { x: 43, y: 49 };
const consumers = [
  { name: "Maintenance", pt: { x: 82, y: 19 }, initial: "factory/line1/alarm" },
  { name: "Operations", pt: { x: 82, y: 50 }, initial: "factory/*/alarm" },
  { name: "Quality", pt: { x: 82, y: 81 }, initial: "factory/line1/>" },
];
export default function LessonTopics() {
  const [selected, setSelected] = useState(0);
  const [subscriptions, setSubscriptions] = useState(
    consumers.map((c) => c.initial),
  );
  const [counts, setCounts] = useState([0, 0, 0]);
  const [last, setLast] = useState<string | null>(null);
  const { flyers, emit, remove } = useFlow();
  const event = events[selected];
  const publish = (i: number) => {
    const e = events[i];
    setSelected(i);
    const matches = subscriptions.flatMap((s, index) =>
      topicMatches(s, e.topic) ? [index] : [],
    );
    setLast(
      matches.length
        ? `Matching consumers: ${matches.map((n) => consumers[n].name).join(", ")}. Each receives one copy.`
        : "No subscriptions match this topic. No consumer receives this publication.",
    );
    emit({
      from: source,
      to: hub,
      tone: "green",
      label: e.topic,
      meta: { matches },
      duration: 0.6,
    });
  };
  return (
    <div className="lesson-layout">
      <div>
        <Stage
          minHeight={530}
          note={
            last ??
            "Click an example topic to publish a message. Matching uses the subscriptions in effect when you publish."
          }
        >
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
            {consumers.map((c) => (
              <line
                key={c.name}
                className="flow-line active"
                x1={hub.x}
                y1={hub.y}
                x2={c.pt.x}
                y2={c.pt.y}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          <Anchored pt={source}>
            <Node
              name="DataOps tool"
              role="Publisher"
              sub="Topic + payload"
              style={{ width: 145 }}
            />
          </Anchored>
          <Anchored pt={hub}>
            <Broker active={flyers.length > 0} label="Subscription matching" />
          </Anchored>
          {consumers.map((c, i) => (
            <Anchored key={c.name} pt={c.pt}>
              <Node
                name={c.name}
                role="Independent consumer"
                sub={
                  <>
                    <div>{subscriptions[i] || "No subscription"}</div>
                    <div>Received {counts[i]}</div>
                  </>
                }
                accent="cyan"
                style={{ width: 195 }}
              />
            </Anchored>
          ))}
          <AnimatePresence>
            {flyers.map((f) => (
              <Particle
                key={f.id}
                from={f.from}
                to={f.to}
                duration={0.6}
                onDone={() => {
                  remove(f.id);
                  if (f.meta?.matches)
                    (f.meta.matches as number[]).forEach((i) =>
                      emit({
                        from: hub,
                        to: consumers[i].pt,
                        tone: "green",
                        label: f.label,
                        meta: { consumer: i },
                      }),
                    );
                  else if (f.meta?.consumer !== undefined)
                    setCounts((c) =>
                      c.map((n, i) => n + (i === f.meta?.consumer ? 1 : 0)),
                    );
                }}
              >
                <MsgToken label={f.label} />
              </Particle>
            ))}
          </AnimatePresence>
        </Stage>
        <div className="control-stack">
          <ControlBar>
            <ControlGroup label="Example topics — click to publish">
              <div className="example-grid">
                {events.map((e, i) => (
                  <Btn
                    key={e.topic}
                    variant={i === selected ? "primary" : "default"}
                    onClick={() => publish(i)}
                  >
                    {e.topic}
                  </Btn>
                ))}
              </div>
            </ControlGroup>
            <ControlGroup label="Consumer subscriptions">
              {consumers.map((c, i) => (
                <div key={c.name} className="topic-subscription">
                  <label htmlFor={`topic-sub-${i}`}>{c.name}</label>
                  <input
                    id={`topic-sub-${i}`}
                    className="text-input"
                    value={subscriptions[i]}
                    onChange={(e) =>
                      setSubscriptions((s) =>
                        s.map((v, n) => (n === i ? e.target.value : v)),
                      )
                    }
                  />
                  <div className="control-row">
                    {[
                      "factory/line1/alarm",
                      "factory/*/alarm",
                      "factory/line1/>",
                    ].map((s, n) => (
                      <Btn
                        key={s}
                        sm
                        onClick={() =>
                          setSubscriptions((v) =>
                            v.map((x, j) => (i === j ? s : x)),
                          )
                        }
                      >
                        {
                          [
                            "Exact topic",
                            "One level (*)",
                            "Trailing levels (>)",
                          ][n]
                        }
                      </Btn>
                    ))}
                  </div>
                </div>
              ))}
            </ControlGroup>
          </ControlBar>
        </div>
      </div>
      <div className="rail">
        <Card title="Scenario">
          <div className="prose">
            <p>
              A DataOps tool publishes equipment and quality observations. A{" "}
              <strong>topic</strong> is routing metadata associated with the
              message, separate from its payload. Its slash-separated levels
              describe the stream; it is not a stored queue.
            </p>
            <p>
              Click example topics and change each consumer’s subscription. One
              publication can match several independent consumers. This lesson
              uses connected, live subscribers so you can focus on routing.
            </p>
          </div>
        </Card>
        <Card title="Inside the message">
          <div className="prose">
            <p>
              <strong>Topic metadata</strong>
            </p>
            <p>
              <code>{event.topic}</code>
            </p>
            <p>
              <strong>Payload</strong>
            </p>
            <pre className="topic-payload">{event.payload}</pre>
            <p>
              The topic determines subscription matching. The payload describes
              the observation.
            </p>
          </div>
        </Card>
        <Card title="Wildcards">
          <div className="prose">
            <p>
              Exact: <code>factory/line1/alarm</code> matches only that topic.
            </p>
            <p>
              <code>*</code> matches one level: <code>factory/*/alarm</code>{" "}
              matches alarms from line 1 or line 2.
            </p>
            <p>
              <code>&gt;</code> matches one or more trailing levels:{" "}
              <code>factory/line1/&gt;</code> matches temperatures, alarms, and
              quality events on line 1.
            </p>
            <p>
              These are Solace SMF wildcards. MQTT uses <code>+</code> and{" "}
              <code>#</code> with its own matching rules.
            </p>
          </div>
        </Card>
        <InsightCard
          items={[
            "A published message has a concrete topic. Wildcards belong in subscriptions, not published topics.",
            "Consumers register interest using exact topics or patterns.",
            "Each independent matching subscriber receives a copy; they do not compete for this live stream.",
            "Subscriptions describe interest. Durable queues add storage for consumers that are unavailable.",
          ]}
        />
        <Prediction
          question="Which subscription matches alarms from both line 1 and line 2, but not temperatures?"
          choices={[
            { id: "a", text: "factory/line1/>" },
            { id: "b", text: "factory/*/alarm", correct: true },
            { id: "c", text: "factory/line1/alarm" },
          ]}
          reveal="The single-level wildcard accepts either line while the final alarm level restricts the event type."
        />
      </div>
    </div>
  );
}
