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
  Stage,
  Toggle,
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
  sub: string;
  consumerOnline: boolean;
  received: number;
  inBuffer: number; // held for this site's offline consumer
  outBuffer: { topic: string; target: SiteId }[]; // held here because WAN is down
};

const SUB_OPTIONS = ["factory/quality/>", "factory/>", "cloud/ai/>", "regional/report/>", "none"];

const DEFS: Record<SiteId, Omit<Site, "consumerOnline" | "received" | "inBuffer" | "outBuffer">> = {
  factory: {
    id: "factory", name: "Factory Plant", accent: "green", pt: { x: 20, y: 28 },
    pubs: [
      { label: "Quality event", topic: "factory/quality/check-failed" },
      { label: "Production event", topic: "factory/production/run-started" },
    ],
    sub: "cloud/ai/>",
  },
  cloud: {
    id: "cloud", name: "Cloud · Azure", accent: "blue", pt: { x: 80, y: 28 },
    pubs: [{ label: "AI recommendation", topic: "cloud/ai/recommendation" }],
    sub: "factory/quality/>",
  },
  regional: {
    id: "regional", name: "Regional DC", accent: "cyan", pt: { x: 50, y: 76 },
    pubs: [{ label: "Daily report", topic: "regional/report/daily" }],
    sub: "factory/quality/>",
  },
};

const mk = (id: SiteId): Site => ({ ...DEFS[id], consumerOnline: true, received: 0, inBuffer: 0, outBuffer: [] });

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
  const active = (sub: string) => sub !== "none";

  const publish = (sourceId: SiteId, topic: string) => {
    const cur = sitesRef.current;
    const wan = wanRef.current;
    const src = cur.find((s) => s.id === sourceId)!;
    const recvDelta: Record<string, number> = {};
    const inDelta: Record<string, number> = {};
    const outAdd: { topic: string; target: SiteId }[] = [];
    const emits: { to: Pt; site: SiteId }[] = [];

    cur.forEach((s) => {
      if (!active(s.sub) || !topicMatches(s.sub, topic)) return;
      if (s.id === sourceId) {
        if (s.consumerOnline) { recvDelta[s.id] = (recvDelta[s.id] || 0) + 1; flash(s.id); }
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
    emits.forEach((e) => emit({ from: src.pt, to: e.to, tone: "green", label: topic.split("/").slice(1).join("/"), duration: 1.0 }));
  };

  const reconnectWan = () => {
    setWanUp(true);
    wanRef.current = true;
    const cur = sitesRef.current;
    const recvDelta: Record<string, number> = {};
    const inDelta: Record<string, number> = {};
    const emits: { from: Pt; to: Pt; site: SiteId }[] = [];
    cur.forEach((src) => {
      src.outBuffer.forEach((item) => {
        const target = cur.find((x) => x.id === item.target);
        if (!target) return;
        if (target.consumerOnline) { recvDelta[target.id] = (recvDelta[target.id] || 0) + 1; }
        else inDelta[target.id] = (inDelta[target.id] || 0) + 1;
        emits.push({ from: src.pt, to: target.pt, site: target.id });
      });
    });
    setSites((ss) =>
      ss.map((s) => {
        let n = { ...s, outBuffer: [] as { topic: string; target: SiteId }[] };
        if (recvDelta[s.id]) n = { ...n, received: n.received + recvDelta[s.id] };
        if (inDelta[s.id]) n = { ...n, inBuffer: n.inBuffer + inDelta[s.id] };
        return n;
      }),
    );
    emits.forEach((e, i) => window.setTimeout(() => { emit({ from: e.from, to: e.to, tone: "green", label: "buffered", duration: 1.0 }); flash(e.site); }, i * 300));
  };

  const setConsumerOnline = (id: SiteId, online: boolean) => {
    setSites((ss) =>
      ss.map((s) => {
        if (s.id !== id) return s;
        if (online && s.inBuffer > 0) { flash(id); return { ...s, consumerOnline: true, received: s.received + s.inBuffer, inBuffer: 0 }; }
        return { ...s, consumerOnline: online };
      }),
    );
  };

  const setSub = (id: SiteId, sub: string) => setSites((ss) => ss.map((s) => (s.id === id ? { ...s, sub } : s)));
  const anyOut = sites.reduce((a, s) => a + s.outBuffer.length, 0);

  return (
    <div className="lesson-layout">
      <div>
        <Stage
          note={
            !wanUp
              ? `WAN is down. Each broker still serves its local apps; ${anyOut} guaranteed message(s) are buffered at their publishing broker until the link returns.`
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
          </svg>

          {/* faint mesh label at center */}
          <Anchored pt={{ x: 50, y: 52 }} zIndex={0}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: wanUp ? "rgba(103,217,184,0.35)" : "rgba(239,90,106,0.4)" }}>
              {wanUp ? "Event Mesh" : "WAN down"}
            </span>
          </Anchored>

          {sites.map((s) => (
            <Anchored pt={s.pt} key={s.id}>
              <div className={`node accent-${s.accent} ${lit.has(s.id) ? "lit" : ""}`} style={{ minWidth: 178, alignItems: "center", gap: 6, padding: "10px 12px" }}>
                <Broker small label={s.name} active={lit.has(s.id)} />
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 3, textAlign: "center" }}>
                  <div className="node-sub" style={{ color: "var(--green-bright)" }}>
                    publisher · {s.pubs[0].label}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-mute)" }}>
                    consumer {s.consumerOnline ? "· online" : "· offline"}
                  </div>
                  <span className="queue-sub" style={{ alignSelf: "center" }}>{s.sub}</span>
                  <div className="node-sub">received {s.received}</div>
                  {s.inBuffer > 0 ? <span className="node-badge badge-warn" style={{ alignSelf: "center", margin: 0 }}>consumer buffer {s.inBuffer}</span> : null}
                  {s.outBuffer.length > 0 ? <span className="node-badge badge-warn blink" style={{ alignSelf: "center", margin: 0 }}>WAN buffer {s.outBuffer.length}</span> : null}
                </div>
              </div>
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
            {sites.map((s) => (
              <ControlGroup key={s.id} label={`Publish from ${s.name}`}>
                {s.pubs.map((p) => (
                  <Btn key={p.topic} sm onClick={() => publish(s.id, p.topic)} title={p.topic}>{p.label}</Btn>
                ))}
              </ControlGroup>
            ))}
          </div>
          <div className="control-row">
            {sites.map((s) => (
              <ControlGroup key={s.id} label={`${s.name}`}>
                <select className="select-input" value={s.sub} onChange={(e) => setSub(s.id, e.target.value)}>
                  {SUB_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
                </select>
                <Toggle checked={s.consumerOnline} onChange={(v) => setConsumerOnline(s.id, v)} label="consumer" />
              </ControlGroup>
            ))}
          </div>
          <div className="control-row">
            <ControlGroup label="WAN link">
              {wanUp ? (
                <Btn variant="danger" onClick={() => setWanUp(false)}>Disconnect WAN</Btn>
              ) : (
                <Btn onClick={reconnectWan}>Reconnect WAN{anyOut ? ` (flush ${anyOut})` : ""}</Btn>
              )}
            </ControlGroup>
            <span className="dim" style={{ fontSize: 12 }}>Three broker regions keep the mesh readable while showing local publishers and consumers.</span>
          </div>
        </ControlBar>
      </div>

      <div className="rail">
        <Card title="Try this">
          <div className="prose" style={{ fontSize: 13 }}>
            <p><b style={{ color: "var(--green-bright)" }}>Propagation:</b> publish a Quality event from the factory — it flows across the mesh to the cloud, which subscribes to <code>factory/quality/&gt;</code>.</p>
            <p><b style={{ color: "var(--green-bright)" }}>Selectivity:</b> publish a Production event — nobody remote wants it, so it stays local.</p>
            <p><b style={{ color: "var(--green-bright)" }}>WAN outage:</b> disconnect the WAN, publish — messages buffer at the <em>publishing</em> broker; reconnect to flush.</p>
            <p><b style={{ color: "var(--green-bright)" }}>Consumer outage:</b> take a consumer offline, publish — messages buffer at <em>its</em> broker; bring it back to drain.</p>
            <p><b style={{ color: "var(--green-bright)" }}>Locality:</b> each of the three brokers has its own publisher and consumer; applications only connect locally.</p>
          </div>
        </Card>

        <InsightCard
          items={[
            "Applications publish and subscribe to their local broker.",
            "Subscriptions propagate across the mesh — events flow only where interest exists.",
            "Brokers exchange events directly across the mesh, no central hub.",
            "A WAN outage buffers guaranteed messages at the publishing broker.",
            "A consumer outage buffers messages at the consumer's own broker.",
            "Applications never need to know where remote consumers live.",
          ]}
        />
      </div>
    </div>
  );
}
