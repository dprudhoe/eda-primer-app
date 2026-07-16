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
  Toggle,
} from "../components/kit";
import { useFlow, Pt } from "../components/useFlow";

const MES: Pt = { x: 10, y: 30 };
const HUB: Pt = { x: 42, y: 30 };
const CONSUMER: Pt = { x: 82, y: 30 };
const DB: Pt = { x: 82, y: 82 };

type Status = "pending" | "ok" | "fail";
const STEP_LABELS = [
  "Message published",
  "Broker accepted message",
  "Consumer received message",
  "Transport acknowledgment completed",
  "Database updated",
  "Business transaction completed",
];

export default function Lesson03QoS() {
  const { flyers, emit, remove } = useFlow();
  const [dbUp, setDbUp] = useState(true);
  const [consumerUp, setConsumerUp] = useState(true);
  const [steps, setSteps] = useState<Status[]>(Array(6).fill("pending"));
  const [running, setRunning] = useState(false);
  const [dbBusy, setDbBusy] = useState(false);
  const [, force] = useState(0);

  const m = useRef({ stage: 0, at: 0, active: false, dbEmitted: false });
  const dbUpRef = useRef(dbUp);
  const consumerUpRef = useRef(consumerUp);
  dbUpRef.current = dbUp;
  consumerUpRef.current = consumerUp;

  const setStep = (i: number, s: Status) => setSteps((cur) => cur.map((v, idx) => (idx === i ? s : v)));

  useEffect(() => {
    const iv = window.setInterval(() => {
      const mm = m.current;
      if (!mm.active) return;
      const now = Date.now();
      const el = now - mm.at;
      const adv = (s: number) => { mm.stage = s; mm.at = now; };
      force((n) => n + 1);
      switch (mm.stage) {
        case 0: // published → broker accepted
          if (el >= 700) { setStep(0, "ok"); setStep(1, "ok"); adv(1); }
          break;
        case 1: // held at broker (QoS 1) until the consumer is online
          if (consumerUpRef.current) {
            emit({ from: HUB, to: CONSUMER, tone: "green", label: "WorkOrderReleased", duration: 0.9 });
            adv(2);
          }
          break;
        case 2: // delivering to consumer
          if (el >= 850) {
            setStep(2, "ok");
            emit({ from: CONSUMER, to: HUB, tone: "violet", label: "PUBACK (QoS 1)", duration: 0.8 });
            adv(3);
          }
          break;
        case 3: // transport ack
          if (el >= 800) { setStep(3, "ok"); adv(4); }
          break;
        case 4: // database write
          if (!mm.dbEmitted) {
            mm.dbEmitted = true;
            setDbBusy(true);
            emit({ from: CONSUMER, to: DB, tone: dbUpRef.current ? "green" : "red", label: "INSERT work_order", duration: 0.9 });
          }
          if (el >= 950) {
            const ok = dbUpRef.current;
            setStep(4, ok ? "ok" : "fail");
            setStep(5, ok ? "ok" : "fail");
            setDbBusy(false);
            mm.active = false;
            adv(5);
            setRunning(false);
          }
          break;
      }
    }, 150);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = () => {
    if (running) return;
    setSteps(Array(6).fill("pending"));
    setRunning(true);
    setDbBusy(false);
    m.current = { stage: 0, at: Date.now(), active: true, dbEmitted: false };
    emit({ from: MES, to: HUB, tone: "green", label: "WorkOrderReleased", duration: 0.7 });
  };

  const held = running && m.current.stage === 1 && !consumerUp;
  const businessOk = steps[5] === "ok";
  const businessFail = steps[5] === "fail";

  const note = held
    ? "The consumer is offline — but the message is not lost. QoS 1 holds it at the broker and will redeliver the moment the consumer reconnects."
    : businessFail
    ? "Transport succeeded at every layer — yet the business transaction failed. QoS delivered the bytes; it can't commit your database."
    : businessOk
    ? "Delivery and processing both succeeded — two separate outcomes on the timeline."
    : "Publish a work order. Toggle the consumer offline to see QoS 1 hold the message; toggle the database offline to see business processing fail after a successful delivery.";

  return (
    <div className="lesson-layout">
      <div>
        <Stage note={note} minHeight={400}>
          <svg className="flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line className="flow-line active" x1={MES.x} y1={MES.y} x2={HUB.x} y2={HUB.y} vectorEffect="non-scaling-stroke" />
            <line className={`flow-line ${consumerUp ? "active" : "dead"}`} x1={HUB.x} y1={HUB.y} x2={CONSUMER.x} y2={CONSUMER.y} vectorEffect="non-scaling-stroke" />
            <line className={`flow-line ${dbUp ? "active" : "dead"}`} x1={CONSUMER.x} y1={CONSUMER.y} x2={DB.x} y2={DB.y} vectorEffect="non-scaling-stroke" />
          </svg>

          <Anchored pt={MES}>
            <Node icon="▣" name="MES" role="Publisher · QoS 1" accent="green" sub="releases work orders" />
          </Anchored>
          <Anchored pt={HUB}>
            <Broker active={running} />
          </Anchored>
          {held ? (
            <Anchored pt={{ x: 42, y: 52 }}>
              <span className="node-badge badge-warn blink">✦ 1 held (QoS 1)</span>
            </Anchored>
          ) : null}
          <Anchored pt={CONSUMER}>
            <Node
              icon="◉"
              name="Line Execution System"
              role="Consumer"
              accent={!consumerUp ? "slate" : businessFail ? "red" : "cyan"}
              sub={!consumerUp ? "offline" : dbBusy ? "writing to database…" : businessFail ? "processing failed" : businessOk ? "committed" : "idle"}
              lit={running && consumerUp}
              offline={!consumerUp}
              badge={consumerUp ? undefined : { text: "Offline", kind: "off" }}
            />
          </Anchored>
          <Anchored pt={DB}>
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
              <Btn variant="primary" onClick={run} disabled={running}>
                ▶ Publish WorkOrderReleased
              </Btn>
            </ControlGroup>
            <ControlGroup label="Environment">
              <Toggle checked={consumerUp} onChange={setConsumerUp} label="Consumer online" />
              <Toggle checked={dbUp} onChange={setDbUp} label="Database online" />
            </ControlGroup>
          </div>
        </ControlBar>
      </div>

      <div className="rail">
        <Prediction
          question="The broker accepted the message and the consumer acknowledged it (QoS 1). Was the work order successfully processed?"
          choices={[
            { id: "a", text: "Yes — a successful ack means it's done" },
            { id: "b", text: "Not necessarily — delivery and processing are different", correct: true },
          ]}
          reveal={
            <>
              <b>Not necessarily.</b> QoS 1 reliably gets the message to the consumer — it will even
              hold and redeliver if the consumer is offline. But it says nothing about whether the
              consumer's database write — the actual business outcome — succeeded.
            </>
          }
        />

        <Card title="Delivery vs. business outcome">
          <div className="timeline">
            {STEP_LABELS.map((label, i) => {
              const s = steps[i];
              const isTransport = i <= 3;
              return (
                <div className="timeline-row" key={i}>
                  <div className={`timeline-icon ${s}`}>{s === "ok" ? "✓" : s === "fail" ? "✕" : i + 1}</div>
                  <div className="timeline-label">
                    {label}
                    <div style={{ fontSize: 10, color: "var(--text-mute)", marginTop: 1 }}>
                      {isTransport ? "Transport layer (MQTT QoS)" : "Application / business layer"}
                    </div>
                  </div>
                  <span className={`timeline-status ${s}`}>{s === "ok" ? "Success" : s === "fail" ? "Failed" : "—"}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <InsightCard
          items={[
            "MQTT QoS provides transport-level assurance.",
            "QoS 1 will hold and redeliver to a consumer that was offline — the message isn't lost.",
            "But a transport ack does not prove business processing completed.",
            "Application-managed recovery is required when processing fails after delivery.",
          ]}
        />
      </div>
    </div>
  );
}
