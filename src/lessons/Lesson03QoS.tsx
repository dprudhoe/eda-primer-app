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
  Stage,
  Toggle,
} from "../components/kit";
import { useFlow, Pt } from "../components/useFlow";

const MES: Pt = { x: 10, y: 49 };
const HUB: Pt = { x: 31, y: 49 };
const MQTT_QUEUE: Pt = { x: 51, y: 24 };
const MQTT_CONSUMER: Pt = { x: 70, y: 24 };
const MQTT_DB: Pt = { x: 90, y: 24 };
const QUEUE: Pt = { x: 51, y: 74 };
const QUEUE_CONSUMER: Pt = { x: 70, y: 74 };
const QUEUE_DB: Pt = { x: 90, y: 74 };

type Status = "pending" | "ok" | "fail";

export default function Lesson03QoS() {
  const { flyers, emit, remove } = useFlow();
  const [dbUp, setDbUp] = useState(true);
  const [consumerUp, setConsumerUp] = useState(true);
  const [steps, setSteps] = useState<Status[]>(Array(6).fill("pending"));
  const [running, setRunning] = useState(false);
  const [dbBusy, setDbBusy] = useState(false);
  const [queueBusy, setQueueBusy] = useState(false);
  const [mqttDepth, setMqttDepth] = useState(0);
  const [mqttStatus, setMqttStatus] = useState("Ready");
  const [queueDepth, setQueueDepth] = useState(0);
  const [queueStatus, setQueueStatus] = useState("Ready");
  const [, force] = useState(0);

  const m = useRef({ stage: 0, at: 0, active: false, dbEmitted: false });
  const q = useRef({ stage: 0, at: 0, active: false, dbEmitted: false });
  const dbUpRef = useRef(dbUp);
  const consumerUpRef = useRef(consumerUp);
  dbUpRef.current = dbUp;
  consumerUpRef.current = consumerUp;

  const setStep = (i: number, s: Status) => setSteps((cur) => cur.map((v, idx) => (idx === i ? s : v)));

  useEffect(() => {
    const iv = window.setInterval(() => {
      const mm = m.current;
      const qq = q.current;
      if (!mm.active && !qq.active) return;
      const now = Date.now();
      force((n) => n + 1);
      if (mm.active) {
        const el = now - mm.at;
        const adv = (s: number) => { mm.stage = s; mm.at = now; };
        switch (mm.stage) {
          case 0:
            if (el >= 700) {
              setStep(0, "ok");
              setStep(1, "ok");
              setMqttStatus("Enqueuing");
              emit({ from: HUB, to: MQTT_QUEUE, tone: "violet", label: "WorkOrderReleased", duration: 0.8 });
              adv(1);
            }
            break;
          case 1:
            if (el >= 800) {
              setMqttDepth(1);
              setMqttStatus("Queued");
              adv(2);
            }
            break;
          case 2:
            if (el >= 350 && consumerUpRef.current) {
              emit({ from: MQTT_QUEUE, to: MQTT_CONSUMER, tone: "violet", label: "WorkOrderReleased", duration: 0.85 });
              setMqttStatus("Delivering");
              adv(3);
            }
            break;
          case 3:
            if (el >= 850) {
              setStep(2, "ok");
              setMqttDepth(0);
              setMqttStatus("Delivered · awaiting PUBACK");
              emit({ from: MQTT_CONSUMER, to: MQTT_QUEUE, tone: "violet", label: "✓ PUBACK", duration: 0.7 });
              setDbBusy(true);
              emit({ from: MQTT_CONSUMER, to: MQTT_DB, tone: dbUpRef.current ? "green" : "red", label: "Process", duration: 0.8 });
              adv(4);
            }
            break;
          case 4:
            if (el >= 700) {
              setStep(3, "ok");
              setMqttStatus("Dequeued on PUBACK");
              adv(5);
            }
            break;
          case 5:
            if (el >= 150) {
              const ok = dbUpRef.current;
              setStep(4, ok ? "ok" : "fail");
              setStep(5, ok ? "ok" : "fail");
              setMqttStatus(ok ? "Processed" : "Processing failed · message gone");
              setDbBusy(false);
              mm.active = false;
            }
            break;
        }
      }

      if (qq.active) {
        const el = now - qq.at;
        const adv = (s: number) => { qq.stage = s; qq.at = now; };
        switch (qq.stage) {
          case 0:
            if (el >= 700) {
              setQueueStatus("Enqueuing");
              emit({ from: HUB, to: QUEUE, tone: "green", label: "WorkOrderReleased", duration: 0.8 });
              adv(1);
            }
            break;
          case 1:
            if (el >= 800) {
              setQueueDepth(1);
              setQueueStatus("Queued");
              adv(2);
            }
            break;
          case 2:
            if (el >= 350 && consumerUpRef.current) {
              emit({ from: QUEUE, to: QUEUE_CONSUMER, tone: "green", label: "WorkOrderReleased", duration: 0.85 });
              setQueueStatus("Delivering · unsettled");
              adv(3);
            }
            break;
          case 3:
            if (el >= 850) {
              setQueueBusy(true);
              setQueueStatus("Processing · unsettled");
              emit({ from: QUEUE_CONSUMER, to: QUEUE_DB, tone: dbUpRef.current ? "green" : "red", label: "Process", duration: 0.8 });
              adv(4);
            }
            break;
          case 4:
            if (el >= 850) {
              setQueueBusy(false);
              if (dbUpRef.current) {
                emit({ from: QUEUE_CONSUMER, to: QUEUE, tone: "green", label: "✓ ACCEPTED", duration: 0.7 });
                setQueueStatus("Processed · accepted");
                adv(5);
              } else {
                emit({ from: QUEUE_CONSUMER, to: QUEUE, tone: "amber", label: "↩ FAILED", duration: 0.7 });
                setQueueStatus("Processing failed · returning");
                adv(5);
              }
            }
            break;
          case 5:
            if (el >= 700) {
              if (dbUpRef.current) {
                setQueueDepth(0);
                setQueueStatus("Settled · removed");
                qq.active = false;
              } else {
                setQueueDepth(1);
                setQueueStatus("Held for redelivery");
                adv(6);
              }
            }
            break;
          case 6:
            if (dbUpRef.current) {
              setQueueStatus("Redelivering");
              adv(2);
            }
            break;
        }
      }

      if (!m.current.active && !q.current.active) setRunning(false);
    }, 150);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = () => {
    if (running) return;
    setSteps(Array(6).fill("pending"));
    setRunning(true);
    setDbBusy(false);
    setQueueBusy(false);
    setMqttDepth(0);
    setMqttStatus("Publishing");
    setQueueDepth(0);
    setQueueStatus("Publishing");
    m.current = { stage: 0, at: Date.now(), active: true, dbEmitted: false };
    q.current = { stage: 0, at: Date.now(), active: true, dbEmitted: false };
    emit({ from: MES, to: HUB, tone: "green", label: "WorkOrderReleased", duration: 0.7 });
  };

  const heldOffline = running && m.current.stage === 2 && !consumerUp;
  const businessOk = steps[5] === "ok";
  const businessFail = steps[5] === "fail";

  const note = heldOffline
    ? "The consumer is offline — but the message is not lost. QoS 1 holds it at the broker and will redeliver the moment the consumer reconnects."
    : businessFail
    ? "Transport succeeded at every layer — yet the business transaction failed. QoS delivered the bytes; it can't commit your database."
    : businessOk
    ? "Delivery and processing both succeeded — two separate outcomes on the timeline."
    : "Take the database offline, then publish. MQTT acknowledges delivery before processing fails; the queue-backed consumer returns the unsettled message and retries when the database recovers.";

  return (
    <div className="lesson-layout">
      <div>
        <Stage note={note} minHeight={540}>
          <svg className="flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line className="flow-line active" x1={MES.x} y1={MES.y} x2={HUB.x} y2={HUB.y} vectorEffect="non-scaling-stroke" />
            <line className="flow-line active" x1={HUB.x} y1={HUB.y} x2={MQTT_QUEUE.x} y2={MQTT_QUEUE.y} vectorEffect="non-scaling-stroke" />
            <line className={`flow-line ${consumerUp ? "active" : "dead"}`} x1={MQTT_QUEUE.x} y1={MQTT_QUEUE.y} x2={MQTT_CONSUMER.x} y2={MQTT_CONSUMER.y} vectorEffect="non-scaling-stroke" />
            <line className={`flow-line ${dbUp ? "active" : "dead"}`} x1={MQTT_CONSUMER.x} y1={MQTT_CONSUMER.y} x2={MQTT_DB.x} y2={MQTT_DB.y} vectorEffect="non-scaling-stroke" />
            <line className="flow-line active" x1={HUB.x} y1={HUB.y} x2={QUEUE.x} y2={QUEUE.y} vectorEffect="non-scaling-stroke" />
            <line className={`flow-line ${consumerUp ? "active" : "dead"}`} x1={QUEUE.x} y1={QUEUE.y} x2={QUEUE_CONSUMER.x} y2={QUEUE_CONSUMER.y} vectorEffect="non-scaling-stroke" />
            <line className={`flow-line ${dbUp ? "active" : "dead"}`} x1={QUEUE_CONSUMER.x} y1={QUEUE_CONSUMER.y} x2={QUEUE_DB.x} y2={QUEUE_DB.y} vectorEffect="non-scaling-stroke" />
          </svg>

          <Anchored pt={MES}>
            <Node icon="▣" name="MES" role="Publisher" accent="green" sub="same event · two models" />
          </Anchored>
          <Anchored pt={HUB}>
            <Broker active={running} />
          </Anchored>
          <Anchored pt={{ x: 50, y: 8 }}>
            <div className="flow-lane-label">MQTT QoS 1 · receipt acknowledged</div>
          </Anchored>
          <Anchored pt={{ x: 51, y: 60 }}>
            <div className="flow-lane-label">Queue-backed settlement · AMQP / SMF</div>
          </Anchored>
          <Anchored pt={MQTT_QUEUE}>
            <div className={`qchip queue-settlement mqtt-session-queue ${mqttDepth ? "has-message" : ""}`}>
              <span className="qchip-label">MQTT SESSION QUEUE</span>
              <MsgToken label={`${mqttDepth} queued`} tone={mqttDepth ? (heldOffline ? "amber" : "violet") : "violet"} />
            </div>
          </Anchored>
          <Anchored pt={MQTT_CONSUMER}>
            <Node
              icon="◉"
              name="MQTT Consumer"
              role="QoS 1"
              accent={!consumerUp ? "slate" : businessFail ? "red" : "cyan"}
              sub={!consumerUp ? "offline" : dbBusy ? "processing…" : mqttStatus}
              lit={running && consumerUp}
              offline={!consumerUp}
              badge={consumerUp ? undefined : { text: "Offline", kind: "off" }}
            />
          </Anchored>
          <Anchored pt={MQTT_DB}>
            <Node
              icon="▤"
              name="Order Database"
              role="System of record"
              accent={dbUp ? "green" : "red"}
              badge={dbUp ? { text: "Online", kind: "ok" } : { text: "Offline", kind: "err" }}
              sub={dbUp ? "accepting writes" : "connection refused"}
              offline={!dbUp}
            />
          </Anchored>
          <Anchored pt={QUEUE}>
            <div className={`qchip queue-settlement ${queueDepth ? "has-message" : ""}`}>
              <span className="qchip-label">WORK ORDER QUEUE</span>
              <MsgToken label={`${queueDepth} queued`} tone={queueDepth ? "amber" : "green"} />
            </div>
          </Anchored>
          <Anchored pt={QUEUE_CONSUMER}>
            <Node
              icon="◉"
              name="Queue Consumer"
              role="AMQP / SMF"
              accent={queueStatus.includes("failed") || queueStatus.includes("Held") ? "amber" : "green"}
              sub={queueBusy ? "processing · unsettled" : queueStatus}
              lit={queueBusy}
              offline={!consumerUp}
              badge={consumerUp ? undefined : { text: "Offline", kind: "off" }}
            />
          </Anchored>
          <Anchored pt={QUEUE_DB}>
            <Node
              icon="▤"
              name="Order Database"
              role="Same system of record"
              accent={dbUp ? "green" : "red"}
              badge={dbUp ? { text: "Online", kind: "ok" } : { text: "Offline", kind: "err" }}
              sub={dbUp ? "accepting writes" : "connection refused"}
              offline={!dbUp}
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

        <div className="control-stack">
          <ControlBar>
            <div className="control-row">
              <ControlGroup label="Publish">
                <Btn variant="primary" onClick={run} disabled={running}>
                  ▶ Publish WorkOrderReleased
                </Btn>
              </ControlGroup>
              <ControlGroup label="Environment">
                <Toggle checked={consumerUp} onChange={setConsumerUp} label="Consumers online" />
                <Toggle checked={dbUp} onChange={setDbUp} label="Database online" />
              </ControlGroup>
            </div>
          </ControlBar>

          <Card title="Try this">
            <div className="prose guided-steps">
              <p>
                <b>1.</b> Publish with everything online. Both delivery models successfully process
                the work order.
              </p>
              <p>
                <b>2.</b> Take the consumers offline and publish again. Both queues hold the message
                until the consumers reconnect.
              </p>
              <p>
                <b>3.</b> Take only the database offline and publish. MQTT removes its copy after
                PUBACK; the application-settled queue retains its copy and retries when processing
                becomes available.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div className="rail">
        <Card title="Scenario">
          <div className="prose">
            <p>
              An MES publishes the same work order through two delivery models. Take the database
              offline to compare MQTT QoS 1 receipt with queue-backed application settlement.
            </p>
          </div>
        </Card>

        <InsightCard
          items={[
            "MQTT QoS provides transport-level assurance.",
            "QoS 1 will hold and redeliver to a consumer that was offline — the message isn't lost.",
            "But a transport ack does not prove business processing completed.",
            "MQTT is commonly used for live telemetry and state updates; processing-critical transactions often benefit from queue-backed application settlement.",
            "A queue-backed consumer can settle only after processing succeeds.",
            "Failed processing returns the message to the queue for broker-managed redelivery.",
          ]}
        />
      </div>
    </div>
  );
}
