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
  StatPill,
  Toggle,
} from "../components/kit";
import { useFlow } from "../components/useFlow";

function useDeliveryScenario(guaranteed: boolean, y: number) {
  const source = { x: 15, y },
    hub = { x: 48, y: 50 },
    target = { x: 83, y };
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<string[]>([]);
  const [published, setPublished] = useState(0);
  const [delivered, setDelivered] = useState(0);
  const [lost, setLost] = useState(0);
  const [latest, setLatest] = useState("—");
  const sequence = useRef(0);
  const { flyers, emit, remove } = useFlow();
  const delivering = flyers.some((f) => f.meta?.drain);
  const send = () => {
    const index = sequence.current++;
    const label = guaranteed
      ? `Material consumed · ${index + 1}`
      : `${(72.4 + index * 0.2).toFixed(1)}°C`;
    setPublished((n) => n + 1);
    emit({
      from: source,
      to: hub,
      tone: guaranteed ? "violet" : "green",
      label,
      meta: { incoming: true },
      duration: 0.6,
    });
  };
  useEffect(() => {
    if (!guaranteed || !online || delivering || !queue.length) return;
    const timer = window.setTimeout(
      () =>
        emit({
          from: hub,
          to: target,
          tone: "violet",
          label: queue[0],
          meta: { drain: true },
        }),
      150,
    );
    return () => window.clearTimeout(timer);
  }, [guaranteed, online, delivering, queue, emit]);
  const title = guaranteed
    ? "Guaranteed: business events"
    : "Direct: live telemetry";
  return {
    active: flyers.length > 0,
    scene: (
      <>
        <svg
          className="flow-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <line
            className="flow-line active"
            x1={source.x}
            y1={y}
            x2={hub.x}
            y2={hub.y}
            vectorEffect="non-scaling-stroke"
          />
          <line
            className={`flow-line ${online ? "active" : "dead"}`}
            x1={hub.x}
            y1={hub.y}
            x2={target.x}
            y2={y}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <Anchored pt={source}>
          <Node
            name={guaranteed ? "MES" : "PLC gateway"}
            role={guaranteed ? "Guaranteed delivery" : "Direct delivery"}
            sub={guaranteed ? "Material consumed" : "Temperature measured"}
            style={{ width: 145 }}
          />
        </Anchored>
        {guaranteed && (
          <Anchored pt={{ x: 48, y: 76 }}>
            <QueueChip
              depth={queue.length}
              label="Inventory Management queue"
            />
          </Anchored>
        )}
        <Anchored pt={target}>
          <Node
            name={guaranteed ? "Inventory Management" : "Operator dashboard"}
            role="Consumer"
            sub={latest}
            value={online ? "Online" : "Offline"}
            offline={!online}
            accent={guaranteed ? "violet" : "cyan"}
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
                  if (guaranteed) setQueue((q) => [...q, f.label]);
                  else if (online)
                    emit({
                      from: hub,
                      to: target,
                      tone: "green",
                      label: f.label,
                    });
                  else setLost((n) => n + 1);
                } else if (online) {
                  setLatest(f.label);
                  setDelivered((n) => n + 1);
                  if (f.meta?.drain) setQueue((q) => q.slice(1));
                } else if (!f.meta?.drain) setLost((n) => n + 1);
              }}
            >
              <MsgToken label={f.label} tone={f.tone} />
            </Particle>
          ))}
        </AnimatePresence>
      </>
    ),
    controls: (
      <ControlGroup label={title}>
        <div className="control-row">
          <Btn variant="primary" onClick={send}>
            {guaranteed ? "Consume material" : "Publish a reading"}
          </Btn>
          <Toggle
            checked={online}
            onChange={setOnline}
            label={
              guaranteed ? "Inventory Management online" : "Dashboard online"
            }
          />
        </div>
        <div className="control-row">
          <StatPill label="Published" value={published} />
          <StatPill label="Delivered" value={delivered} tone="cyan" />
          {guaranteed ? (
            <StatPill label="Queued" value={queue.length} tone="amber" />
          ) : (
            <StatPill label="Missed" value={lost} tone="red" />
          )}
        </div>
      </ControlGroup>
    ),
  };
}
export default function Lesson01FireAndForget() {
  const direct = useDeliveryScenario(false, 26);
  const guaranteed = useDeliveryScenario(true, 74);
  return (
    <div className="lesson-layout">
      <div>
        <Stage
          minHeight={430}
          note="One broker supports both delivery contracts. Direct readings are not stored for an offline dashboard; Guaranteed events wait in Inventory Management’s queue until processing and acknowledgement."
        >
          <Anchored pt={{ x: 48, y: 50 }}>
            <Broker active={direct.active || guaranteed.active} />
          </Anchored>
          {direct.scene}
          {guaranteed.scene}
        </Stage>
        <ControlBar>
          {direct.controls}
          {guaranteed.controls}
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
              independent consumer application would typically have its own
              queue and receive its own copy of matching events. Multiple
              instances of Inventory Management can share this queue and divide
              the work.
            </p>
            <p>
              Take both consumers offline and publish three messages in each
              scenario. Reconnect them. Direct delivery resumes with new
              publications; Guaranteed delivery retains queued events and
              automatically delivers them in order when the consumer comes back
              online.
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
