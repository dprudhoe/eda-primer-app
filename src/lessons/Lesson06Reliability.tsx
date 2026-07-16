import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  Slider,
  Stage,
  Toggle,
} from "../components/kit";
import { useFlow, Pt } from "../components/useFlow";

type Kind = "ok" | "perm";
type Msg = {
  id: number;
  label: string;
  kind: Kind;
  deliveries: number;
  bornAt: number;
  nextEligibleAt: number;
  ttlSec: number;
};
type Dead = { id: number; label: string; reason: string };

const QUEUE: Pt = { x: 17, y: 40 };
const CONSUMER: Pt = { x: 52, y: 40 };
const DMQ: Pt = { x: 84, y: 40 };
const DB: Pt = { x: 52, y: 84 };
const PROCESS_MS = 900;
let mId = 1;

export default function Lesson06Reliability() {
  const { flyers, emit, remove } = useFlow();
  const [maxRetries, setMaxRetries] = useState(3);
  const [retryDelay, setRetryDelay] = useState(2);
  const [ttlSec, setTtlSec] = useState(0);
  const [dmqEnabled, setDmqEnabled] = useState(true);
  const [dbUp, setDbUp] = useState(true);
  const [paused, setPaused] = useState(false);
  const [demoActive, setDemoActive] = useState(false);

  const [queue, setQueue] = useState<Msg[]>([]);
  const [dmq, setDmq] = useState<Dead[]>([]);
  const [proc, setProc] = useState<{ id: number; until: number } | null>(null);
  const [, forceTick] = useState(0);
  const timers = useRef<number[]>([]);

  const refs = useRef({ maxRetries, retryDelay, ttlSec, dmqEnabled, dbUp, paused, queue, proc });
  refs.current = { maxRetries, retryDelay, ttlSec, dmqEnabled, dbUp, paused, queue, proc };

  const laterTimer = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const add = (kind: Kind, label: string) => {
    const now = Date.now();
    setQueue((q) => [
      ...q,
      { id: mId++, label, kind, deliveries: 0, bornAt: now, nextEligibleAt: now, ttlSec: refs.current.ttlSec },
    ]);
  };

  useEffect(() => {
    const iv = window.setInterval(() => {
      forceTick((n) => n + 1);
      const now = Date.now();
      const r = refs.current;

      // 1. TTL expiry
      let q = r.queue;
      const expired: Msg[] = [];
      q = q.filter((m) => {
        if (m.ttlSec > 0 && (now - m.bornAt) / 1000 >= m.ttlSec && r.proc?.id !== m.id) {
          expired.push(m);
          return false;
        }
        return true;
      });
      if (expired.length) {
        if (r.dmqEnabled) {
          setDmq((d) => [...expired.map((m) => ({ id: m.id, label: m.label, reason: "TTL expired" })), ...d]);
          expired.forEach((m) => emit({ from: QUEUE, to: DMQ, tone: "amber", label: `${m.label} · expired`, duration: 0.8 }));
        }
        setQueue(q);
        refs.current.queue = q;
      }

      // 2. completion of current processing
      if (r.proc && now >= r.proc.until) {
        const m = r.queue.find((x) => x.id === r.proc!.id);
        setProc(null);
        if (m) {
          const finish = (fn: (qq: Msg[]) => Msg[]) => {
            const nq = fn(r.queue);
            setQueue(nq);
            refs.current.queue = nq;
          };
          if (m.kind === "perm") {
            // invalid order → reject straight to DMQ (no retries)
            finish((qq) => qq.filter((x) => x.id !== m.id));
            if (r.dmqEnabled) {
              setDmq((d) => [{ id: m.id, label: m.label, reason: "Rejected (invalid product id)" }, ...d]);
              emit({ from: CONSUMER, to: DMQ, tone: "red", label: `${m.label} · rejected`, duration: 0.8 });
            }
          } else if (r.dbUp) {
            // valid order + database available → commit, ack, leave queue
            finish((qq) => qq.filter((x) => x.id !== m.id));
          } else {
            // valid order but database down → temporary failure, nack/release for retry
            const deliveries = m.deliveries + 1;
            if (deliveries > r.maxRetries) {
              finish((qq) => qq.filter((x) => x.id !== m.id));
              if (r.dmqEnabled) {
                setDmq((d) => [{ id: m.id, label: m.label, reason: `Retries exhausted (${deliveries - 1})` }, ...d]);
                emit({ from: CONSUMER, to: DMQ, tone: "red", label: `${m.label} · max retries`, duration: 0.8 });
              }
            } else {
              finish((qq) =>
                qq.map((x) => (x.id === m.id ? { ...x, deliveries, nextEligibleAt: now + r.retryDelay * 1000 } : x)),
              );
              emit({ from: CONSUMER, to: QUEUE, tone: "amber", label: `${m.label} · released`, duration: 0.8 });
            }
          }
        }
        return;
      }

      // 3. start processing next eligible message
      if (!r.paused && !r.proc) {
        const next = r.queue.find((m) => m.nextEligibleAt <= now);
        if (next) {
          setProc({ id: next.id, until: now + PROCESS_MS });
          emit({ from: QUEUE, to: CONSUMER, tone: "green", label: next.label, duration: 0.6 });
          // only a valid order attempts the database write; an invalid payload never touches it
          if (next.kind === "ok") {
            emit({ from: CONSUMER, to: DB, tone: r.dbUp ? "green" : "red", label: "commit", duration: 0.9 });
          }
        }
      }
    }, 220);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // self-playing policy demos
  const beginDemo = (durationMs: number) => {
    setDemoActive(true);
    setDmq([]);
    setQueue([]);
    setProc(null);
    laterTimer(durationMs, () => setDemoActive(false));
  };
  const demoRetryRecover = () => {
    beginDemo(8500);
    setMaxRetries(5); setRetryDelay(2); setTtlSec(0); setDmqEnabled(true); setPaused(false); setDbUp(false);
    laterTimer(60, () => add("ok", `WO-${1000 + mId}`));
    laterTimer(5200, () => setDbUp(true)); // database comes back → next retry succeeds
  };
  const demoRetryLimit = () => {
    beginDemo(12500);
    setMaxRetries(3); setRetryDelay(2); setTtlSec(0); setDmqEnabled(true); setPaused(false); setDbUp(false);
    laterTimer(60, () => add("ok", `WO-${1000 + mId}`)); // DB stays down → exhausts retries → DMQ
  };
  const demoTtl = () => {
    beginDemo(9000);
    setMaxRetries(5); setRetryDelay(2); setTtlSec(8); setDmqEnabled(true); setPaused(true); setDbUp(true);
    laterTimer(60, () => add("ok", `WO-${1000 + mId}`)); // paused → TTL counts down → expires
  };

  const now = Date.now();

  return (
    <div className="lesson-layout">
      <div>
        <Stage
          note="A valid order needs the database. When the database is down it becomes a temporary failure and retries; an invalid order fails permanently. Whichever limit hits first — max retries, TTL, or a hard rejection — routes the message to the Dead Message Queue."
          minHeight={420}
        >
          <svg className="flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line className="flow-line active" x1={QUEUE.x} y1={QUEUE.y} x2={CONSUMER.x} y2={CONSUMER.y} vectorEffect="non-scaling-stroke" />
            <line className={`flow-line ${dmqEnabled ? "dead" : ""}`} x1={CONSUMER.x} y1={CONSUMER.y} x2={DMQ.x} y2={DMQ.y} vectorEffect="non-scaling-stroke" />
            <line className={`flow-line ${dbUp ? "active" : "dead"}`} x1={CONSUMER.x} y1={CONSUMER.y} x2={DB.x} y2={DB.y} vectorEffect="non-scaling-stroke" />
          </svg>

          <Anchored pt={QUEUE}>
            <div className="queue" style={{ minWidth: 186 }}>
              <div className="queue-head">
                <span className="queue-name">Work Queue</span>
                <span className="queue-depth">{queue.length}</span>
              </div>
              <div className="queue-slots" style={{ height: 168, overflowY: "auto" }}>
                <AnimatePresence initial={false}>
                  {queue.length === 0 ? (
                    <div className="queue-empty" key="e">empty</div>
                  ) : (
                    queue.map((m) => {
                      const ttlLeft = m.ttlSec > 0 ? Math.max(0, m.ttlSec - (now - m.bornAt) / 1000) : null;
                      const waiting = m.nextEligibleAt > now;
                      return (
                        <motion.div
                          key={m.id}
                          layout
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: proc?.id === m.id ? 1 : waiting ? 0.55 : 1, y: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="queue-msg"
                          style={{ borderColor: m.kind === "perm" ? "rgba(239,90,106,0.5)" : undefined }}
                        >
                          <span>{m.label}</span>
                          <span style={{ display: "flex", gap: 6 }}>
                            {m.deliveries > 0 ? <span className="ttl" style={{ color: "var(--red)" }}>⟳{m.deliveries}/{maxRetries}</span> : null}
                            {ttlLeft != null ? <span className="ttl">⏱{ttlLeft.toFixed(0)}s</span> : null}
                          </span>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </Anchored>

          <Anchored pt={CONSUMER}>
            <Node
              icon="◉"
              name="Line Execution System"
              role="Consumer"
              accent={paused ? "slate" : proc ? "green" : "cyan"}
              value={proc ? "processing…" : paused ? "paused" : "idle"}
              sub={dbUp ? "database online" : "database offline"}
              lit={!!proc}
              offline={paused}
              badge={paused ? { text: "Paused", kind: "off" } : undefined}
            />
          </Anchored>

          <Anchored pt={DB}>
            <Node icon="▤" name="Database" role="System of record" accent={dbUp ? "green" : "red"} offline={!dbUp} badge={dbUp ? { text: "Online", kind: "ok" } : { text: "Offline", kind: "err" }} />
          </Anchored>

          <Anchored pt={DMQ}>
            <div className="queue" style={{ minWidth: 176, borderColor: "rgba(239,90,106,0.4)" }}>
              <div className="queue-head">
                <span className="queue-name" style={{ color: "var(--red)" }}>Dead Message Queue</span>
                <span className="queue-depth" style={{ color: "var(--red)", background: "rgba(239,90,106,0.12)" }}>{dmq.length}</span>
              </div>
              <div className="queue-slots" style={{ height: 168, overflowY: "auto" }}>
                {!dmqEnabled ? (
                  <div className="queue-empty">DMQ disabled</div>
                ) : dmq.length === 0 ? (
                  <div className="queue-empty">empty</div>
                ) : (
                  dmq.map((d) => (
                    <div className="queue-msg" key={d.id} style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                      <span>{d.label}</span>
                      <span style={{ fontSize: 9.5, color: "var(--red)" }}>{d.reason}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
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
              <Btn variant="primary" disabled={demoActive} onClick={() => add("ok", `WO-${1000 + mId}`)}>Publish valid work order</Btn>
              <Btn variant="danger" disabled={demoActive} onClick={() => add("perm", `PAYLOAD-${1000 + mId}·bad`)}>Publish invalid payload</Btn>
            </ControlGroup>
          </div>
          <div className="control-row">
            <ControlGroup label="Policies">
              <Slider disabled={demoActive} label="Max retries" value={maxRetries} min={0} max={10} onChange={setMaxRetries} />
              <Slider disabled={demoActive} label="Retry delay" value={retryDelay} min={1} max={6} unit="s" onChange={setRetryDelay} />
              <Slider disabled={demoActive} label="TTL (0 = off)" value={ttlSec} min={0} max={20} unit="s" onChange={setTtlSec} />
              <Toggle disabled={demoActive} checked={dmqEnabled} onChange={setDmqEnabled} label="Dead Message Queue" />
            </ControlGroup>
          </div>
          <div className="control-row">
            <ControlGroup label="Environment">
              <Toggle disabled={demoActive} checked={dbUp} onChange={setDbUp} label="Database online" />
              <Toggle disabled={demoActive} checked={!paused} onChange={(v) => setPaused(!v)} label="Consumer running" />
            </ControlGroup>
          </div>
          <div className="control-row">
            <ControlGroup label="Guided policy demos">
              <Btn disabled={demoActive} onClick={demoRetryRecover}>▶ Retry, then recover</Btn>
              <Btn disabled={demoActive} onClick={demoRetryLimit}>▶ Retry limit → DMQ</Btn>
              <Btn disabled={demoActive} onClick={demoTtl}>▶ TTL expiry</Btn>
            </ControlGroup>
            <Btn variant="ghost" sm disabled={demoActive} onClick={() => { setQueue([]); setProc(null); setDmq([]); }}>Clear all</Btn>
          </div>
        </ControlBar>
      </div>

      <div className="rail">
        <Card title="How to read it">
          <div className="prose" style={{ fontSize: 13 }}>
            <p><b style={{ color: "var(--green-bright)" }}>Valid + DB online</b> → commits and acknowledges.</p>
            <p><b style={{ color: "var(--green-bright)" }}>Valid + DB offline</b> → temporary failure; retries with a delay, then succeeds once the DB is back.</p>
            <p><b style={{ color: "var(--green-bright)" }}>Invalid</b> → permanent failure; rejected straight to the DMQ, no retries.</p>
            <p><b style={{ color: "var(--green-bright)" }}>TTL</b> → caps how long a message stays useful, regardless of retries left.</p>
          </div>
        </Card>

        <InsightCard
          items={[
            "Temporary failures may justify retry.",
            "Permanent failures should be isolated, not retried indefinitely.",
            "TTL limits how long an event stays useful.",
            "Retry limits stop a poison message from blocking the queue.",
            "A DMQ makes failed messages visible and recoverable.",
            "Broker-managed policies reduce custom reliability code in every app.",
          ]}
        />
      </div>
    </div>
  );
}
