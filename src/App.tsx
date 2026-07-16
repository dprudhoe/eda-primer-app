import { useEffect, useState } from "react";
import logoUrl from "./assets/solace-logo.svg";
import { LESSONS } from "./lessons/registry";
import Intro from "./lessons/Intro";
import { Btn } from "./components/kit";

export default function App() {
  const [active, setActive] = useState<string>("intro");

  // Support deep links + browser back/forward via hash (#lesson-id)
  useEffect(() => {
    const sync = () => {
      const fromHash = window.location.hash.replace("#", "");
      if (fromHash && (fromHash === "intro" || LESSONS.some((l) => l.id === fromHash))) {
        setActive(fromHash);
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const go = (id: string) => {
    setActive(id);
    window.location.hash = id;
    const main = document.querySelector(".main");
    if (main) main.scrollTop = 0;
  };

  const lesson = LESSONS.find((l) => l.id === active) || null;
  const idx = lesson ? LESSONS.findIndex((l) => l.id === lesson.id) : -1;
  const prev = idx > 0 ? LESSONS[idx - 1] : null;
  const next = idx >= 0 && idx < LESSONS.length - 1 ? LESSONS[idx + 1] : null;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-head">
          <img className="sidebar-logo" src={logoUrl} alt="Solace" />
          <div className="sidebar-kicker">Interactive Primer</div>
          <div className="sidebar-title">Event-Driven Architecture for Industrial Systems</div>
        </div>
        <nav className="nav">
          <button
            className={`nav-item intro ${active === "intro" ? "active" : ""}`}
            onClick={() => go("intro")}
          >
            <span className="nav-index">◆</span>
            <span className="nav-label">
              Why EDA?
              <small>Start here</small>
            </span>
          </button>
          <div className="nav-section">Lessons</div>
          {LESSONS.map((l) => (
            <button
              key={l.id}
              className={`nav-item ${active === l.id ? "active" : ""}`}
              onClick={() => go(l.id)}
            >
              <span className="nav-index">{l.index}</span>
              <span className="nav-label">
                {l.title}
                <small>{l.short}</small>
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main">
        {active === "intro" || !lesson ? (
          <Intro onStart={() => go(LESSONS[0].id)} onGo={go} />
        ) : (
          <div className="lesson">
            <header className="lesson-header">
              <div className="lesson-kicker">Lesson {lesson.index}</div>
              <h1 className="lesson-title">{lesson.title}</h1>
              <p className="lesson-goal">{lesson.goal}</p>
            </header>

            <lesson.Component key={lesson.id} />

            <footer className="lesson-footer">
              {prev ? (
                <Btn variant="ghost" onClick={() => go(prev.id)}>
                  ← Lesson {prev.index}: {prev.title}
                </Btn>
              ) : (
                <Btn variant="ghost" onClick={() => go("intro")}>
                  ← Introduction
                </Btn>
              )}
              <div className="spacer" />
              {next ? (
                <Btn variant="primary" onClick={() => go(next.id)}>
                  Lesson {next.index}: {next.title} →
                </Btn>
              ) : null}
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}
