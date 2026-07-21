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
} from "../components/kit";
import { useFlow, Pt } from "../components/useFlow";

const STATE_SOURCE: Pt = { x: 13, y: 27 };
const EVENT_SOURCE: Pt = { x: 13, y: 73 };
const BROKER: Pt = { x: 47, y: 50 };
const STATE_CONSUMER: Pt = { x: 84, y: 27 };
const EVENT_CONSUMER: Pt = { x: 84, y: 73 };
const STATE_VALUES = [80, 82, 84];
const EVENT_VALUES = ["PART-101", "PART-102", "PART-103"];

export default function Lesson00EventPatterns() {
  const { flyers, emit, remove, clear } = useFlow();
  const [stateValue, setStateValue] = useState<number | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [missingEvent, setMissingEvent] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState(false);
  const [dropped, setDropped] = useState(false);
  const timers = useRef<number[]>([]);

  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  const reset = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    clear();
    setStateValue(null);
    setEvents([]);
    setMissingEvent(null);
    setRunning(false);
    setRan(false);
  };
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const runComparison = (dropMiddle: boolean) => {
    reset();
    setRunning(true);
    setDropped(dropMiddle);

    STATE_VALUES.forEach((value, index) => {
      const start = index * 900;
      later(start, () => emit({ from: STATE_SOURCE, to: BROKER, tone: "green", label: `${value} psi`, duration: 0.45 }));
      later(start + 470, () => {
        if (dropMiddle && index === 1) {
          emit({ from: BROKER, to: { x: 67, y: 37 }, tone: "red", label: "82 psi · lost", duration: 0.45, dropAtEnd: true });
        } else {
          emit({ from: BROKER, to: STATE_CONSUMER, tone: "green", label: `${value} psi`, duration: 0.55 });
          later(570, () => setStateValue(value));
        }
      });
    });

    EVENT_VALUES.forEach((part, index) => {
      const start = index * 900;
      later(start, () => emit({ from: EVENT_SOURCE, to: BROKER, tone: "violet", label: `${part} rejected`, duration: 0.45 }));
      later(start + 470, () => {
        if (dropMiddle && index === 1) {
          emit({ from: BROKER, to: { x: 67, y: 63 }, tone: "red", label: `${part} · lost`, duration: 0.45, dropAtEnd: true });
          setMissingEvent(part);
        } else {
          emit({ from: BROKER, to: EVENT_CONSUMER, tone: "violet", label: `${part} rejected`, duration: 0.55 });
          later(570, () => setEvents((current) => [...current, part]));
        }
      });
    });

    later(3400, () => {
      setRunning(false);
      setRan(true);
    });
  };

  return (
    <div className="lesson-layout">
      <div>
        <Stage
          note={
            ran && dropped
              ? "Both middle messages were lost. The dashboard still has the correct current pressure, but the QMS has no record that PART-102 was rejected."
              : ran
                ? "All messages arrived. Now drop the middle message to see why these consumers need different delivery contracts."
                : "Both publications are events on the wire. What matters is whether a newer value can safely replace an older one."
          }
          minHeight={530}
        >
          <svg className="flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line className="flow-line active" x1={STATE_SOURCE.x} y1={STATE_SOURCE.y} x2={BROKER.x} y2={BROKER.y} vectorEffect="non-scaling-stroke" />
            <line className="flow-line active" x1={EVENT_SOURCE.x} y1={EVENT_SOURCE.y} x2={BROKER.x} y2={BROKER.y} vectorEffect="non-scaling-stroke" />
            <line className="flow-line active" x1={BROKER.x} y1={BROKER.y} x2={STATE_CONSUMER.x} y2={STATE_CONSUMER.y} vectorEffect="non-scaling-stroke" />
            <line className="flow-line active" x1={BROKER.x} y1={BROKER.y} x2={EVENT_CONSUMER.x} y2={EVENT_CONSUMER.y} vectorEffect="non-scaling-stroke" />
          </svg>

          <div className="contract-lane-label state-label">
            <strong>Current State</strong>
            <span>What is true now?</span>
          </div>
          <div className="contract-lane-label event-label">
            <strong>Every Event</strong>
            <span>What happened?</span>
          </div>

          <Anchored pt={STATE_SOURCE}>
            <Node icon="◉" name="Tank Gateway" role="Pressure publisher" accent="cyan" style={{ width: 150 }} />
          </Anchored>
          <Anchored pt={EVENT_SOURCE}>
            <Node icon="✓" name="Line Quality" role="Reject publisher" accent="violet" style={{ width: 150 }} />
          </Anchored>
          <Anchored pt={BROKER}>
            <Broker active={running} />
          </Anchored>
          <Anchored pt={STATE_CONSUMER}>
            <Node
              icon="▦"
              name="Operations Dashboard"
              role="Current pressure"
              accent="cyan"
              value={stateValue == null ? "—" : `${stateValue} psi`}
              sub={ran && dropped ? "correct current value" : "latest value wins"}
              style={{ width: 176 }}
            />
          </Anchored>
          <Anchored pt={EVENT_CONSUMER}>
            <div className="every-event-consumer">
              <div className="node-name">Quality Management</div>
              <div className="node-role">Rejected parts received</div>
              <div className="event-receipts">
                {events.length ? events.map((part) => <span key={part}>{part}</span>) : <em>waiting…</em>}
                {missingEvent ? <span className="missing">{missingEvent} missing</span> : null}
              </div>
            </div>
          </Anchored>

          <div className="contract-example state-example">
            <span>Topic</span>
            <code>Enterprise/Site1/Mfg/Tank1/Pressure</code>
            <small>80 → 82 → 84 psi</small>
          </div>
          <div className="contract-example event-example">
            <span>Topic</span>
            <code>Enterprise/Site1/Mfg/Line1/PartRejected</code>
            <small>PART-101 → PART-102 → PART-103</small>
          </div>

          <AnimatePresence>
            {flyers.map((flyer) => (
              <Particle key={flyer.id} from={flyer.from} to={flyer.to} duration={flyer.duration} onDone={() => remove(flyer.id)}>
                <MsgToken label={flyer.label} tone={flyer.tone} />
              </Particle>
            ))}
          </AnimatePresence>
        </Stage>

        <ControlBar>
          <div className="control-row">
            <ControlGroup label="Compare consumer expectations">
              <Btn variant="primary" disabled={running} onClick={() => runComparison(false)}>Deliver all messages</Btn>
              <Btn variant="danger" disabled={running} onClick={() => runComparison(true)}>Drop the middle message</Btn>
            </ControlGroup>
            <Btn variant="ghost" sm disabled={running} onClick={reset}>Reset</Btn>
          </div>
        </ControlBar>
      </div>

      <div className="rail">
        <Prediction
          question="Both consumers miss their middle message but receive the final one. Which consumer can still be correct?"
          choices={[
            { id: "a", text: "Both consumers" },
            { id: "b", text: "Only the current-state dashboard", correct: true },
            { id: "c", text: "Neither consumer" },
          ]}
          reveal={
            <>
              <b>The current-state dashboard.</b> Its latest pressure is still correct. The QMS cannot
              reconstruct the missing rejected part from a later event.
            </>
          }
        />

        <Card title="Choose the contract">
          <div className="contract-comparison">
            <div>
              <strong>Current State</strong>
              <p>Newer values supersede older ones. Freshness and the latest known value matter most.</p>
              <small>Common consumers: HMIs, dashboards, current-status services.</small>
            </div>
            <div>
              <strong>Every Event</strong>
              <p>Each occurrence is independent. A later event cannot replace one that was lost.</p>
              <small>Common consumers: QMS, traceability, workflows, MES and inventory.</small>
            </div>
          </div>
        </Card>

        <InsightCard
          items={[
            "Every publication is technically an event on the wire.",
            "The consumer's required outcome determines the delivery contract.",
            "Current State asks whether the final value is correct.",
            "Every Event asks whether each occurrence was handled or recorded.",
            "The following lessons show how delivery behavior supports each contract.",
          ]}
        />
      </div>
    </div>
  );
}
