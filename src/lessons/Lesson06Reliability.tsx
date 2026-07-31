import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  Slider,
  Stage,
  Toggle,
} from "../components/kit";
import { useFlow, Pt, Flyer } from "../components/useFlow";

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

function compactDeadReason(reason: string) {
  if (reason.startsWith("TTL")) return { label: "⏱ TTL", kind: "ttl" };
  if (reason.startsWith("Rejected")) return { label: "✕ Rejected", kind: "rejected" };
  const retries = reason.match(/\((\d+)\)/)?.[1] ?? "0";
  return { label: `${retries}/${retries}`, kind: "retry" };
}

const PUBLISHER: Pt = { x: 7, y: 42 };
const HUB: Pt = { x: 22, y: 42 };
const QUEUE: Pt = { x: 40, y: 42 };
const CONSUMER: Pt = { x: 64, y: 42 };
const DMQ: Pt = { x: 87, y: 42 };
const DB: Pt = { x: 64, y: 84 };
const DELIVERY_MS = 600;
const PROCESS_MS = 900;
let mId = 1;

export default function Lesson06Reliability() {
  const { flyers, emit, remove, clear: clearFlyers } = useFlow();
  const [maxRetries, setMaxRetries] = useState(3);
  const [retryDelay, setRetryDelay] = useState(2);
  const [ttlSec, setTtlSec] = useState(0);
  const [dmqEnabled, setDmqEnabled] = useState(true);
  const [processingOk, setProcessingOk] = useState(true);
  const [paused, setPaused] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [processingErrorVisible, setProcessingErrorVisible] = useState(false);

  const [queue, setQueue] = useState<Msg[]>([]);
  const [dmq, setDmq] = useState<Dead[]>([]);
  const [proc, setProc] = useState<{ id: number; arrivesAt: number; until: number; processingOk?: boolean } | null>(null);
  const [, forceTick] = useState(0);
  const timers = useRef<number[]>([]);
  const flowGeneration = useRef(0);
  const completedFlyers = useRef<Set<number>>(new Set());

  const refs = useRef({ maxRetries, retryDelay, ttlSec, dmqEnabled, processingOk, paused, queue, proc });
  refs.current = { maxRetries, retryDelay, ttlSec, dmqEnabled, processingOk, paused, queue, proc };

  const laterTimer = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const finishFlyer = (flyer: Flyer) => {
    if (completedFlyers.current.has(flyer.id)) return;
    completedFlyers.current.add(flyer.id);
    remove(flyer.id);
    const dead = flyer.meta?.dead as Dead | undefined;
    if (dead && flyer.meta?.generation === flowGeneration.current) setDmq((d) => [dead, ...d]);
    if (flyer.meta?.processingError && flyer.meta?.generation === flowGeneration.current) {
      setProcessingErrorVisible(true);
      laterTimer(650, () => setProcessingErrorVisible(false));
    }
  };

  const add = (kind: Kind, label: string) => {
    const now = Date.now();
    const message = { id: mId++, label, kind, deliveries: 0, bornAt: now, nextEligibleAt: now, ttlSec: refs.current.ttlSec };
    const activeGeneration = flowGeneration.current;
    emit({ from: PUBLISHER, to: HUB, tone: kind === "perm" ? "red" : "green", label, duration: 0.5 });
    laterTimer(520, () => {
      if (flowGeneration.current !== activeGeneration) return;
      emit({ from: HUB, to: QUEUE, tone: kind === "perm" ? "red" : "green", label, duration: 0.5 });
    });
    laterTimer(1040, () => {
      if (flowGeneration.current !== activeGeneration) return;
      setQueue((q) => [...q, message]);
    });
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
          expired.forEach((m) => emit({
            from: QUEUE,
            to: DMQ,
            tone: "amber",
            label: `${m.label} · expired`,
            duration: 0.8,
            meta: { dead: { id: m.id, label: m.label, reason: "TTL expired" } satisfies Dead, generation: flowGeneration.current },
          }));
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
            // malformed BOM update → reject straight to DMQ (no retries)
            finish((qq) => qq.filter((x) => x.id !== m.id));
            if (r.dmqEnabled) {
              emit({
                from: CONSUMER,
                to: DMQ,
                tone: "red",
                label: `${m.label} · rejected`,
                duration: 0.8,
                meta: { dead: { id: m.id, label: m.label, reason: "Rejected (malformed BOM update)" } satisfies Dead, generation: flowGeneration.current },
              });
            }
          } else if (r.proc.processingOk ?? r.processingOk) {
            // valid BOM update processed successfully → commit, ack, leave queue
            finish((qq) => qq.filter((x) => x.id !== m.id));
          } else {
            // valid BOM update hits a temporary processing error → nack/release for retry
            const deliveries = m.deliveries + 1;
            if (deliveries > r.maxRetries) {
              finish((qq) => qq.filter((x) => x.id !== m.id));
              if (r.dmqEnabled) {
                emit({
                  from: CONSUMER,
                  to: DMQ,
                  tone: "red",
                  label: `${m.label} · max retries`,
                  duration: 0.8,
                  meta: { dead: { id: m.id, label: m.label, reason: `Retries exhausted (${deliveries - 1})` } satisfies Dead, generation: flowGeneration.current },
                });
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
          const arrivesAt = now + DELIVERY_MS;
          const activeGeneration = flowGeneration.current;
          setProc({ id: next.id, arrivesAt, until: arrivesAt + PROCESS_MS });
          emit({ from: QUEUE, to: CONSUMER, tone: "green", label: next.label, duration: DELIVERY_MS / 1000 });
          // only a valid BOM update attempts the database write; an invalid payload never touches it
          if (next.kind === "ok") {
            laterTimer(DELIVERY_MS, () => {
              if (flowGeneration.current !== activeGeneration || refs.current.proc?.id !== next.id) return;
              const processingSucceeds = refs.current.processingOk;
              const activeProc = { ...refs.current.proc, processingOk: processingSucceeds };
              refs.current.proc = activeProc;
              setProc(activeProc);
              emit({
                from: CONSUMER,
                to: DB,
                tone: processingSucceeds ? "green" : "red",
                label: "apply update",
                duration: PROCESS_MS / 1000,
                meta: { processingError: !processingSucceeds, generation: activeGeneration },
              });
            });
          }
        }
      }
    }, 220);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // self-playing policy demos
  const clearMessages = () => {
    flowGeneration.current += 1;
    completedFlyers.current.clear();
    clearFlyers();
    setQueue([]);
    setProc(null);
    setDmq([]);
    setProcessingErrorVisible(false);
    refs.current.queue = [];
    refs.current.proc = null;
  };

  const beginDemo = (durationMs: number) => {
    setDemoActive(true);
    clearMessages();
    laterTimer(durationMs, () => setDemoActive(false));
  };
  const demoRetryRecover = () => {
    beginDemo(8500);
    setMaxRetries(5); setRetryDelay(2); setTtlSec(0); setDmqEnabled(true); setPaused(false); setProcessingOk(false);
    laterTimer(60, () => add("ok", `BOM-${1000 + mId}`));
    laterTimer(5200, () => setProcessingOk(true)); // temporary error clears → next retry succeeds
  };
  const demoRetryLimit = () => {
    beginDemo(12500);
    setMaxRetries(3); setRetryDelay(2); setTtlSec(0); setDmqEnabled(true); setPaused(false); setProcessingOk(false);
    laterTimer(60, () => add("ok", `BOM-${1000 + mId}`)); // DB stays down → exhausts retries → DMQ
  };
  const demoTtl = () => {
    beginDemo(9000);
    setMaxRetries(5); setRetryDelay(2); setTtlSec(8); setDmqEnabled(true); setPaused(true); setProcessingOk(true);
    laterTimer(60, () => add("ok", `BOM-${1000 + mId}`)); // paused → TTL counts down → expires
  };

  const now = Date.now();

  return (
    <div className="lesson-layout">
      <div>
        <Stage
          note="ERP publishes each BOM update through Solace into a durable queue. A temporary MES processing error triggers retries; a malformed update fails permanently. Whichever limit hits first — max retries, Time to Live (TTL), or a hard rejection — routes the message to the Dead Message Queue."
          minHeight={420}
        >
          <svg className="flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line className="flow-line active" x1={PUBLISHER.x} y1={PUBLISHER.y} x2={HUB.x} y2={HUB.y} vectorEffect="non-scaling-stroke" />
            <line className="flow-line active" x1={HUB.x} y1={HUB.y} x2={QUEUE.x} y2={QUEUE.y} vectorEffect="non-scaling-stroke" />
            <line className="flow-line active" x1={QUEUE.x} y1={QUEUE.y} x2={CONSUMER.x} y2={CONSUMER.y} vectorEffect="non-scaling-stroke" />
            <line className={`flow-line ${dmqEnabled ? "dead" : ""}`} x1={CONSUMER.x} y1={CONSUMER.y} x2={DMQ.x} y2={DMQ.y} vectorEffect="non-scaling-stroke" />
            <line className={`flow-line ${processingErrorVisible ? "dead" : "active"}`} x1={CONSUMER.x} y1={CONSUMER.y} x2={DB.x} y2={DB.y} vectorEffect="non-scaling-stroke" />
          </svg>

          <Anchored pt={PUBLISHER}>
            <Node
              icon="▣"
              name="ERP"
              role="BOM publisher"
              accent="green"
              style={{ width: 142, minWidth: 142, padding: "8px 10px" }}
            />
          </Anchored>

          <Anchored pt={HUB}>
            <Broker small active={flyers.some((f) => f.to.x === HUB.x && f.to.y === HUB.y)} />
          </Anchored>

          <Anchored pt={QUEUE}>
            <div className="queue reliability-queue" style={{ minWidth: 186 }}>
              <div className="queue-head">
                <span className="queue-name">BOM Updates</span>
                <span className="queue-depth">{queue.length}</span>
              </div>
              <div className="reliability-queue-body">
                <div className="qcells reliability-queue-meter" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="qcell" style={i < Math.min(queue.length, 5) ? { background: "var(--green)", boxShadow: "0 0 6px var(--green)" } : undefined} />
                  ))}
                </div>
                <div className="queue-slots" style={{ height: 208, overflowY: "auto" }}>
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
                              {m.deliveries > 0 ? <span className="ttl retry">⟳{m.deliveries}/{maxRetries}</span> : null}
                              {ttlLeft != null ? <span className="ttl">⏱{ttlLeft.toFixed(0)}s</span> : null}
                            </span>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </Anchored>

          <Anchored pt={CONSUMER}>
            <Node
              icon="◉"
              name="MES"
              role="Consumer"
              accent={paused ? "slate" : proc ? "green" : "cyan"}
              value={proc ? (now < proc.arrivesAt ? "receiving…" : "processing…") : paused ? "paused" : "idle"}
              sub={processingErrorVisible ? "temporary processing error" : "processing ready"}
              lit={!!proc}
              offline={paused}
              badge={paused ? { text: "Paused", kind: "off" } : undefined}
              style={{ width: 196, height: 148, boxSizing: "border-box" }}
            />
          </Anchored>

          <Anchored pt={DB}>
            <Node icon="▤" name="MES Database" role="System of record" accent={processingErrorVisible ? "red" : "green"} badge={processingErrorVisible ? { text: "Error", kind: "err" } : { text: "Ready", kind: "ok" }} />
          </Anchored>

          <Anchored pt={DMQ}>
            <div className="queue reliability-queue reliability-queue-dmq" style={{ width: 220, minWidth: 220 }}>
              <div className="queue-head">
                <span className="queue-name" style={{ color: "var(--red)" }}>Dead Message Queue</span>
                <span className="queue-depth" style={{ color: "var(--red)", background: "rgba(239,90,106,0.12)" }}>{dmq.length}</span>
              </div>
              <div className="reliability-queue-body">
                <div className="qcells reliability-queue-meter" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="qcell" style={i < Math.min(dmq.length, 5) ? { background: "var(--red)", boxShadow: "0 0 6px var(--red)" } : undefined} />
                  ))}
                </div>
                <div className="queue-slots" style={{ height: 208, overflowY: "auto" }}>
                  {!dmqEnabled ? (
                    <div className="queue-empty">DMQ disabled</div>
                  ) : dmq.length === 0 ? (
                    <div className="queue-empty">empty</div>
                  ) : (
                    dmq.map((d) => {
                      const marker = compactDeadReason(d.reason);
                      return (
                        <div className="queue-msg" key={d.id} title={d.reason}>
                          <span>{d.label}</span>
                          <span className={`dmq-reason dmq-reason-${marker.kind}`}>{marker.label}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </Anchored>

          <AnimatePresence>
            {flyers.map((f) => (
              <Particle key={f.id} from={f.from} to={f.to} duration={f.duration} onDone={() => finishFlyer(f)}>
                <MsgToken label={f.label} tone={f.tone} />
              </Particle>
            ))}
          </AnimatePresence>
        </Stage>

        <div className="control-stack">
        <ControlBar>
          <div className="control-row">
            <ControlGroup label="ERP publisher">
              <Btn variant="primary" disabled={demoActive} onClick={() => add("ok", `BOM-${1000 + mId}`)}>Publish valid BOM update</Btn>
              <Btn variant="danger" disabled={demoActive} onClick={() => {
                setPaused(false);
                add("perm", `BOM-${1000 + mId}·bad`);
              }}>Publish invalid payload</Btn>
            </ControlGroup>
          </div>
          <div className="control-row">
            <ControlGroup label="Policies">
              <Slider disabled={demoActive} label="Max retries" value={maxRetries} min={0} max={10} onChange={setMaxRetries} />
              <Slider disabled={demoActive} label="Retry delay" value={retryDelay} min={1} max={6} unit="s" onChange={setRetryDelay} />
              <Slider disabled={demoActive} label="Time to Live (TTL, 0 = off)" value={ttlSec} min={0} max={20} unit="s" onChange={setTtlSec} />
              <Toggle disabled={demoActive} checked={dmqEnabled} onChange={setDmqEnabled} label="Dead Message Queue" />
            </ControlGroup>
          </div>
          <div className="control-row">
            <ControlGroup label="Environment">
              <Toggle disabled={demoActive} checked={processingOk} onChange={setProcessingOk} label="Processing succeeds" />
              <Toggle disabled={demoActive} checked={!paused} onChange={(v) => setPaused(!v)} label="Consumer running" />
            </ControlGroup>
          </div>
          <div className="control-row">
            <ControlGroup label="Guided policy demos">
              <Btn disabled={demoActive} onClick={demoRetryRecover}>▶ Retry, then recover</Btn>
              <Btn disabled={demoActive} onClick={demoRetryLimit}>▶ Retry limit → DMQ</Btn>
              <Btn disabled={demoActive} onClick={demoTtl}>▶ TTL expiry</Btn>
            </ControlGroup>
            <Btn variant="ghost" sm disabled={demoActive} onClick={clearMessages}>Clear all</Btn>
          </div>
        </ControlBar>

        <Card title="Try this">
          <div className="prose" style={{ fontSize: 13 }}>
            <p><b style={{ color: "var(--green-bright)" }}>Valid + processing succeeds</b> → applies the update and acknowledges.</p>
            <p><b style={{ color: "var(--green-bright)" }}>Valid + processing error</b> → temporary failure; retries with a delay, then succeeds once processing recovers.</p>
            <p><b style={{ color: "var(--green-bright)" }}>Invalid</b> → permanent failure; rejected straight to the DMQ, no retries.</p>
            <p><b style={{ color: "var(--green-bright)" }}>Time to Live (TTL)</b> → sets how long a queued message remains eligible for delivery. When it expires, the broker removes it from the work queue and routes it to the DMQ when one is configured.</p>
          </div>
        </Card>
        </div>
      </div>

      <div className="rail">
        <Card title="Scenario">
          <div className="prose">
            <p>
              ERP BOM updates wait in a durable queue for the MES. Temporary processing errors,
              permanent payload errors, retry limits, and expiration determine whether each update
              succeeds or moves to the dead message queue.
            </p>
          </div>
        </Card>

        <InsightCard
          items={[
            "Temporary failures may justify retry.",
            "Permanent failures should be isolated, not retried indefinitely.",
            "Time to Live (TTL) limits how long a queued message remains eligible for delivery.",
            "Retry limits stop a poison message from blocking the queue.",
            "A DMQ makes failed messages visible and recoverable.",
            "Broker-managed policies reduce custom reliability code in every app.",
          ]}
        />
      </div>
    </div>
  );
}
