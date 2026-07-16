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
          Event-Driven Architecture,
          <br />
          <span className="accent">learned by doing.</span>
        </h1>
        <p>
          A hands-on primer for engineers in manufacturing and industrial systems. No broker to
          install, no code to write — just interactive lessons that show <em>why</em> different
          messaging patterns exist and where each one fits.
        </p>
      </div>

      <div className="intro-big">
        <div className="quote">
          Not all messages are equal.
          <br />
          Different operational and business outcomes require <em>different messaging behaviors.</em>
        </div>
      </div>

      <div className="intro-why">
        <div className="why-card">
          <div className="why-icon">📡</div>
          <h4>Beyond "just use MQTT"</h4>
          <p>
            Publish/subscribe is a great start — but best-effort telemetry, durable work orders, and
            cross-site distribution each demand different guarantees. Knowing which to use is the
            skill.
          </p>
        </div>
        <div className="why-card">
          <div className="why-icon">🏭</div>
          <h4>Grounded in the plant floor</h4>
          <p>
            Every lesson uses a real industrial scenario: PLC telemetry, machine state, MES work
            orders, quality events, and multi-site plants — not abstract "foo/bar" topics.
          </p>
        </div>
        <div className="why-card">
          <div className="why-icon">🔗</div>
          <h4>From pattern to platform</h4>
          <p>
            Each pattern maps naturally onto what a Solace event broker and event mesh provide, so
            you see how the concepts scale from one line to a global mesh.
          </p>
        </div>
      </div>

      <div className="intro-cta center">
        <Btn variant="primary" onClick={onStart}>
          Start Lesson 1: Fire and Forget →
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
