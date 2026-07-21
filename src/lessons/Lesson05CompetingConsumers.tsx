import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Anchored,
  Btn,
  Card,
  ControlBar,
  ControlGroup,
  InsightCard,
  MsgToken,
  Node,
  Particle,
  Prediction,
  Slider,
  Stage,
  StatPill,
} from "../components/kit";
import { useFlow, Pt } from "../components/useFlow";

type AnalysisMsg = { id: number; label: string };
type Worker = {
  id: number;
  name: string;
  speedMs: number;
  paused: boolean;
  busy: AnalysisMsg | null;
  busyStart: number;
  processed: number;
};

const QUEUE: Pt = { x: 17, y: 50 };
let windowId = 1;
let wkId = 1;
const ASSETS = ["PUMP-07", "MOTOR-12", "FAN-03", "COMP-02"];

function makeWindow(): AnalysisMsg {
  const id = windowId++;
  return { id, label: `${ASSETS[(id - 1) % ASSETS.length]} · W${String(id).padStart(2, "0")}` };
}

function makeWorker(name: string, speedMs: number): Worker {
  return { id: wkId++, name, speedMs, paused: false, busy: null, busyStart: 0, processed: 0 };
}

function workerPt(i: number, n: number): Pt {
  const y = n === 1 ? 50 : 16 + (i * (68 / (n - 1)));
  return { x: 80, y };
}

export default function Lesson05CompetingConsumers() {
  const { flyers, emit, remove } = useFlow();
  const [queue, setQueue] = useState<AnalysisMsg[]>(() =>
    Array.from({ length: 12 }, makeWindow),
  );
  const [workers, setWorkers] = useState<Worker[]>(() => [
    makeWorker("Analyzer A", 1200),
    makeWorker("Analyzer B", 1200),
    makeWorker("Analyzer C", 1600),
  ]);

  const queueRef = useRef(queue);
  const workersRef = useRef(workers);
  queueRef.current = queue;
  workersRef.current = workers;

  // scheduler — all computation from refs, side effects performed exactly once
  useEffect(() => {
    const iv = window.setInterval(() => {
      const now = Date.now();
      const ws = workersRef.current;
      const q = queueRef.current;
      const n = ws.length;
      const emits: { to: Pt; label: string }[] = [];
      let consumed = 0;
      const next = ws.map((w, i) => {
        let nw = w;
        if (nw.busy && now - nw.busyStart >= nw.speedMs) {
          nw = { ...nw, busy: null, processed: nw.processed + 1 };
        }
        if (!nw.busy && !nw.paused && consumed < q.length) {
          const msg = q[consumed];
          consumed++;
          emits.push({ to: workerPt(i, n), label: msg.label });
          nw = { ...nw, busy: msg, busyStart: now };
        }
        return nw;
      });
      const remaining = consumed > 0 ? q.slice(consumed) : q;
      workersRef.current = next;
      queueRef.current = remaining;
      setWorkers(next);
      if (consumed > 0) setQueue(remaining);
      emits.forEach((e) => emit({ from: QUEUE, to: e.to, tone: "green", label: e.label, duration: 0.7 }));
    }, 250);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const publish = (count: number) => {
    setQueue((q) => [
      ...q,
      ...Array.from({ length: count }, makeWindow),
    ]);
  };

  const addWorker = () => setWorkers((ws) => (ws.length >= 3 ? ws : [...ws, makeWorker(`Analyzer ${String.fromCharCode(65 + ws.length)}`, 1300)]));
  const removeWorker = () => setWorkers((ws) => ws.slice(0, -1));
  const togglePause = (id: number) => setWorkers((ws) => ws.map((w) => (w.id === id ? { ...w, paused: !w.paused } : w)));
  const setSpeed = (id: number, speedMs: number) => setWorkers((ws) => ws.map((w) => (w.id === id ? { ...w, speedMs } : w)));

  const totalProcessed = workers.reduce((a, w) => a + w.processed, 0);
  const n = workers.length;

  return (
    <div className="lesson-layout">
      <div>
        <Stage
          note="Each vibration window is delivered to exactly one analyzer. Faster analyzers naturally take a bigger share — the queue levels compute-intensive work across the pool."
          minHeight={520}
        >
          <svg className="flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            {workers.map((w, i) => {
              const p = workerPt(i, n);
              return (
                <line
                  key={w.id}
                  className={`flow-line ${w.paused ? "dead" : "active"}`}
                  x1={QUEUE.x}
                  y1={QUEUE.y}
                  x2={p.x}
                  y2={p.y}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          <Anchored pt={QUEUE}>
            <div className="queue" style={{ minWidth: 210 }}>
              <div className="queue-head">
                <span className="queue-name">Vibration Analysis Queue</span>
                <span className="queue-depth">{queue.length}</span>
              </div>
              <div className="queue-slots" style={{ maxHeight: 150, overflow: "hidden" }}>
                {queue.length === 0 ? (
                  <div className="queue-empty">empty</div>
                ) : (
                  queue.slice(0, 6).map((m) => (
                    <div className="queue-msg" key={m.id}>
                      <span>{m.label}</span>
                    </div>
                  ))
                )}
                {queue.length > 6 ? (
                  <div className="queue-empty">+{queue.length - 6} more…</div>
                ) : null}
              </div>
            </div>
          </Anchored>

          {workers.map((w, i) => (
            <Anchored pt={workerPt(i, n)} key={w.id}>
              <Node
                icon="∿"
                name={w.name}
                role={`${(w.speedMs / 1000).toFixed(1)} s/window`}
                accent={w.paused ? "slate" : w.busy ? "green" : "cyan"}
                value={w.busy ? w.busy.label : w.paused ? "paused" : "idle"}
                sub={`analyzed ${w.processed}`}
                lit={!!w.busy && !w.paused}
                offline={w.paused}
                badge={w.paused ? { text: "Paused", kind: "off" } : w.busy ? { text: "Analyzing", kind: "ok" } : undefined}
              />
            </Anchored>
          ))}

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
            <ControlGroup label="Publish vibration windows">
              <Btn variant="primary" onClick={() => publish(1)}>
                Add 1 window
              </Btn>
              <Btn onClick={() => publish(10)}>Add burst of 10</Btn>
              <Btn onClick={() => publish(20)}>Add burst of 20</Btn>
            </ControlGroup>
            <ControlGroup label="Analyzers (0–3)">
              <Btn onClick={addWorker} disabled={n >= 3}>
                + Add analyzer
              </Btn>
              <Btn onClick={removeWorker} disabled={n <= 0}>
                – Remove analyzer
              </Btn>
            </ControlGroup>
            <StatPill label="Total analyzed" value={totalProcessed} tone="green" />
          </div>
          <div className="control-row">
            <div className="inspector-speed-grid">
              {workers.map((w) => (
                <ControlGroup key={w.id} label={w.name}>
                  <Slider label="speed" value={w.speedMs} min={500} max={2600} step={100} unit="ms" onChange={(v) => setSpeed(w.id, v)} />
                  <Btn sm onClick={() => togglePause(w.id)}>{w.paused ? "Resume" : "Pause"}</Btn>
                </ControlGroup>
              ))}
            </div>
          </div>
        </ControlBar>
      </div>

      <div className="rail">
        <Prediction
          question="A backlog of vibration windows waits in one queue with three analyzers attached. Does every analyzer process every window?"
          choices={[
            { id: "a", text: "Yes — every analyzer processes every window" },
            { id: "b", text: "No — each window goes to one analyzer; work is divided", correct: true },
          ]}
          reveal={
            <>
              <b>Work is divided.</b> Consumers on the <em>same queue</em> compete: each window is
              delivered to exactly one analyzer. Add analyzers to raise throughput, or pause one —
              the others simply pick up the slack.
            </>
          }
        />

        <Card title="Scenario">
          <div className="prose">
            <p>
              A condition-monitoring gateway publishes short vibration windows from pumps, motors,
              fans, and compressors. A <strong>Vibration Analysis Queue</strong> holds the backlog
              while a pool of <strong>analysis workers</strong> performs FFT and anomaly scoring.
            </p>
            <p>
              Publish a burst and watch the analyzers pull different windows. Pause one — the rest
              keep going. Speed one up — it grabs a larger share.
            </p>
          </div>
        </Card>

        <InsightCard
          items={[
            "Consumers on the same queue compete for messages.",
            "Each vibration window is analyzed by exactly one worker.",
            "Independent windows can be processed in parallel when strict ordering is not required.",
            "Adding analyzers increases throughput without changing the publisher.",
            "The queue provides load leveling and workload distribution.",
          ]}
        />
      </div>
    </div>
  );
}
