import { ComponentType } from "react";
import {
  LessonWhyEDA,
  LessonWhatIsEvent,
  LessonWhatIsBroker,
  LessonConnections,
} from "./LessonFoundations";
import Lesson00 from "./Lesson00EventPatterns";
import Lesson01 from "./Lesson01FireAndForget";
import Lesson02 from "./Lesson02RetainedState";
import Lesson03 from "./Lesson03QoS";
import Lesson04 from "./Lesson04Queues";
import LessonTopics from "./LessonTopics";
import Lesson05 from "./Lesson05CompetingConsumers";
import Lesson06 from "./Lesson06Reliability";
import Lesson07 from "./Lesson07Rest";
import Lesson08 from "./Lesson07FanOutMixed";
import Lesson09 from "./Lesson09EventMesh";
import Lesson10 from "./Lesson10Ecosystem";

export type Lesson = {
  id: string;
  index: number;
  title: string;
  short: string;
  goal: string;
  Component: ComponentType;
};

const lessons: Omit<Lesson, "index">[] = [
  {
    id: "why-eda",
    title: "Why Event-Driven Architecture?",
    short: "From spaghetti to shared events",
    goal: "Compare point-to-point factory integrations with applications connected through an event broker.",
    Component: LessonWhyEDA,
  },
  {
    id: "what-is-an-event",
    title: "What Is an Event?",
    short: "From telemetry to business activities",
    goal: "Explore events, producers, subscribers, and the difference between facts, commands, and requests.",
    Component: LessonWhatIsEvent,
  },
  {
    id: "what-is-a-broker",
    title: "What Does an Event Broker Do?",
    short: "Publish once, route by interest",
    goal: "Publish factory events and watch subscriptions determine which applications receive them.",
    Component: LessonWhatIsBroker,
  },
  {
    id: "messaging-interfaces",
    title: "How Do Applications Connect?",
    short: "MQTT, AMQP, JMS, REST & SMF",
    goal: "Understand the roles of messaging protocols and APIs in a connected manufacturing system.",
    Component: LessonConnections,
  },
  {
    id: "event-patterns",
    title: "Current State or Every Event?",
    short: "What must consumers preserve?",
    goal: "Understand why some consumers need only the latest value while others must receive and handle every occurrence.",
    Component: Lesson00,
  },
  {
    id: "fire-and-forget",
    title: "Direct and Guaranteed Delivery",
    short: "Fresh updates or durable work?",
    goal: "Compare live Direct delivery with durable Guaranteed delivery during a consumer outage.",
    Component: Lesson01,
  },
  {
    id: "topics-subscriptions",
    title: "Topics and Subscriptions",
    short: "Message metadata and matching interest",
    goal: "Explore topic metadata and exact or wildcard subscriptions across independent consumers.",
    Component: LessonTopics,
  },
  {
    id: "queues",
    title: "Durable Queues",
    short: "Store, deliver, acknowledge",
    goal: "Watch one consumer application’s queue retain matching events through outages and remove them after acknowledgement.",
    Component: Lesson04,
  },
  {
    id: "competing-consumers",
    title: "Competing Consumers",
    short: "Parallel vibration analysis",
    goal: "Understand how a single queue distributes work across multiple consumer instances.",
    Component: Lesson05,
  },
  {
    id: "retained-state",
    title: "Retained State",
    short: "Current truth vs. what happened",
    goal: "Understand the difference between the current state of something and a historical event.",
    Component: Lesson02,
  },
  {
    id: "qos",
    title: "MQTT QoS & Business Success",
    short: "Delivery ≠ processing",
    goal: "Understand the difference between successful message transport and successful business processing.",
    Component: Lesson03,
  },
  {
    id: "reliability",
    title: "Reliability: Retry, TTL & DMQ",
    short: "Handling failed & expired messages",
    goal: "Understand how messaging policies control retries, expiration, and failed-message isolation.",
    Component: Lesson06,
  },
  {
    id: "rest",
    title: "REST Messaging",
    short: "HTTP in and out of the broker",
    goal: "Understand how HTTP clients can publish to a broker, and how queues deliver to REST endpoints, dequeuing only on a 2xx response.",
    Component: Lesson07,
  },
  {
    id: "fan-out",
    title: "Event Reuse & Mixed Delivery",
    short: "One event, many contracts",
    goal: "Understand how one published event can independently serve many consumers — each with the delivery guarantee it needs.",
    Component: Lesson08,
  },
  {
    id: "event-mesh",
    title: "Event Mesh",
    short: "Events across sites & clouds",
    goal: "Understand how events move reliably across plants, data centers, edge environments, and multiple clouds.",
    Component: Lesson09,
  },
  {
    id: "ecosystem",
    title: "The Manufacturing Ecosystem",
    short: "All patterns in one system",
    goal: "Explore connected operations across factory, HQ, and cloud as applications consume events, act, and publish the next step in coordinated manufacturing workflows.",
    Component: Lesson10,
  },
];

export const LESSONS: Lesson[] = lessons.map((lesson, index) => ({
  ...lesson,
  index: index + 1,
}));
