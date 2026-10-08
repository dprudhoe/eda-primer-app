import { ReactNode, useState } from "react";
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
  Prediction,
  Segmented,
  Stage,
  StatPill,
} from "../components/kit";
import { Pt, useFlow } from "../components/useFlow";

const HUB = { x: 50, y: 50 };
const apps = [
  { name: "PLC / SCADA", role: "Equipment readings", pt: { x: 15, y: 22 } },
  { name: "MES", role: "Production execution", pt: { x: 50, y: 17 } },
  { name: "Maintenance", role: "Asset health", pt: { x: 85, y: 22 } },
  { name: "Warehouse", role: "Materials & inventory", pt: { x: 15, y: 78 } },
  { name: "Quality", role: "Inspection & traceability", pt: { x: 50, y: 83 } },
  { name: "Analytics", role: "Event insights", pt: { x: 85, y: 78 } },
];
const architectureScenarios = [
  {
    label: "Production completed",
    source: 1,
    targets: [3, 4],
    event: "Order completed",
    description:
      "MES announces a completed order. Warehouse updates inventory and Quality records its traceability outcome.",
  },
  {
    label: "Machine fault",
    source: 0,
    targets: [1, 2],
    event: "Machine fault detected",
    description:
      "PLC / SCADA reports a machine fault. MES reassesses the production schedule and Maintenance opens a work request.",
  },
  {
    label: "Quality rejected",
    source: 4,
    targets: [1, 3],
    event: "Part rejected",
    description:
      "Quality announces a failed inspection. MES flags rework and Warehouse keeps the part out of available stock.",
  },
  {
    label: "Materials ready",
    source: 3,
    targets: [1],
    event: "Materials available",
    description:
      "Warehouse announces that materials are ready. MES can release the next production operation.",
  },
];
function Lines({ paths, dimmed = false }: { paths: [Pt, Pt][]; dimmed?: boolean }) {
  return (
    <svg className="flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      {paths.map(([a, b], i) => (
        <line
          key={i}
          className={`flow-line active ${dimmed ? "connection-muted" : ""}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
function Layout({
  children,
  scenario,
  takeaways,
  question,
  answer,
  wrong,
  reveal,
}: {
  children: ReactNode;
  scenario: ReactNode;
  takeaways: ReactNode[];
  question: string;
  answer: string;
  wrong: string;
  reveal: string;
}) {
  return (
    <div className="lesson-layout">
      <div>{children}</div>
      <div className="rail">
        <Card title="Scenario">
          <div className="prose">{scenario}</div>
        </Card>
        <InsightCard items={takeaways} />
        <Prediction
          question={question}
          choices={[
            { id: "a", text: wrong },
            { id: "b", text: answer, correct: true },
          ]}
          reveal={reveal}
        />
      </div>
    </div>
  );
}
export function LessonWhyEDA() {
  const [mode, setMode] = useState<"point" | "broker">("point");
  const [exchange, setExchange] = useState(0);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const scenario = architectureScenarios[scenarioIndex];
  const { flyers, emit, remove, clear } = useFlow();
  const shown = apps;
  const paths: [Pt, Pt][] =
    mode === "broker"
      ? shown.map((a) => [a.pt, HUB])
      : shown.flatMap((a, i) =>
          shown.slice(i + 1).map((b) => [a.pt, b.pt] as [Pt, Pt]),
        );
  const publish = (scenario: (typeof architectureScenarios)[number]) => {
    const targets = [...scenario.targets, 5];
    if (mode === "broker") {
      emit({
        tone: "green",
        from: apps[scenario.source].pt,
        to: HUB,
        label: scenario.event,
        meta: { fanout: true, targets },
        duration: 0.7,
      });
    } else {
      setExchange((n) => n + 1);
    }
  };
  return (
    <Layout
      scenario={
        <>
          <p>
            A factory connects production, equipment, maintenance, warehouse,
            and quality applications. Each point-to-point integration has its
            own connection and contract to maintain.
          </p>
          <p>
            Switch architectures and click a scenario to run it. This
            illustration assumes every application pair needs an integration to
            make the growth visible; actual factories may have fewer
            connections. In point-to-point mode, systems call each other and
            wait for replies. Broker mode publishes events to interested
            systems.
          </p>
        </>
      }
      takeaways={[
        "EDA means systems react to events: facts about something that happened.",
        "A broker lets producers publish without addressing every consumer individually.",
        "Subscribers can evolve independently, but still need shared event definitions and access policies.",
        "Decoupling helps resilience; durable storage and application handling determine what survives an outage.",
      ]}
      question="Analytics wants production-completed events. With a broker, what changes?"
      wrong="MES must add a new connection specifically to analytics."
      answer="Analytics connects and subscribes to the existing event stream."
      reveal="The producer keeps publishing the same event. A new authorized subscriber can receive it without a new producer-to-consumer connection."
    >
      <Stage
        minHeight={490}
        note={
          mode === "point"
            ? "Highlighted connections show a request followed by a reply between each interested system and the source application."
            : "The source publishes once to the broker, which routes copies to interested consumers, including Analytics."
        }
      >
        <Lines paths={paths} dimmed={mode === "point" && exchange > 0} />
        {mode === "point" && exchange > 0 && (
          <>
            <svg
              className="flow-svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {[...scenario.targets, 5].map((i, index) => (
                <motion.line
                  key={`${exchange}-${i}`}
                  className="request-reply-line"
                  x1={apps[i].pt.x}
                  y1={apps[i].pt.y}
                  x2={apps[scenario.source].pt.x}
                  y2={apps[scenario.source].pt.y}
                  vectorEffect="non-scaling-stroke"
                  initial={{ strokeDashoffset: 0, opacity: 0.2 }}
                  animate={{
                    strokeDashoffset: [0, -32, 0],
                    opacity: [0.2, 0.8, 0.8, 0.2],
                  }}
                  transition={{ duration: 0.7, delay: index * 0.75, ease: "linear" }}
                >
                  <title>
                    {apps[i].name} requests data from{" "}
                    {apps[scenario.source].name}, which replies.
                  </title>
                </motion.line>
              ))}
            </svg>
            <Anchored pt={HUB}>
              <div className="request-reply-caption">Request ⇄ Reply</div>
            </Anchored>
          </>
        )}
        {mode === "broker" && (
          <Anchored pt={HUB}>
            <Broker active={flyers.length > 0} />
          </Anchored>
        )}
        {shown.map((a) => (
          <Anchored key={a.name} pt={a.pt}>
            <Node
              name={a.name}
              role={a.role}
              accent={a.name === "Analytics" ? "violet" : "cyan"}
              style={{ width: 140 }}
            />
          </Anchored>
        ))}
        <AnimatePresence>
          {flyers.map((f) => (
            <Particle
              key={f.id}
              from={f.from}
              to={f.to}
              duration={f.duration}
              onDone={() => {
                remove(f.id);
                if (f.meta?.fanout)
                  (f.meta.targets as number[]).forEach((i) =>
                    emit({
                      tone: "green",
                      from: HUB,
                      to: apps[i].pt,
                      label: f.label,
                      duration: 0.7,
                    }),
                  );
              }}
            >
              <MsgToken label={f.label} />
            </Particle>
          ))}
        </AnimatePresence>
      </Stage>
      <ControlBar>
        <ControlGroup label="Factory scenario">
          <div className="control-row">
            {architectureScenarios.map((item, i) => (
              <Btn
                key={item.label}
                variant={i === scenarioIndex ? "primary" : "default"}
                onClick={() => {
                  clear();
                  setScenarioIndex(i);
                  publish(item);
                }}
              >
                {item.label}
              </Btn>
            ))}
          </div>
          <div
            className="prose architecture-scenario-description"
            aria-live="polite"
          >
            <p>{scenario.description}</p>
          </div>
        </ControlGroup>
        <div className="control-row">
          <Segmented
            value={mode}
            options={[
              { value: "point", label: "Point to point" },
              { value: "broker", label: "Event-Driven" },
            ]}
            onChange={(m) => {
              clear();
              setExchange(0);
              setMode(m);
            }}
          />
        </div>
        <div className="control-row">
          <StatPill
            label="Integration points"
            value={paths.length}
          />
        </div>
      </ControlBar>
    </Layout>
  );
}
const eventExamples = [
  {
    name: "Temperature measured",
    producer: "PLC gateway",
    topic: "plant/line1/temperature/measured",
    payload: '{ "machineId": "PRESS-01", "temperatureC": 72.4 }',
    consumers: ["Operator dashboard", "Historian"],
    meaning:
      "A device observation. A dashboard may care most about the latest reading; a historian may need every sample.",
  },
  {
    name: "Machine fault detected",
    producer: "SCADA",
    topic: "plant/line1/machine/faulted",
    payload: '{ "machineId": "PRESS-01", "faultCode": "OVERHEAT" }',
    consumers: ["Maintenance", "Operations"],
    meaning:
      "An operational occurrence. Interested systems can open a maintenance case or alert an operator.",
  },
  {
    name: "Inspection completed",
    producer: "Quality station",
    topic: "plant/line1/inspection/completed",
    payload: '{ "partId": "PART-101", "result": "pass" }',
    consumers: ["Quality management", "Traceability"],
    meaning:
      "A quality event. Each inspected part has its own outcome; a later inspection cannot replace this one.",
  },
  {
    name: "Production order released",
    producer: "ERP",
    topic: "plant/line1/order/released",
    payload: '{ "orderId": "WO-204", "quantity": 500 }',
    consumers: ["MES", "Warehouse"],
    meaning:
      "A business activity. MES and warehouse can react independently to the same published fact.",
  },
];
export function LessonWhatIsEvent() {
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);
  const e = eventExamples[selected];
  return (
    <Layout
      scenario={
        <>
          <p>
            Events range from device telemetry to business activities. Select a
            factory event to inspect its producer, topic, payload, and
            interested systems.
          </p>
          <p>
            An <strong>event</strong> says “the order was released.” A{" "}
            <strong>command</strong> says “release the order.” A{" "}
            <strong>request</strong> asks for a result, such as “what is the
            order status?” Messages can carry any of these; their meaning
            matters.
          </p>
        </>
      }
      takeaways={[
        "An event describes a fact or observation that has occurred.",
        "A topic labels the stream; the payload carries the data. IDs and timestamps help consumers interpret each occurrence.",
        "Producers push publications; consumers register interest through subscriptions.",
        "The same event can support several outcomes and different delivery requirements.",
      ]}
      question="Which message describes an event?"
      wrong="Start production order WO-204."
      answer="Production order WO-204 was started."
      reveal="The event reports something that happened. The command asks a system to perform an action."
    >
      <Stage
        minHeight={450}
        note="The examples omit event IDs and timestamps for readability. Real event contracts should define them, units, and schema versions."
      >
        <div className="foundation-event">
          <div className="foundation-kicker">{e.producer} publishes</div>
          <h2>{e.name}</h2>
          <div className="foundation-topic">{e.topic}</div>
          <pre>{e.payload}</pre>
          <p>{e.meaning}</p>
          <div className="foundation-recipients">
            {e.consumers.map((c) => (
              <Node
                key={c}
                name={c}
                role={
                  count
                    ? `Received ${count} publication${count === 1 ? "" : "s"}`
                    : "Interested subscriber"
                }
                accent="cyan"
                lit={count > 0}
              />
            ))}
          </div>
        </div>
      </Stage>
      <ControlBar>
        <ControlGroup label="Explore event types">
          <div className="control-row">
            {eventExamples.map((item, i) => (
              <Btn
                key={item.name}
                variant={selected === i ? "primary" : "default"}
                onClick={() => {
                  setSelected(i);
                  setCount(0);
                }}
              >
                {item.name}
              </Btn>
            ))}
          </div>
        </ControlGroup>
        <div className="control-row">
          <Btn variant="primary" onClick={() => setCount((c) => c + 1)}>
            Publish this event
          </Btn>
          <StatPill label="Publications" value={count} />
        </div>
      </ControlBar>
    </Layout>
  );
}
export function LessonWhatIsBroker() {
  const [kind, setKind] = useState<"temperature" | "fault">("temperature");
  const [received, setReceived] = useState([0, 0]);
  const { flyers, emit, remove } = useFlow();
  const source = { x: 15, y: 50 };
  const targets = [
    { x: 85, y: 27 },
    { x: 85, y: 75 },
  ];
  const topic = `plant/line1/machine/${kind}`;
  const publish = (type: "temperature" | "fault") => {
    setKind(type);
    emit({ tone: "green", from: source, to: HUB,
      label: type === "fault" ? "Fault detected" : "72.4°C",
      meta: { route: true, matches: type === "fault" ? [0, 1] : [1] },
    });
  };
  return (
    <Layout
      scenario={
        <>
          <p>
            A DataOps tool collects and contextualizes equipment data, then
            publishes temperature readings and machine faults. Maintenance
            subscribes only to faults. Dashboard subscribes to both event types.
          </p>
          <p>
            Publish a temperature reading or a fault. The broker checks
            interest and routes copies; the producer does not choose the
            receiving applications.
          </p>
        </>
      }
      takeaways={[
        "An event broker receives publications and routes them to matching subscribers.",
        "A subscription expresses interest in a topic or topic pattern.",
        "A broker can bridge applications using different supported protocols.",
        "This demo uses live delivery. Offline recovery requires a configured durable endpoint and suitable delivery mode.",
      ]}
      question="Maintenance subscribes only to machine/fault. What happens to a temperature publication?"
      wrong="Every connected application receives it."
      answer="Maintenance receives no copy; Dashboard receives it."
      reveal="Being connected is not enough. The subscription must match the published topic."
    >
      <Stage
        minHeight={440}
        note={`Last publishing topic: ${topic}. Maintenance receives faults; Dashboard receives temperatures and faults.`}
      >
        <Lines
          paths={[
            [source, HUB],
            [HUB, targets[0]],
            [HUB, targets[1]],
          ]}
        />
        <Anchored pt={source}>
          <Node
            name="DataOps tool"
            role="Producer"
            sub="Contextualized equipment data"
            accent="green"
            style={{ width: 150 }}
          />
        </Anchored>
        <Anchored pt={HUB}>
          <Broker active={flyers.length > 0} label="Topic matching" />
        </Anchored>
        <Anchored pt={targets[0]}>
          <Node
            name="Maintenance"
            role="Alarms"
            sub="machine/fault"
            value={received[0]}
            accent="amber"
            style={{ width: 155 }}
          />
        </Anchored>
        <Anchored pt={targets[1]}>
          <Node
            name="Dashboard"
            role="Alarms and telemetry"
            sub="Temperature + faults"
            value={received[1]}
            accent="violet"
            style={{ width: 155 }}
          />
        </Anchored>
        <AnimatePresence>
          {flyers.map((f) => (
            <Particle
              key={f.id}
              from={f.from}
              to={f.to}
              duration={0.65}
              onDone={() => {
                remove(f.id);
                if (f.meta?.route) {
                  const matches = f.meta.matches as number[];
                  matches.forEach((i) =>
                    emit({
                      tone: "green",
                      from: HUB,
                      to: targets[i],
                      label: f.label,
                      meta: { consumer: i },
                    }),
                  );
                } else if (f.meta?.consumer !== undefined) {
                  const i = f.meta.consumer as number;
                  setReceived((r) => r.map((v, j) => v + (j === i ? 1 : 0)));
                }
              }}
            >
              <MsgToken label={f.label} />
            </Particle>
          ))}
        </AnimatePresence>
      </Stage>
      <ControlBar>
        <div className="control-row">
          <Btn variant="primary" onClick={() => publish("temperature")}>Publish temperature</Btn>
          <Btn variant="primary" onClick={() => publish("fault")}>Publish fault</Btn>
        </div>
      </ControlBar>
    </Layout>
  );
}
const connections = [
  {
    id: "MQTT",
    kind: "Publish/subscribe protocol",
    app: "PLC gateway",
    text: "A lightweight publish/subscribe protocol commonly used for device and edge telemetry. Clients publish to topics and subscribe to topics or filters.",
    detail:
      "QoS defines transport delivery behavior. It does not establish whether a business transaction was committed.",
  },
  {
    id: "AMQP",
    kind: "Messaging protocol (AMQP 1.0)",
    app: "Warehouse service",
    text: "A standard wire protocol for messaging between applications and brokers, with links, settlement, and flow control.",
    detail:
      "Useful for business services needing interoperable messaging. Broker configuration and client behavior still determine delivery outcomes.",
  },
  {
    id: "JMS",
    kind: "Java messaging API",
    app: "Java MES",
    text: "An API used by Java applications to send and receive messages through a messaging provider. JMS is not a wire protocol.",
    detail:
      "Solace’s JMS provider can use SMF underneath. A familiar Java API can connect an existing enterprise application to the same broker.",
  },
  {
    id: "REST",
    kind: "HTTP-based messaging integration",
    app: "HTTP quality service",
    text: "Applications can publish messages using HTTP requests. A Solace REST delivery point can deliver queued messages to an HTTP endpoint.",
    detail:
      "This makes HTTP services participants in messaging. HTTP is request/response; durable queue-backed delivery adds asynchronous behavior and retry handling.",
  },
  {
    id: "SMF",
    kind: "Solace Message Format protocol",
    app: "High-volume analytics",
    text: "Solace’s native messaging protocol, used by Solace messaging APIs to access Direct and Guaranteed delivery and advanced broker capabilities.",
    detail:
      "Partitioned queues distribute related events by key while preserving order within each partition. Message eliding keeps the latest eligible Direct update per topic. Guaranteed flows use windows and acknowledgements to manage messages in flight.",
  },
];
export function LessonConnections() {
  const [selected, setSelected] = useState(0);
  const [sent, setSent] = useState(false);
  const { flyers, emit, remove, clear } = useFlow();
  const c = connections[selected];
  return (
    <Layout
      scenario={
        <>
          <p>
            The factory has device gateways, Java MES applications, warehouse
            services, and HTTP endpoints. They can share events through one
            broker using supported interfaces.
          </p>
          <p>
            Select an interface to see where it fits. These are connection
            choices, not interchangeable guarantees about storage or successful
            processing.
          </p>
        </>
      }
      takeaways={[
        "MQTT, AMQP 1.0, and SMF are messaging protocols; JMS is an API; REST messaging uses HTTP integration.",
        "A multi-protocol broker can route an event between supported interfaces without requiring every application to use the same one.",
        "Agree on payload schemas, topics, and supported metadata across interfaces.",
        "Choose delivery behavior separately from the application’s connection interface.",
      ]}
      question="A Java MES uses JMS and a gateway uses MQTT. Must both applications use the same API?"
      wrong="Yes, all subscribers must use the producer’s API."
      answer="No, a broker supporting both can route compatible events between them."
      reveal="The broker bridges supported interfaces. Applications still need compatible event contracts, and some features or metadata vary by protocol."
    >
      <Stage
        minHeight={470}
        note="Conceptual interface overview. Protocol support and feature availability depend on the broker, client API, and configuration."
      >
        <div className="foundation-connection">
          <div className="foundation-kicker">{c.kind}</div>
          <h2>{c.id}</h2>
          <p>{c.text}</p>
          <div className="foundation-connect-row">
            <Node name={c.app} role={`Connected using ${c.id}`} accent="cyan" />
            <span aria-hidden="true">→</span>
            <Broker active={flyers.length > 0} />
            <span aria-hidden="true">→</span>
            <Node
              name="Interested systems"
              role="Their supported interfaces"
              sub={sent ? "Event received" : "Waiting for an event"}
              lit={sent}
            />
          </div>
          <p className="foundation-detail">{c.detail}</p>
        </div>
        <AnimatePresence>
          {flyers.map((f) => (
            <Particle
              key={f.id}
              from={f.from}
              to={f.to}
              duration={0.7}
              onDone={() => {
                remove(f.id);
                setSent(true);
              }}
            >
              <MsgToken label={f.label} />
            </Particle>
          ))}
        </AnimatePresence>
      </Stage>
      <ControlBar>
        <div className="control-row">
          {connections.map((item, i) => (
            <Btn
              key={item.id}
              variant={i === selected ? "primary" : "default"}
              onClick={() => {
                clear();
                setSelected(i);
                setSent(false);
              }}
            >
              {item.id}
            </Btn>
          ))}
          <Btn
            onClick={() => {
              setSent(false);
              emit({
                tone: "green",
                from: { x: 20, y: 51 },
                to: { x: 80, y: 51 },
                label: "Inspection completed",
              });
            }}
          >
            Send an example event
          </Btn>
        </div>
      </ControlBar>
      <Card title="Explore further">
        <div className="prose">
          <p>
            <a
              href="https://docs.solace.com/API/Component-Maps.htm"
              target="_blank"
              rel="noreferrer"
            >
              Solace interfaces and APIs
            </a>{" "}
            ·{" "}
            <a
              href="https://docs.solace.com/Messaging/Guaranteed-Msg/Partitioned-Queue-Messaging.htm"
              target="_blank"
              rel="noreferrer"
            >
              Partitioned queues
            </a>{" "}
            ·{" "}
            <a
              href="https://docs.solace.com/Messaging/Direct-Msg/Direct-Messages.htm"
              target="_blank"
              rel="noreferrer"
            >
              Direct delivery and message eliding
            </a>
          </p>
        </div>
      </Card>
    </Layout>
  );
}
