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
| — | Introduction | Overview and lesson navigation |
| 1 | Why Event-Driven Architecture? | Point-to-point factory integrations versus a shared event broker |
| 2 | What Is an Event? | Device observations, operational occurrences, business activities, commands, and requests |
| 3 | What Does an Event Broker Do? | Publishers, subscription matching, and interested consumers |
| 4 | How Do Applications Connect? | MQTT, AMQP 1.0, JMS, REST messaging, and SMF |
| 5 | Current State or Every Event? | Whether a consumer needs the latest value or every occurrence |
| 6 | Direct and Guaranteed Delivery | Live telemetry versus durable business events during consumer outages |
| 7 | Topics, Subscriptions & Durable Queues | Topic subscriptions and durable endpoints |
| 8 | Competing Consumers | Independent vibration-analysis windows distributed across consumers |
| 9 | Retained State | Current state versus historical events |
| 10 | MQTT QoS & Business Success | Transport acknowledgement versus committed business processing |
| 11 | Reliability: Retry, TTL & DMQ | Retries, expiration, and failed-message isolation |
| 12 | REST Messaging | HTTP publishing and queue-backed HTTP delivery |
| 13 | Event Reuse & Mixed Delivery | Independent consumers with different delivery contracts |
| 14 | Event Mesh | Multi-broker, cross-site store-and-forward |
| 15 | The Manufacturing Ecosystem | All patterns together across factory, HQ, and AWS |

Each lesson follows the same shape: a **scenario**, an animated **stage**, a
**controls** panel, a **"Key takeaways"** summary, and a closing **knowledge check**.

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
    LessonFoundations.tsx  # four introductory lessons
    Lesson00…Lesson10*.tsx # existing pattern lessons; display order is defined in registry.ts
```

## Notes

- Deep-linkable: each lesson has a URL hash (e.g. `#event-mesh`); browser back/forward works.
- The topic matcher and every simulation are pure front-end logic — safe to demo offline.
