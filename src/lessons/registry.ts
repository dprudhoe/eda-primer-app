import { ComponentType } from "react";
import Lesson00 from "./Lesson00EventPatterns";
import Lesson01 from "./Lesson01FireAndForget";
import Lesson02 from "./Lesson02RetainedState";
import Lesson03 from "./Lesson03QoS";
import Lesson04 from "./Lesson04Queues";
import Lesson05 from "./Lesson05CompetingConsumers";
import Lesson06 from "./Lesson06Reliability";
import Lesson07 from "./Lesson07Rest";
import Lesson08 from "./Lesson07FanOutMixed";
import Lesson09 from "./Lesson09EventMesh";

export type Lesson = {
  id: string;
  index: number;
  title: string;
  short: string;
  goal: string;
  Component: ComponentType;
};

export const LESSONS: Lesson[] = [
  {
    id: "fire-and-forget",
    index: 1,
    title: "Fire and Forget",
    short: "Best-effort live delivery",
    goal: "Understand best-effort messaging and why it is appropriate for high-frequency telemetry.",
    Component: Lesson01,
  },
  {
    id: "event-patterns",
    index: 2,
    title: "Current State or Every Event?",
    short: "What must consumers preserve?",
    goal: "Understand why some consumers need only the latest value while others must receive and handle every occurrence.",
    Component: Lesson00,
  },
  {
    id: "retained-state",
    index: 3,
    title: "Retained State",
    short: "Current truth vs. what happened",
    goal: "Understand the difference between the current state of something and a historical event.",
    Component: Lesson02,
  },
  {
    id: "qos",
    index: 4,
    title: "MQTT QoS & Business Success",
    short: "Delivery ≠ processing",
    goal: "Understand the difference between successful message transport and successful business processing.",
    Component: Lesson03,
  },
  {
    id: "queues",
    index: 5,
    title: "Topics, Subscriptions & Durable Queues",
    short: "How queues attract events",
    goal: "Understand that publishers publish to topics, while queues attract messages through subscriptions.",
    Component: Lesson04,
  },
  {
    id: "competing-consumers",
    index: 6,
    title: "Competing Consumers",
    short: "Parallel vibration analysis",
    goal: "Understand how a single queue distributes work across multiple consumer instances.",
    Component: Lesson05,
  },
  {
    id: "reliability",
    index: 7,
    title: "Reliability: Retry, TTL & DMQ",
    short: "Handling failed & expired messages",
    goal: "Understand how messaging policies control retries, expiration, and failed-message isolation.",
    Component: Lesson06,
  },
  {
    id: "rest",
    index: 8,
    title: "REST Messaging",
    short: "HTTP in and out of the broker",
    goal: "Understand how HTTP clients can publish to a broker, and how queues deliver to REST endpoints, dequeuing only on a 2xx response.",
    Component: Lesson07,
  },
  {
    id: "fan-out",
    index: 9,
    title: "Fan-Out & Mixed Delivery",
    short: "One event, many contracts",
    goal: "Understand how one published event can independently serve many consumers — each with the delivery guarantee it needs.",
    Component: Lesson08,
  },
  {
    id: "event-mesh",
    index: 10,
    title: "Event Mesh",
    short: "Events across sites & clouds",
    goal: "Understand how events move reliably across plants, data centers, edge environments, and multiple clouds.",
    Component: Lesson09,
  },
];
