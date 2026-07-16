# EDA Primer — Interactive Event-Driven Architecture for Industrial Systems

An interactive, front-end-only web app that teaches core Event-Driven Architecture (EDA)
messaging patterns using manufacturing / industrial scenarios. No broker connection is
required — every lesson is a self-contained, animated simulation.

Built to mirror the Solace branding and dark "presentation" aesthetic of the neighboring
`event-simulation` studio.

## Stack

- **Vite** + **React 18** + **TypeScript**
- **framer-motion** for reactive particle/queue animations
- Zero backend — all state lives in the browser

## Run

```bash
npm install
npm run dev      # http://127.0.0.1:5174
npm run build    # type-check + production bundle to dist/
npm run preview  # serve the production build
```

## Lessons

| # | Lesson | Teaches |
|---|--------|---------|
| — | Why EDA? | Landing page: "not all messages are equal" |
| 1 | Fire and Forget | Best-effort telemetry (PLC → Ignition Edge → broker); nothing stored for absent consumers |
| 2 | Retained State | Current state ("what is true now?") vs. events ("what happened?") |
| 3 | MQTT QoS & Business Success | QoS 1 holds/redelivers to an offline consumer, but transport ack ≠ committed business processing |
| 4 | Topics, Subscriptions & Durable Queues | Publishers publish to topics; queues attract via subscriptions (`*`, `>` wildcards) |
| 5 | Competing Consumers | One vision-inspection queue distributes parts across inspector instances |
| 6 | Reliability: Retry, TTL & DMQ | Retry, TTL countdown, and dead-message isolation policies |
| 7 | REST Messaging | HTTP POST publishes to the broker; queues deliver to a REST endpoint, dequeuing only on 2xx |
| 8 | Fan-Out & Mixed Delivery | One event, many consumers — direct / durable-queue / queue-backed HTTP contracts coexisting |
| 9 | Event Mesh | Multi-broker mesh, subscription propagation, WAN + consumer-outage store-and-forward |

Each lesson follows the same shape: an animated **stage**, a **controls** panel, a
**"Predict First"** prompt, the **scenario**, and a **"What you learn"** summary.

## Structure

```
src/
  App.tsx                  # shell: sidebar nav + lesson router (hash-based)
  styles.css               # Solace dark design system
  assets/solace-logo.svg
  components/
    kit.tsx                # Broker, Node, MsgToken, controls, Stage, Particle, cards…
    useFlow.ts             # in-flight particle manager
    topics.ts              # Solace-style topic matcher (* / >)
  lessons/
    registry.ts            # lesson metadata + component map (index order)
    Intro.tsx
    Lesson01…Lesson09*.tsx # note: Lesson07Rest = lesson 7, Lesson07FanOutMixed = lesson 8, Lesson09EventMesh = lesson 9
```

## Notes

- Deep-linkable: each lesson has a URL hash (e.g. `#event-mesh`); browser back/forward works.
- The topic matcher and every simulation are pure front-end logic — safe to demo offline.
