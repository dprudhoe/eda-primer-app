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
        data-action={onClick ? `Click to ${enabled ? "disable" : "enable"}` : undefined}
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
const CMMS: Pt = { x: 7, y: 36 };
const AI_QUEUE: Pt = { x: 15, y: 20 };
const ANALYTICS_QUEUE: Pt = { x: 32, y: 21 };
const CMMS_RDP: Pt = { x: 16, y: 35 };

type ConsumerId = "hmi" | "mes" | "analyzers" | "qms" | "historian" | "enterprise" | "ai" | "analytics" | "cmms";
type ProducerId = "telemetry" | "workOrders" | "inspection";
type QueueId = "orders" | "analysis" | "quality" | "history" | "rdp" | "ai" | "analytics" | "cmmsRdp";
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
  cmmsRdp: "cmms",
};
const QUEUE_POINTS: Record<QueueId, Pt> = {
  orders: ORDER_QUEUE,
  analysis: ANALYSIS_QUEUE,
  quality: QUALITY_QUEUE,
  history: HISTORY_QUEUE,
  rdp: RDP_QUEUE,
  ai: AI_QUEUE,
  analytics: ANALYTICS_QUEUE,
  cmmsRdp: CMMS_RDP,
};
const QUEUE_SOURCES: Record<QueueId, Pt> = {
  orders: F,
  analysis: F,
  quality: H,
  history: H,
  rdp: H,
  ai: A,
  analytics: A,
  cmmsRdp: A,
};

export default function Lesson10Ecosystem() {
  const { flyers, emit, remove } = useFlow();
  const [streams, setStreams] = useState({
    telemetry: false,
    workOrders: false,
    inspection: false,
  });
  const [producers, setProducers] = useState<Record<ProducerId, boolean>>({
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
    cmms: true,
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
    cmmsRdp: 0,
  });
  const [linkDepths, setLinkDepths] = useState<Record<LinkId, number>>({ fh: 0, fa: 0, ha: 0 });
  const [telemetryValue, setTelemetryValue] = useState(72.4);
  const [retainedValue, setRetainedValue] = useState(72.4);
  const [hmiValue, setHmiValue] = useState<number | null>(72.4);
  const timers = useRef<number[]>([]);
  const sequence = useRef({ telemetry: 0, workOrder: 0, inspection: 0 });
  const maintenanceEvaluations = useRef(0);
  const telemetryValueRef = useRef(72.4);
  const retainedValueRef = useRef(72.4);
  const retainedSequenceRef = useRef(0);
  const hmiSequenceRef = useRef(0);
  const streamsRef = useRef(streams);
  const producersRef = useRef(producers);
  const consumersRef = useRef(consumers);
  const linksRef = useRef(links);
  const queueJobs = useRef<Record<QueueId, QueuedDelivery[]>>({
    orders: [], analysis: [], quality: [], history: [], rdp: [], ai: [], analytics: [], cmmsRdp: [],
  });
  const queueDraining = useRef<Record<QueueId, boolean>>({
    orders: false, analysis: false, quality: false, history: false, rdp: false, ai: false, analytics: false, cmmsRdp: false,
  });
  const linkJobs = useRef<Record<LinkId, BufferedLinkDelivery[]>>({ fh: [], fa: [], ha: [] });
  const linkDraining = useRef<Record<LinkId, boolean>>({ fh: false, fa: false, ha: false });
  streamsRef.current = streams;
  producersRef.current = producers;
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

  const replayRetainedToHmi = (value: number, telemetrySequence: number) => {
    if (telemetrySequence < hmiSequenceRef.current) return;
    hmiSequenceRef.current = telemetrySequence;
    const reading = `${value.toFixed(1)} °C`;
    emit({ from: RETAINED, to: F, label: `${reading} · retained`, tone: "amber", duration: 0.65 });
    later(680, () => {
      if (!consumersRef.current.hmi || telemetrySequence < hmiSequenceRef.current) return;
      emit({ from: F, to: HMI, label: reading, tone: "green", duration: 0.75 });
    });
    later(1450, () => {
      if (!consumersRef.current.hmi || telemetrySequence !== hmiSequenceRef.current) return;
      setHmiValue(value);
    });
  };

  const toggleConsumer = (id: ConsumerId) => {
    const next = !consumersRef.current[id];
    consumersRef.current = { ...consumersRef.current, [id]: next };
    setConsumers(consumersRef.current);
    if (next) {
      if (id === "hmi") {
        const retained = retainedValueRef.current;
        const retainedSequence = retainedSequenceRef.current;
        replayRetainedToHmi(retained, retainedSequence);
      }
      (Object.keys(QUEUE_CONSUMER) as QueueId[])
        .filter((queue) => QUEUE_CONSUMER[queue] === id)
        .forEach((queue) => later(80, () => drainQueue(queue)));
    }
  };

  const toggleProducer = (id: ProducerId) => {
    const next = !producersRef.current[id];
    producersRef.current = { ...producersRef.current, [id]: next };
    setProducers(producersRef.current);
  };

  const toggleContinuous = (id: keyof typeof streams) => {
    const next = !streamsRef.current[id];
    if (next && !producersRef.current[id]) {
      producersRef.current = { ...producersRef.current, [id]: true };
      setProducers(producersRef.current);
    }
    setStreams((current) => ({ ...current, [id]: next }));
  };

  const publishTelemetry = () => {
    if (!producersRef.current.telemetry) return;
    const telemetrySequence = ++sequence.current.telemetry;
    const previous = telemetryValueRef.current;
    const direction = previous >= 73.2 ? -1 : previous <= 71.6 ? 1 : Math.random() < 0.5 ? -1 : 1;
    const change = Math.random() < 0.55 ? 0.1 : 0.2;
    const next = Math.round((previous + direction * change) * 10) / 10;
    const reading = `${next.toFixed(1)} °C`;
    telemetryValueRef.current = next;
    setTelemetryValue(next);

    hop(0, PLC, F, reading);
    later(750, () => {
      if (!consumersRef.current.hmi || telemetrySequence < hmiSequenceRef.current) return;
      hmiSequenceRef.current = telemetrySequence;
      emit({ from: F, to: HMI, label: reading, tone: "green", duration: 0.75 });
      later(770, () => {
        if (!consumersRef.current.hmi || telemetrySequence !== hmiSequenceRef.current) return;
        hmiSequenceRef.current = telemetrySequence;
        setHmiValue(next);
      });
    });
    hop(750, F, RETAINED, reading, "amber");
    later(1520, () => {
      retainedSequenceRef.current = telemetrySequence;
      retainedValueRef.current = next;
      setRetainedValue(next);
      if (consumersRef.current.hmi && telemetrySequence > hmiSequenceRef.current) {
        replayRetainedToHmi(next, telemetrySequence);
      }
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
    if (!producersRef.current.workOrders) return;
    const id = `WO-${String(++sequence.current.workOrder).padStart(2, "0")}`;
    hop(0, ERP, H, id);
    later(750, () => {
      sendAcross("fh", {
        from: H,
        to: F,
        label: `${id} · MES`,
        tone: "green",
        onArrive: () => enqueue("orders", {
          to: MES,
          label: "deliver",
          tone: "green",
          onDelivered: () => {
            // MES finishes the work, then becomes a publisher for downstream outcomes.
            hop(600, MES, F, `${id} complete`);
            later(1380, () => sendAcross("fh", {
              from: F,
              to: H,
              label: "WorkOrderCompleted",
              tone: "green",
              onArrive: () => {
                hop(0, H, ERP, "completed");
                enqueue("history", { to: HISTORIAN, label: "archive", tone: "green" });
              },
            }));
          },
        }),
      });
      enqueue("rdp", { to: ENTERPRISE_API, label: "HTTP POST", tone: "green" });
    });
  };

  const publishMaintenance = () => {
    if (!consumersRef.current.analytics) return;
    hop(0, ANALYTICS, A, "MaintenanceRequired", "amber");
    later(780, () => {
      enqueue("cmmsRdp", {
        to: CMMS,
        label: "HTTP POST",
        tone: "amber",
      });
      sendAcross("fa", {
        from: A,
        to: F,
        label: "MaintenanceRequired",
        tone: "amber",
        onArrive: () => enqueue("orders", {
          to: MES,
          label: "maintenance",
          tone: "amber",
        }),
      });
    });
  };

  const publishInspection = () => {
    if (!producersRef.current.inspection) return;
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
            enqueue("analytics", {
              to: ANALYTICS,
              label: "deliver",
              tone: "violet",
              onDelivered: () => {
                const evaluation = ++maintenanceEvaluations.current;
                if ((evaluation - 1) % 3 !== 0) return;
                later(500, publishMaintenance);
              },
            });
            sendAcross("fa", {
              from: A,
              to: F,
              label: "InspectionResult",
              tone: "violet",
              onArrive: () => {
                if (!consumersRef.current.hmi) return;
                hop(0, F, HMI, "result", "violet");
                later(780, () => {
                  if (!consumersRef.current.hmi) return;
                  // The HMI reacts to the result by publishing a command back through the broker.
                  hop(0, HMI, F, "AdjustmentCommand", "amber");
                  later(780, () => {
                    hop(0, F, PLC, "apply adjustment", "amber");
                  });
                });
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
  }, [streams.telemetry, producers.telemetry]);

  useEffect(() => {
    if (!streams.inspection) return;
    const kickoff = window.setTimeout(publishInspection, 0);
    const interval = window.setInterval(publishInspection, 5000);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams.inspection, producers.inspection]);

  useEffect(() => {
    if (!streams.workOrders) return;
    const kickoff = window.setTimeout(publishWorkOrder, 0);
    const interval = window.setInterval(publishWorkOrder, 10000);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams.workOrders, producers.workOrders]);

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
          <line className={`flow-line ${consumers.cmms ? "active" : "dead"}`} x1={A.x} y1={A.y} x2={CMMS.x} y2={CMMS.y} />
        </svg>

        <button className={`mesh-caption mesh-caption-fh ${links.fh ? "" : "dead"}`} data-action={`Click to ${links.fh ? "disconnect" : "reconnect"}`} title={`Click to ${links.fh ? "disconnect" : "reconnect"} the Factory–HQ broker link`} onClick={() => toggleLink("fh")}>Factory ↔ HQ · {links.fh ? "up" : "down"}</button>
        <button className={`mesh-caption mesh-caption-fa ${links.fa ? "" : "dead"}`} data-action={`Click to ${links.fa ? "disconnect" : "reconnect"}`} title={`Click to ${links.fa ? "disconnect" : "reconnect"} the Factory–AWS broker link`} onClick={() => toggleLink("fa")}>Factory ↔ AWS · {links.fa ? "up" : "down"}</button>
        <button className={`mesh-caption mesh-caption-ha ${links.ha ? "" : "dead"}`} data-action={`Click to ${links.ha ? "disconnect" : "reconnect"}`} title={`Click to ${links.ha ? "disconnect" : "reconnect"} the HQ–AWS broker link`} onClick={() => toggleLink("ha")}>HQ ↔ AWS · {links.ha ? "up" : "down"}</button>

        <Client pt={PLC} name="PLC + Ignition Edge" detail={`Temperature ${telemetryValue.toFixed(1)} °C`} protocol="MQTT" tone="green" enabled={producers.telemetry} onClick={() => toggleProducer("telemetry")} />
        <Client pt={CAMERA} name="Vision Camera" detail="Inspection requested" protocol="MQTT" tone="cyan" enabled={producers.inspection} onClick={() => toggleProducer("inspection")} />
        <Client pt={HMI} name="Line HMI" detail={hmiValue == null ? "Waiting for value" : `Value ${hmiValue.toFixed(1)} °C`} protocol="MQTT · QoS 0" tone="green" enabled={consumers.hmi} onClick={() => toggleConsumer("hmi")} />
        <Client pt={MES} name="MES" detail="Orders → completion" protocol="SMF · Guaranteed" tone="cyan" enabled={consumers.mes} onClick={() => toggleConsumer("mes")} />
        <Client pt={ANALYZERS} name="Vibration Analyzers" detail="Competing workers" protocol="AMQP" tone="violet" enabled={consumers.analyzers} onClick={() => toggleConsumer("analyzers")} />
        <QueueAt pt={ORDER_QUEUE} label="orders" depth={queueDepths.orders} />
        <QueueAt pt={ANALYSIS_QUEUE} label="analysis" depth={queueDepths.analysis} tone="violet" />
        <Anchored pt={RETAINED} zIndex={4}>
          <div className="retained-value"><b>Retained value</b><span>{retainedValue.toFixed(1)} °C</span></div>
        </Anchored>
        <Anchored pt={F}><Broker small label="Factory" /></Anchored>

        <Client pt={ERP} name="ERP" detail="Orders + completion status" protocol="REST + events" tone="blue" enabled={producers.workOrders} onClick={() => toggleProducer("workOrders")} />
        <Client pt={QMS} name="QMS" detail="Every inspection result" protocol="AMQP" tone="blue" enabled={consumers.qms} onClick={() => toggleConsumer("qms")} />
        <Client pt={HISTORIAN} name="Historian" detail="Operational event history" protocol="SMF" tone="green" enabled={consumers.historian} onClick={() => toggleConsumer("historian")} />
        <Client pt={ENTERPRISE_API} name="Enterprise API" detail="Broker-managed delivery" protocol="REST · 2xx ack" tone="cyan" enabled={consumers.enterprise} onClick={() => toggleConsumer("enterprise")} />
        <QueueAt pt={QUALITY_QUEUE} label="quality" depth={queueDepths.quality} tone="blue" />
        <QueueAt pt={HISTORY_QUEUE} label="history" depth={queueDepths.history} />
        <QueueAt pt={RDP_QUEUE} label="RDP" depth={queueDepths.rdp} />
        <Anchored pt={DMQ} zIndex={4}>
          <div className="dmq-marker"><b>DMQ</b><span>retry · TTL · isolate</span></div>
        </Anchored>
        <Anchored pt={H}><Broker small label="HQ" /></Anchored>

        <Client pt={AI} name="AI Inspection" detail="Consumes frame, publishes result" protocol="SMF" tone="violet" enabled={consumers.ai} onClick={() => toggleConsumer("ai")} />
        <Client pt={ANALYTICS} name="Predictive Maintenance" detail="Evaluates inspection results" protocol="AMQP" tone="blue" enabled={consumers.analytics} onClick={() => toggleConsumer("analytics")} />
        <Client pt={CMMS} name="CMMS" detail="Maintenance work management" protocol="REST" tone="cyan" enabled={consumers.cmms} onClick={() => toggleConsumer("cmms")} />
        <QueueAt pt={AI_QUEUE} label="AI" depth={queueDepths.ai} tone="violet" />
        <QueueAt pt={ANALYTICS_QUEUE} label="analytics" depth={queueDepths.analytics} tone="blue" />
        <QueueAt pt={CMMS_RDP} label="RDP" depth={queueDepths.cmmsRdp} />
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
          <ControlGroup label="Interact directly with the diagram">
            <div className="ecosystem-instructions">
              <p><b>Applications:</b> click any producer or consumer to disable or enable it and observe the delivery behavior.</p>
              <p><b>Broker links:</b> click a labeled connection between brokers to disconnect or reconnect that path and watch guaranteed events buffer or drain.</p>
            </div>
          </ControlGroup>
          <Card title="Events drive the next step" className="workflow-guide">
            <div className="workflow-list">
              <div>
                <div className="workflow-heading">
                  <b>1. Telemetry and current state</b>
                  <div className="workflow-actions">
                    <Btn sm onClick={publishTelemetry}>Run once</Btn>
                    <Btn sm variant={streams.telemetry ? "primary" : "ghost"} onClick={() => toggleContinuous("telemetry")}>
                      {streams.telemetry ? "Continuous on" : "Continuous"}
                    </Btn>
                  </div>
                </div>
                <p>PLC + Ignition Edge publishes temperature to the HMI, retained value, and historian. An offline HMI misses live updates but receives the retained value when it reconnects; the historian’s queue buffers.</p>
              </div>
              <div>
                <div className="workflow-heading">
                  <b>2. Work-order lifecycle</b>
                  <div className="workflow-actions">
                    <Btn sm onClick={publishWorkOrder}>Run once</Btn>
                    <Btn sm variant={streams.workOrders ? "primary" : "ghost"} onClick={() => toggleContinuous("workOrders")}>
                      {streams.workOrders ? "Continuous on" : "Continuous"}
                    </Btn>
                  </div>
                </div>
                <p>ERP publishes a work order to the MES queue. MES processes it and publishes <code>WorkOrderCompleted</code> to ERP and the historian. Taking MES offline grows its order queue; taking the historian offline grows its history queue.</p>
              </div>
              <div>
                <div className="workflow-heading">
                  <b>3. Inspection and adjustment</b>
                  <div className="workflow-actions">
                    <Btn sm onClick={publishInspection}>Run once</Btn>
                    <Btn sm variant={streams.inspection ? "primary" : "ghost"} onClick={() => toggleContinuous("inspection")}>
                      {streams.inspection ? "Continuous on" : "Continuous"}
                    </Btn>
                  </div>
                </div>
                <p>The camera triggers AWS AI inspection. The result reaches the HMI, QMS, historian, and Predictive Maintenance. The HMI can publish an adjustment command to Ignition Edge; when Predictive Maintenance determines maintenance is required, it publishes <code>MaintenanceRequired</code> to CMMS and MES. Offline applications and unavailable mesh paths demonstrate which parts of the workflow buffer and which direct deliveries are missed.</p>
              </div>
              <div>
                <b>4. Cross-region delivery</b>
                <p>Disconnect a labeled broker link to see guaranteed inter-broker traffic buffer on the unavailable path, then reconnect it to watch the link queue drain.</p>
              </div>
            </div>
          </Card>
        </div>
      </ControlBar>

      <div className="ecosystem-summary">
        <InsightCard
          items={[
            "Connected operations emerge when applications collaborate through well-defined, reusable event contracts rather than point-to-point integrations.",
            "Producers describe what happened without knowing which applications will react, keeping systems loosely coupled and independently evolvable.",
            "One event contract can support several operational outcomes today and entirely new consumers later without changing the source application.",
            "Applications can consume an event, act, and publish the next event or command—creating distributed workflows across OT, enterprise, and cloud systems.",
            "Each consumer can choose live, retained, or guaranteed delivery according to its own outcome without imposing that choice on every other consumer.",
            "An event mesh extends the same contracts across locations while each application continues to connect only to its local broker.",
          ]}
        />
      </div>
    </div>
  );
}
