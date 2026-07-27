import { ReactNode, useEffect, useRef, useState } from "react";
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
  Particle,
  QueueChip,
  Stage,
  Toggle,
} from "../components/kit";
import { Pt, useFlow } from "../components/useFlow";

type ClientProps = {
  pt: Pt;
  name: string;
  detail: string;
  protocol: string;
  tone?: "green" | "cyan" | "blue" | "violet" | "amber";
  enabled?: boolean;
  onClick?: () => void;
  children?: ReactNode;
};

function Client({ pt, name, detail, protocol, tone = "green", enabled = true, onClick, children }: ClientProps) {
  return (
    <Anchored pt={pt} zIndex={3}>
      <button
        type="button"
        className={`ecosystem-client ecosystem-${tone} ${enabled ? "" : "offline"} ${onClick ? "interactive" : ""}`}
        onClick={onClick}
        aria-pressed={enabled}
        title={onClick ? `Click to ${enabled ? "disable" : "enable"} ${name}` : undefined}
      >
        <div className="ecosystem-client-name">{name}</div>
        <div className="ecosystem-client-detail">{detail}</div>
        <span className="ecosystem-protocol">{protocol}</span>
        {children}
      </button>
    </Anchored>
  );
}

function QueueAt({
  pt,
  label,
  depth = 2,
  tone = "green",
}: {
  pt: Pt;
  label: string;
  depth?: number;
  tone?: "green" | "blue" | "violet" | "amber";
}) {
  return (
    <Anchored pt={pt} zIndex={4}>
      <QueueChip depth={depth} cap={3} label={label} tone={tone} />
    </Anchored>
  );
}

const F: Pt = { x: 50, y: 59 };
const H: Pt = { x: 60, y: 43 };
const A: Pt = { x: 40, y: 43 };

const PLC: Pt = { x: 31, y: 76 };
const CAMERA: Pt = { x: 31, y: 90 };
const HMI: Pt = { x: 50, y: 86 };
const MES: Pt = { x: 69, y: 76 };
const ANALYZERS: Pt = { x: 69, y: 90 };
const RETAINED: Pt = { x: 39, y: 61 };
const ORDER_QUEUE: Pt = { x: 62, y: 68 };
const ANALYSIS_QUEUE: Pt = { x: 62, y: 84 };

const ERP: Pt = { x: 73, y: 10 };
const QMS: Pt = { x: 92, y: 10 };
const HISTORIAN: Pt = { x: 92, y: 25 };
const ENTERPRISE_API: Pt = { x: 92, y: 40 };
const QUALITY_QUEUE: Pt = { x: 84, y: 15 };
const HISTORY_QUEUE: Pt = { x: 84, y: 27 };
const RDP_QUEUE: Pt = { x: 84, y: 38 };
const DMQ: Pt = { x: 61, y: 27 };

const AI: Pt = { x: 7, y: 12 };
const ANALYTICS: Pt = { x: 26, y: 12 };
const CLOUD_API: Pt = { x: 7, y: 36 };
const AI_QUEUE: Pt = { x: 15, y: 20 };
const ANALYTICS_QUEUE: Pt = { x: 32, y: 21 };
const CLOUD_RDP: Pt = { x: 16, y: 35 };

type ConsumerId = "hmi" | "mes" | "analyzers" | "qms" | "historian" | "enterprise" | "ai" | "analytics" | "cloudApi";
type QueueId = "orders" | "analysis" | "quality" | "history" | "rdp" | "ai" | "analytics" | "cloudRdp";
type LinkId = "fh" | "fa" | "ha";
type Tone = "green" | "amber" | "red" | "violet";
type QueuedDelivery = { to: Pt; label: string; tone: Tone; onDelivered?: () => void };
type BufferedLinkDelivery = { from: Pt; to: Pt; label: string; tone: Tone; onArrive: () => void };

const QUEUE_CONSUMER: Record<QueueId, ConsumerId> = {
  orders: "mes",
  analysis: "analyzers",
  quality: "qms",
  history: "historian",
  rdp: "enterprise",
  ai: "ai",
  analytics: "analytics",
  cloudRdp: "cloudApi",
};
const QUEUE_POINTS: Record<QueueId, Pt> = {
  orders: ORDER_QUEUE,
  analysis: ANALYSIS_QUEUE,
  quality: QUALITY_QUEUE,
  history: HISTORY_QUEUE,
  rdp: RDP_QUEUE,
  ai: AI_QUEUE,
  analytics: ANALYTICS_QUEUE,
  cloudRdp: CLOUD_RDP,
};
const QUEUE_SOURCES: Record<QueueId, Pt> = {
  orders: F,
  analysis: F,
  quality: H,
  history: H,
  rdp: H,
  ai: A,
  analytics: A,
  cloudRdp: A,
};

export default function Lesson10Ecosystem() {
  const { flyers, emit, remove, clear } = useFlow();
  const [streams, setStreams] = useState({
    telemetry: true,
    workOrders: true,
    inspection: true,
  });
  const [consumers, setConsumers] = useState<Record<ConsumerId, boolean>>({
    hmi: true,
    mes: true,
    analyzers: true,
    qms: true,
    historian: true,
    enterprise: true,
    ai: true,
    analytics: true,
    cloudApi: true,
  });
  const [links, setLinks] = useState<Record<LinkId, boolean>>({ fh: true, fa: true, ha: true });
  const [queueDepths, setQueueDepths] = useState<Record<QueueId, number>>({
    orders: 0,
    analysis: 0,
    quality: 0,
    history: 0,
    rdp: 0,
    ai: 0,
    analytics: 0,
    cloudRdp: 0,
  });
  const [linkDepths, setLinkDepths] = useState<Record<LinkId, number>>({ fh: 0, fa: 0, ha: 0 });
  const [telemetryValue, setTelemetryValue] = useState(72.4);
  const [retainedValue, setRetainedValue] = useState(72.4);
  const [hmiValue, setHmiValue] = useState<number | null>(72.4);
  const timers = useRef<number[]>([]);
  const sequence = useRef({ telemetry: 0, workOrder: 0, inspection: 0 });
  const telemetryValueRef = useRef(72.4);
  const retainedValueRef = useRef(72.4);
  const retainedSequenceRef = useRef(0);
  const hmiSequenceRef = useRef(0);
  const consumersRef = useRef(consumers);
  const linksRef = useRef(links);
  const queueJobs = useRef<Record<QueueId, QueuedDelivery[]>>({
    orders: [], analysis: [], quality: [], history: [], rdp: [], ai: [], analytics: [], cloudRdp: [],
  });
  const queueDraining = useRef<Record<QueueId, boolean>>({
    orders: false, analysis: false, quality: false, history: false, rdp: false, ai: false, analytics: false, cloudRdp: false,
  });
  const linkJobs = useRef<Record<LinkId, BufferedLinkDelivery[]>>({ fh: [], fa: [], ha: [] });
  const linkDraining = useRef<Record<LinkId, boolean>>({ fh: false, fa: false, ha: false });
  consumersRef.current = consumers;
  linksRef.current = links;
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const hop = (
    delay: number,
    from: Pt,
    to: Pt,
    label: string,
    tone: Tone = "green",
  ) => later(delay, () => emit({ from, to, label, tone, duration: 0.75 }));

  const drainQueue = (id: QueueId) => {
    if (queueDraining.current[id] || !consumersRef.current[QUEUE_CONSUMER[id]] || queueJobs.current[id].length === 0) return;
    queueDraining.current[id] = true;
    const job = queueJobs.current[id].shift()!;
    setQueueDepths((depths) => ({ ...depths, [id]: Math.max(0, depths[id] - 1) }));
    emit({ from: QUEUE_POINTS[id], to: job.to, label: job.label, tone: job.tone, duration: 0.75 });
    later(780, () => job.onDelivered?.());
    later(900, () => {
      queueDraining.current[id] = false;
      drainQueue(id);
    });
  };

  const enqueue = (id: QueueId, delivery: QueuedDelivery) => {
    emit({
      from: QUEUE_SOURCES[id],
      to: QUEUE_POINTS[id],
      label: "queued",
      tone: delivery.tone,
      duration: 0.75,
    });
    later(780, () => {
      queueJobs.current[id].push(delivery);
      setQueueDepths((depths) => ({ ...depths, [id]: depths[id] + 1 }));
      later(350, () => drainQueue(id));
    });
  };

  const drainLink = (id: LinkId) => {
    if (linkDraining.current[id] || !linksRef.current[id] || linkJobs.current[id].length === 0) return;
    linkDraining.current[id] = true;
    const job = linkJobs.current[id].shift()!;
    setLinkDepths((depths) => ({ ...depths, [id]: Math.max(0, depths[id] - 1) }));
    emit({ from: job.from, to: job.to, label: job.label, tone: job.tone, duration: 1.0 });
    later(1020, job.onArrive);
    later(1120, () => {
      linkDraining.current[id] = false;
      drainLink(id);
    });
  };

  const sendAcross = (id: LinkId, job: BufferedLinkDelivery) => {
    if (linksRef.current[id]) {
      emit({ from: job.from, to: job.to, label: job.label, tone: job.tone, duration: 1.0 });
      later(1020, job.onArrive);
      return;
    }
    linkJobs.current[id].push(job);
    setLinkDepths((depths) => ({ ...depths, [id]: depths[id] + 1 }));
  };

  const toggleLink = (id: LinkId) => {
    const next = !linksRef.current[id];
    linksRef.current = { ...linksRef.current, [id]: next };
    setLinks(linksRef.current);
    if (next) later(80, () => drainLink(id));
  };

  const toggleConsumer = (id: ConsumerId) => {
    const next = !consumersRef.current[id];
    consumersRef.current = { ...consumersRef.current, [id]: next };
    setConsumers(consumersRef.current);
    if (next) {
      if (id === "hmi") {
        const retained = retainedValueRef.current;
        const retainedSequence = retainedSequenceRef.current;
        const reading = `${retained.toFixed(1)} °C`;
        emit({ from: RETAINED, to: F, label: `${reading} · retained`, tone: "amber", duration: 0.65 });
        later(680, () => emit({ from: F, to: HMI, label: reading, tone: "green", duration: 0.75 }));
        later(1450, () => {
          if (retainedSequence < hmiSequenceRef.current) return;
          hmiSequenceRef.current = retainedSequence;
          setHmiValue(retained);
        });
      }
      (Object.keys(QUEUE_CONSUMER) as QueueId[])
        .filter((queue) => QUEUE_CONSUMER[queue] === id)
        .forEach((queue) => later(80, () => drainQueue(queue)));
    }
  };

  const clearInFlight = () => {
    clear();
  };

  const publishTelemetry = () => {
    const telemetrySequence = ++sequence.current.telemetry;
    const previous = telemetryValueRef.current;
    const direction = previous >= 73.2 ? -1 : previous <= 71.6 ? 1 : Math.random() < 0.5 ? -1 : 1;
    const change = Math.random() < 0.55 ? 0.1 : 0.2;
    const next = Math.round((previous + direction * change) * 10) / 10;
    const reading = `${next.toFixed(1)} °C`;
    telemetryValueRef.current = next;
    setTelemetryValue(next);

    hop(0, PLC, F, reading);
    if (consumersRef.current.hmi) {
      hop(750, F, HMI, reading);
      later(1520, () => {
        if (telemetrySequence < hmiSequenceRef.current) return;
        hmiSequenceRef.current = telemetrySequence;
        setHmiValue(next);
      });
    }
    hop(750, F, RETAINED, reading, "amber");
    later(1520, () => {
      retainedSequenceRef.current = telemetrySequence;
      retainedValueRef.current = next;
      setRetainedValue(next);
    });
    later(750, () => sendAcross("fh", {
      from: F,
      to: H,
      label: "telemetry",
      tone: "green",
      onArrive: () => enqueue("history", { to: HISTORIAN, label: "store", tone: "green" }),
    }));
  };

  const publishWorkOrder = () => {
    const id = `WO-${String(++sequence.current.workOrder).padStart(2, "0")}`;
    hop(0, ERP, H, id);
    later(750, () => {
      sendAcross("fh", {
        from: H,
        to: F,
        label: `${id} · MES`,
        tone: "green",
        onArrive: () => enqueue("orders", { to: MES, label: "deliver", tone: "green" }),
      });
      enqueue("rdp", { to: ENTERPRISE_API, label: "HTTP POST", tone: "green" });
    });
  };

  const publishInspection = () => {
    const id = `INS-${String(++sequence.current.inspection).padStart(2, "0")}`;
    hop(0, CAMERA, F, id);
    later(750, () => sendAcross("fa", {
      from: F,
      to: A,
      label: "InspectionRequested",
      tone: "violet",
      onArrive: () => enqueue("ai", {
        to: AI,
        label: "infer",
        tone: "violet",
        onDelivered: () => {
          hop(0, AI, A, "InspectionResult", "violet");
          later(800, () => {
            enqueue("analytics", { to: ANALYTICS, label: "deliver", tone: "violet" });
            sendAcross("fa", {
              from: A,
              to: F,
              label: "InspectionResult",
              tone: "violet",
              onArrive: () => {
                if (consumersRef.current.hmi) hop(0, F, HMI, "result", "violet");
              },
            });
            sendAcross("ha", {
              from: A,
              to: H,
              label: "InspectionResult",
              tone: "violet",
              onArrive: () => {
                enqueue("quality", { to: QMS, label: "deliver", tone: "violet" });
                enqueue("history", { to: HISTORIAN, label: "store", tone: "violet" });
              },
            });
          });
        },
      }),
    }));
  };

  useEffect(() => {
    if (!streams.telemetry) return;
    const kickoff = window.setTimeout(publishTelemetry, 0);
    const interval = window.setInterval(publishTelemetry, 3000);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams.telemetry]);

  useEffect(() => {
    if (!streams.inspection) return;
    const kickoff = window.setTimeout(publishInspection, 0);
    const interval = window.setInterval(publishInspection, 5000);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams.inspection]);

  useEffect(() => {
    if (!streams.workOrders) return;
    const kickoff = window.setTimeout(publishWorkOrder, 0);
    const interval = window.setInterval(publishWorkOrder, 10000);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams.workOrders]);

  const activeStreams = Object.values(streams).filter(Boolean).length;
  const bufferedLinks = Object.values(linkDepths).reduce((sum, depth) => sum + depth, 0);

  return (
    <div className="ecosystem-layout">
      <Stage
        minHeight={900}
        note={
          bufferedLinks > 0
            ? `${bufferedLinks} guaranteed event${bufferedLinks === 1 ? " is" : "s are"} buffered on unavailable mesh links. Reconnect a link to watch its queue drain.`
            : "Click a producer, consumer, or mesh link to change its availability. Queued consumers and mesh links buffer guaranteed events until delivery can resume."
        }
      >
        <div className="ecosystem-region factory"><span>Factory</span></div>
        <div className="ecosystem-region hq"><span>HQ Data Center</span></div>
        <div className="ecosystem-region aws"><span>AWS</span></div>

        <svg className="flow-svg ecosystem-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {/* Three peer brokers form the central mesh triangle. */}
          <line className={`mesh-link ${links.fh ? "" : "dead"}`} x1={F.x} y1={F.y} x2={H.x} y2={H.y} />
          <line className={`mesh-link ${links.fa ? "" : "dead"}`} x1={F.x} y1={F.y} x2={A.x} y2={A.y} />
          <line className={`mesh-link ${links.ha ? "" : "dead"}`} x1={H.x} y1={H.y} x2={A.x} y2={A.y} />

          {/* Factory-local paths */}
          <line className="flow-line active" x1={PLC.x} y1={PLC.y} x2={F.x} y2={F.y} />
          <line className="flow-line active" x1={CAMERA.x} y1={CAMERA.y} x2={F.x} y2={F.y} />
          <line className={`flow-line ${consumers.hmi ? "active direct" : "dead"}`} x1={F.x} y1={F.y} x2={HMI.x} y2={HMI.y} />
          <line className={`flow-line ${consumers.mes ? "active" : "dead"}`} x1={F.x} y1={F.y} x2={MES.x} y2={MES.y} />
          <line className={`flow-line ${consumers.analyzers ? "active" : "dead"}`} x1={F.x} y1={F.y} x2={ANALYZERS.x} y2={ANALYZERS.y} />
          <line className="retain-link" x1={F.x} y1={F.y} x2={RETAINED.x} y2={RETAINED.y} />

          {/* HQ-local paths */}
          <line className="flow-line active" x1={ERP.x} y1={ERP.y} x2={H.x} y2={H.y} />
          <line className={`flow-line ${consumers.qms ? "active" : "dead"}`} x1={H.x} y1={H.y} x2={QMS.x} y2={QMS.y} />
          <line className={`flow-line ${consumers.historian ? "active" : "dead"}`} x1={H.x} y1={H.y} x2={HISTORIAN.x} y2={HISTORIAN.y} />
          <line className={`flow-line ${consumers.enterprise ? "active" : "dead"}`} x1={H.x} y1={H.y} x2={ENTERPRISE_API.x} y2={ENTERPRISE_API.y} />
          <line className="dmq-link" x1={H.x} y1={H.y} x2={DMQ.x} y2={DMQ.y} />

          {/* AWS-local paths */}
          <line className={`flow-line ${consumers.ai ? "active" : "dead"}`} x1={A.x} y1={A.y} x2={AI.x} y2={AI.y} />
          <line className={`flow-line ${consumers.analytics ? "active" : "dead"}`} x1={A.x} y1={A.y} x2={ANALYTICS.x} y2={ANALYTICS.y} />
          <line className={`flow-line ${consumers.cloudApi ? "active" : "dead"}`} x1={A.x} y1={A.y} x2={CLOUD_API.x} y2={CLOUD_API.y} />
        </svg>

        <button className={`mesh-caption mesh-caption-fh ${links.fh ? "" : "dead"}`} onClick={() => toggleLink("fh")}>Factory ↔ HQ · {links.fh ? "up" : "down"}</button>
        <button className={`mesh-caption mesh-caption-fa ${links.fa ? "" : "dead"}`} onClick={() => toggleLink("fa")}>Factory ↔ AWS · {links.fa ? "up" : "down"}</button>
        <button className={`mesh-caption mesh-caption-ha ${links.ha ? "" : "dead"}`} onClick={() => toggleLink("ha")}>HQ ↔ AWS · {links.ha ? "up" : "down"}</button>

        <Client pt={PLC} name="PLC + Ignition Edge" detail={`Temperature ${telemetryValue.toFixed(1)} °C`} protocol="MQTT" tone="green" enabled={streams.telemetry} onClick={() => setStreams((current) => ({ ...current, telemetry: !current.telemetry }))} />
        <Client pt={CAMERA} name="Vision Camera" detail="Inspection requested" protocol="MQTT" tone="cyan" enabled={streams.inspection} onClick={() => setStreams((current) => ({ ...current, inspection: !current.inspection }))} />
        <Client pt={HMI} name="Line HMI" detail={hmiValue == null ? "Waiting for value" : `Value ${hmiValue.toFixed(1)} °C`} protocol="MQTT · QoS 0" tone="green" enabled={consumers.hmi} onClick={() => toggleConsumer("hmi")} />
        <Client pt={MES} name="MES" detail="Work orders" protocol="SMF · Guaranteed" tone="cyan" enabled={consumers.mes} onClick={() => toggleConsumer("mes")} />
        <Client pt={ANALYZERS} name="Vibration Analyzers" detail="Competing workers" protocol="AMQP" tone="violet" enabled={consumers.analyzers} onClick={() => toggleConsumer("analyzers")} />
        <QueueAt pt={ORDER_QUEUE} label="orders" depth={queueDepths.orders} />
        <QueueAt pt={ANALYSIS_QUEUE} label="analysis" depth={queueDepths.analysis} tone="violet" />
        <Anchored pt={RETAINED} zIndex={4}>
          <div className="retained-value"><b>Retained value</b><span>{retainedValue.toFixed(1)} °C</span></div>
        </Anchored>
        <Anchored pt={F}><Broker small label="Factory" /></Anchored>

        <Client pt={ERP} name="ERP" detail="BOM and order updates" protocol="REST ingress" tone="blue" enabled={streams.workOrders} onClick={() => setStreams((current) => ({ ...current, workOrders: !current.workOrders }))} />
        <Client pt={QMS} name="QMS" detail="Every inspection result" protocol="AMQP" tone="blue" enabled={consumers.qms} onClick={() => toggleConsumer("qms")} />
        <Client pt={HISTORIAN} name="Historian" detail="Telemetry + inspection history" protocol="SMF" tone="green" enabled={consumers.historian} onClick={() => toggleConsumer("historian")} />
        <Client pt={ENTERPRISE_API} name="Enterprise API" detail="Broker-managed delivery" protocol="REST · 2xx ack" tone="cyan" enabled={consumers.enterprise} onClick={() => toggleConsumer("enterprise")} />
        <QueueAt pt={QUALITY_QUEUE} label="quality" depth={queueDepths.quality} tone="blue" />
        <QueueAt pt={HISTORY_QUEUE} label="history" depth={queueDepths.history} />
        <QueueAt pt={RDP_QUEUE} label="RDP" depth={queueDepths.rdp} />
        <Anchored pt={DMQ} zIndex={4}>
          <div className="dmq-marker"><b>DMQ</b><span>retry · TTL · isolate</span></div>
        </Anchored>
        <Anchored pt={H}><Broker small label="HQ" /></Anchored>

        <Client pt={AI} name="AI Inspection" detail="Consumes frame, publishes result" protocol="SMF" tone="violet" enabled={consumers.ai} onClick={() => toggleConsumer("ai")} />
        <Client pt={ANALYTICS} name="Cloud Analytics" detail="Independent processing" protocol="AMQP" tone="blue" enabled={consumers.analytics} onClick={() => toggleConsumer("analytics")} />
        <Client pt={CLOUD_API} name="Cloud API" detail="HTTP integration" protocol="REST" tone="cyan" enabled={consumers.cloudApi} onClick={() => toggleConsumer("cloudApi")} />
        <QueueAt pt={AI_QUEUE} label="AI" depth={queueDepths.ai} tone="violet" />
        <QueueAt pt={ANALYTICS_QUEUE} label="analytics" depth={queueDepths.analytics} tone="blue" />
        <QueueAt pt={CLOUD_RDP} label="RDP" depth={queueDepths.cloudRdp} />
        <Anchored pt={A}><Broker small label="AWS" /></Anchored>

        {linkDepths.fh > 0 ? <QueueAt pt={{ x: 61, y: 54 }} label="WAN" depth={linkDepths.fh} tone="amber" /> : null}
        {linkDepths.fa > 0 ? <QueueAt pt={{ x: 39, y: 54 }} label="WAN" depth={linkDepths.fa} tone="amber" /> : null}
        {linkDepths.ha > 0 ? <QueueAt pt={{ x: 50, y: 36 }} label="WAN" depth={linkDepths.ha} tone="amber" /> : null}

        <AnimatePresence>
          {flyers.map((flyer) => (
            <Particle key={flyer.id} from={flyer.from} to={flyer.to} duration={flyer.duration} onDone={() => remove(flyer.id)} zIndex={6}>
              <MsgToken label={flyer.label} tone={flyer.tone} />
            </Particle>
          ))}
        </AnimatePresence>
      </Stage>

      <ControlBar>
        <div className="control-row ecosystem-controls">
          <ControlGroup label="Continuous event streams">
            <Toggle
              checked={streams.telemetry}
              onChange={(telemetry) => setStreams((current) => ({ ...current, telemetry }))}
              label="Device telemetry · every 3s"
            />
            <Toggle
              checked={streams.inspection}
              onChange={(inspection) => setStreams((current) => ({ ...current, inspection }))}
              label="Vision inspection · every 5s"
            />
            <Toggle
              checked={streams.workOrders}
              onChange={(workOrders) => setStreams((current) => ({ ...current, workOrders }))}
              label="ERP work order · every 10s"
            />
            <Btn variant="ghost" onClick={clearInFlight}>Clear in-flight</Btn>
          </ControlGroup>
          <span className="ecosystem-scenario">
            {activeStreams} of 3 streams enabled. Streams publish and animate independently, so several flows can be active at once.
          </span>
        </div>
      </ControlBar>

      <div className="ecosystem-summary">
        <Card title="One event, several outcomes">
          <p className="prose">A camera event can trigger AWS inference, update the factory HMI, enter the HQ quality queue, and feed analytics. Each consumer chooses its own delivery contract.</p>
        </Card>
        <InsightCard
          items={[
            "Direct live delivery and retained current state",
            "Durable queues, competing consumers, retry, TTL and DMQ",
            "Fan-out across MQTT, AMQP, SMF and REST",
            "REST ingress and queue-backed outbound delivery",
            "Three local brokers connected as a full event mesh",
          ]}
        />
      </div>
    </div>
  );
}
