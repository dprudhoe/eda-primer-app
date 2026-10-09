import logoUrl from "../assets/solace-logo.svg";
import { LESSONS } from "./registry";
import { Btn } from "../components/kit";

export default function Intro({
  onStart,
  onGo,
}: {
  onStart: () => void;
  onGo: (id: string) => void;
}) {
  return (
    <div className="intro">
      <div className="intro-hero">
        <img className="intro-logo" src={logoUrl} alt="Solace" />
        <h1>
          Event-Driven Manufacturing,
          <br />
          <span className="accent">explored interactively.</span>
        </h1>
        <p>
          How do machines, production systems, and business applications share what is happening
          across a factory? Explore event-driven architecture one idea at a time, with interactive
          manufacturing examples. Start with the basics, then build toward reliable connected
          operations. No messaging experience, broker installation, or coding required.
        </p>
      </div>

      <div className="intro-big">
        <div className="quote">
          Something happens in the factory.
          <br />
          How do the systems that care <em>find out and respond?</em>
        </div>
      </div>

      <div className="intro-why">
        <div className="why-card">
          <div className="why-icon">📡</div>
          <h4>See why systems need to connect</h4>
          <p>
            Start with familiar factory applications. Watch how they interact through individual
            integrations, then explore how a shared broker helps them exchange events.
          </p>
        </div>
        <div className="why-card">
          <div className="why-icon">🏭</div>
          <h4>Learn what an event means</h4>
          <p>
            A temperature is measured, a machine reports a fault, or material is consumed.
            Discover how these everyday occurrences become events that interested systems can
            subscribe to and act on.
          </p>
        </div>
        <div className="why-card">
          <div className="why-icon">🔗</div>
          <h4>Build understanding by trying things</h4>
          <p>
            Publish an event, change a subscription, or take a consumer offline. As each idea
            becomes familiar, explore how delivery, queues, and recovery help systems keep working.
          </p>
        </div>
      </div>

      <div className="intro-cta center">
        <Btn variant="primary" onClick={onStart}>
          Start Lesson 1: {LESSONS[0].title} →
        </Btn>
      </div>

      <div className="intro-lessons">
        {LESSONS.map((l) => (
          <button className="intro-lesson-card" key={l.id} onClick={() => onGo(l.id)}>
            <span className="n">{l.index}</span>
            <div>
              <h4>{l.title}</h4>
              <p>{l.goal}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
