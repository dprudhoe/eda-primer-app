import { useRef, useState } from "react";
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
  Accent,
} from "../components/kit";
import { useFlow, Pt } from "../components/useFlow";
import { topicMatches } from "../components/topics";

type SiteId = "factory" | "cloud" | "regional";
type Site = {
  id: SiteId;
  name: string;
  accent: Accent;
  pt: Pt;
  pubs: { label: string; topic: string }[];
  subs: string[];
  consumerLabel: string;
  consumerOnline: boolean;
  received: number;
  inBuffer: number; // held for this site's offline consumer
  outBuffer: { topic: string; target: SiteId }[]; // held here because WAN is down
};

const DEFS: Record<SiteId, Omit<Site, "consumerOnline" | "received" | "inBuffer" | "outBuffer">> = {
  factory: {
    id: "factory", name: "Factory", accent: "green", pt: { x: 36, y: 32 },
    pubs: [
      { label: "Quality event", topic: "factory/quality/check-failed" },
      { label: "Production event", topic: "factory/production/run-started" },
    ],
    subs: ["factory/production/>", "cloud/ai/>"],
    consumerLabel: "Production + AI",
  },
  cloud: {
    id: "cloud", name: "Cloud · AWS", accent: "blue", pt: { x: 70, y: 32 },
    pubs: [{ label: "AI recommendation", topic: "cloud/ai/recommendation" }],
    subs: ["factory/quality/>", "regional/report/>"],
    consumerLabel: "Quality + reports",
  },
  regional: {
    id: "regional", name: "HQ Data Center", accent: "cyan", pt: { x: 53, y: 65 },
    pubs: [{ label: "Daily report", topic: "regional/report/daily" }],
    subs: ["factory/production/>"],
    consumerLabel: "Production",
  },
};

const mk = (id: SiteId): Site => ({ ...DEFS[id], consumerOnline: true, received: 0, inBuffer: 0, outBuffer: [] });
const producerPt = (s: Site): Pt =>
  s.id === "regional"
    ? { x: s.pt.x - 16, y: s.pt.y + 20 }
    : { x: s.pt.x + (s.id === "cloud" ? 16 : -16), y: s.pt.y - 17 };
const consumerPt = (s: Site): Pt =>
  s.id === "regional"
    ? { x: s.pt.x + 16, y: s.pt.y + 20 }
    : { x: s.pt.x + (s.id === "cloud" ? 16 : -16), y: s.pt.y + 17 };

export default function Lesson09EventMesh() {
  const { flyers, emit, remove } = useFlow();
  const [sites, setSites] = useState<Site[]>([mk("factory"), mk("cloud"), mk("regional")]);
  const [wanUp, setWanUp] = useState(true);
  const [lit, setLit] = useState<Set<SiteId>>(new Set());
  const sitesRef = useRef(sites);
  const wanRef = useRef(wanUp);
  sitesRef.current = sites;
  wanRef.current = wanUp;

  const flash = (id: SiteId) => {
    setLit((s) => new Set(s).add(id));
    window.setTimeout(() => setLit((s) => { const n = new Set(s); n.delete(id); return n; }), 500);
  };
  const publish = (sourceId: SiteId, topic: string) => {
    const cur = sitesRef.current;
    const wan = wanRef.current;
    const src = cur.find((s) => s.id === sourceId)!;
    const recvDelta: Record<string, number> = {};
    const inDelta: Record<string, number> = {};
    const outAdd: { topic: string; target: SiteId }[] = [];
    const emits: { to: Pt; site: SiteId }[] = [];
    emit({ from: producerPt(src), to: src.pt, tone: "green", label: topic.split("/").slice(-1)[0], duration: 0.55 });

    cur.forEach((s) => {
      if (!s.subs.some((sub) => topicMatches(sub, topic))) return;
      if (s.id === sourceId) {
        if (s.consumerOnline) {
          recvDelta[s.id] = (recvDelta[s.id] || 0) + 1;
          window.setTimeout(() => emit({ from: s.pt, to: consumerPt(s), tone: "green", label: `${topic.split("/")[1]} event`, duration: 0.7 }), 560);
          flash(s.id);
        }
        else inDelta[s.id] = (inDelta[s.id] || 0) + 1;
      } else if (!wan) {
        outAdd.push({ topic, target: s.id }); // buffered at the publishing broker
      } else if (s.consumerOnline) {
        recvDelta[s.id] = (recvDelta[s.id] || 0) + 1;
        emits.push({ to: s.pt, site: s.id });
      } else {
        inDelta[s.id] = (inDelta[s.id] || 0) + 1; // reached remote broker, held for offline consumer
        emits.push({ to: s.pt, site: s.id });
      }
    });

    setSites((ss) =>
      ss.map((s) => {
        let n = s;
        if (recvDelta[s.id]) n = { ...n, received: n.received + recvDelta[s.id] };
        if (inDelta[s.id]) n = { ...n, inBuffer: n.inBuffer + inDelta[s.id] };
        if (s.id === sourceId && outAdd.length) n = { ...n, outBuffer: [...n.outBuffer, ...outAdd] };
        return n;
      }),
    );
    emits.forEach((e) => {
      window.setTimeout(() => emit({ from: src.pt, to: e.to, tone: "green", label: topic.split("/").slice(1).join("/"), duration: 1.0 }), 570);
      const target = cur.find((s) => s.id === e.site);
      if (target?.consumerOnline) window.setTimeout(() => emit({ from: target.pt, to: consumerPt(target), tone: "green", label: "matched", duration: 0.55 }), 1600);
    });
  };

  const reconnectWan = () => {
    setWanUp(true);
    wanRef.current = true;
    const cur = sitesRef.current;
    const emits: { from: Pt; to: Pt; source: SiteId; target: SiteId; topic: string; consumerOnline: boolean }[] = [];
    cur.forEach((src) => {
      src.outBuffer.forEach((item) => {
        const target = cur.find((x) => x.id === item.target);
        if (!target) return;
        emits.push({
          from: src.pt,
          to: target.pt,
          source: src.id,
          target: target.id,
          topic: item.topic,
          consumerOnline: target.consumerOnline,
        });
      });
    });
    emits.forEach((e, i) => window.setTimeout(() => {
      // Remove one message only when it leaves the broker so the route queue visibly drains.
      setSites((ss) => ss.map((s) => {
        if (s.id !== e.source) return s;
        const index = s.outBuffer.findIndex((item) => item.target === e.target && item.topic === e.topic);
        if (index < 0) return s;
        return { ...s, outBuffer: [...s.outBuffer.slice(0, index), ...s.outBuffer.slice(index + 1)] };
      }));
      emit({ from: e.from, to: e.to, tone: "green", label: e.topic.split("/").slice(-1)[0], duration: 1.0 });
      window.setTimeout(() => {
        setSites((ss) => ss.map((s) => s.id === e.target
          ? e.consumerOnline
            ? { ...s, received: s.received + 1 }
            : { ...s, inBuffer: s.inBuffer + 1 }
          : s));
        const target = cur.find((s) => s.id === e.target);
        if (target?.consumerOnline) emit({ from: target.pt, to: consumerPt(target), tone: "green", label: "delivered", duration: 0.55 });
        flash(e.target);
      }, 1020);
    }, i * 650));
  };
  const anyOut = sites.reduce((a, s) => a + s.outBuffer.length, 0);
  const bufferedRoutes = sites.flatMap((source) =>
    sites.flatMap((target) => {
      const depth = source.outBuffer.filter((item) => item.target === target.id).length;
      return depth > 0
        ? [{ key: `${source.id}-${target.id}`, depth, pt: { x: (source.pt.x + target.pt.x) / 2, y: (source.pt.y + target.pt.y) / 2 } }]
        : [];
    }),
  );

  return (
    <div className="lesson-layout">
      <div>
        <Stage
          note={
            !wanUp
              ? `WAN is down. Each broker still serves its local apps; ${anyOut} guaranteed message(s) are buffered at their publishing broker until the link returns.`
              : anyOut > 0
                ? `WAN restored. ${anyOut} buffered message(s) are draining from the broker links.`
              : "Every app publishes and subscribes to its local broker. Subscriptions propagate across the mesh, so an event flows broker-to-broker only where a consumer wants it."
          }
          minHeight={540}
        >
          <svg className="flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* full mesh backbone between every pair of brokers */}
            {sites.map((a, i) =>
              sites.slice(i + 1).map((b) => (
                <line
                  key={a.id + b.id}
                  className={`flow-line ${wanUp ? "active" : "dead"}`}
                  x1={a.pt.x} y1={a.pt.y} x2={b.pt.x} y2={b.pt.y}
                  strokeWidth={2.5}
                  vectorEffect="non-scaling-stroke"
                />
              )),
            )}
            {sites.map((s) => (
              <g key={`local-${s.id}`}>
                <line className="flow-line active" x1={producerPt(s).x} y1={producerPt(s).y} x2={s.pt.x} y2={s.pt.y} vectorEffect="non-scaling-stroke" />
                <line className={`flow-line ${s.consumerOnline ? "active" : "dead"}`} x1={s.pt.x} y1={s.pt.y} x2={consumerPt(s).x} y2={consumerPt(s).y} vectorEffect="non-scaling-stroke" />
              </g>
            ))}
          </svg>

          {sites.map((s) => (
            <div key={s.id}>
              <Anchored pt={producerPt(s)}>
                <div className="node accent-green" style={{ minWidth: 76, padding: "7px 8px", textAlign: "center" }}>
                  <div className="node-name" style={{ fontSize: 9 }}>Publisher</div>
                  <div className="node-role">{s.name} events</div>
                </div>
              </Anchored>
              <Anchored pt={s.pt}>
                <div style={{ textAlign: "center" }}>
                  <Broker small label={s.name} active={lit.has(s.id)} />
                  {s.inBuffer > 0 ? <QueueChip depth={s.inBuffer} label="" cap={3} tone="amber" /> : null}
                </div>
              </Anchored>
              <Anchored pt={consumerPt(s)}>
                <div className={`node accent-${s.accent} ${s.consumerOnline ? "" : "offline"}`} style={{ minWidth: 88, padding: "7px 8px", textAlign: "center" }}>
                  <div className="node-name" style={{ fontSize: 9 }}>Consumer</div>
                  <span className="queue-sub" style={{ fontSize: 7.5 }}>{s.consumerLabel}</span>
                  <div className="node-role">received {s.received}</div>
                </div>
              </Anchored>
            </div>
          ))}

          {bufferedRoutes.map((route) => (
            <Anchored pt={route.pt} key={route.key} zIndex={4}>
              <QueueChip depth={route.depth} label="" cap={3} tone="amber" />
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
            <ControlGroup label="Test events">
              {sites.flatMap((site) => site.pubs.map((p) => (
                <Btn key={p.topic} onClick={() => publish(site.id, p.topic)} title={`${site.name} · ${p.topic}`}>{p.label}</Btn>
              )))}
            </ControlGroup>
            <ControlGroup label="WAN link">
              {wanUp ? (
                <Btn variant="danger" onClick={() => setWanUp(false)}>Disconnect WAN</Btn>
              ) : (
                <Btn onClick={reconnectWan}>Reconnect WAN{anyOut ? ` (flush ${anyOut})` : ""}</Btn>
              )}
            </ControlGroup>
          </div>
        </ControlBar>
      </div>

      <div className="rail">
        <Card title="Try this">
          <div className="prose" style={{ fontSize: 13 }}>
            <p><b style={{ color: "var(--green-bright)" }}>Quality:</b> flows from the factory publisher to its local broker, then only to AWS and its interested consumer.</p>
            <p><b style={{ color: "var(--green-bright)" }}>Production:</b> reaches the local factory consumer and the HQ Data Center consumer.</p>
            <p><b style={{ color: "var(--green-bright)" }}>WAN outage:</b> disconnect the WAN and publish — queued messages appear on the failed path toward each interested remote broker.</p>
          </div>
        </Card>

        <InsightCard
          items={[
            "Applications publish and subscribe to their local broker.",
            "Subscriptions propagate across the mesh — events flow only where interest exists.",
            "Brokers exchange events directly across the mesh, no central hub.",
            "A WAN outage buffers guaranteed messages at the publishing broker.",
            "A Factory broker can sit in a DMZ and initiate one outbound, bidirectional mesh connection—avoiding separate inbound firewall openings.",
            "That single secure channel supports orchestration across cloud and remote data centers at many locations.",
            "Applications never need to know where remote consumers live.",
          ]}
        />
      </div>
    </div>
  );
}
