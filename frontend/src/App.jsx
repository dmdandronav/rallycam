import React, { useRef, useState } from "react";
import PoseTracker, { EXERCISES } from "./PoseTracker.jsx";

export default function App() {
  const [exercise, setExercise] = useState("freeThrow");
  const [feedback, setFeedback] = useState(
    "Move for a few seconds, then hit \"Get Feedback\" to see how the analysis works."
  );
  const [loading, setLoading] = useState(false);
  const [repChart, setRepChart] = useState(null); // { angles, min, max, avg }
  const trackerRef = useRef(null);

  async function getFeedback() {
    const summary = trackerRef.current?.getSummary();
    const reps = trackerRef.current?.repHistory?.current ?? [];

    if (!summary) {
      setFeedback("Not enough movement data yet — make sure your full body is visible and move around a bit first.");
      return;
    }

    // Update rep chart display
    if (reps.length > 0) {
      const min = Math.min(...reps);
      const max = Math.max(...reps);
      const avg = reps.reduce((s, a) => s + a, 0) / reps.length;
      setRepChart({ angles: [...reps], min, max, avg });
    }

    setLoading(true);
    try {
      const res = await fetch("/api/analyze-pose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...summary, repHistory: reps }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFeedback(data.feedback);
    } catch (err) {
      setFeedback(
        "Couldn't reach the backend. Make sure the Flask server is running on port 5000 and your API key is set."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10 gap-6">
      <header className="text-center max-w-xl">
        <h1 className="font-[var(--font-display)] text-3xl tracking-tight">RallyCam</h1>
        <p className="text-sm text-[var(--color-text)]/60 mt-1">
          See your consistency, rep by rep.
        </p>
      </header>

      <div className="flex gap-2">
        {Object.entries(EXERCISES).map(([key, ex]) => (
          <button
            key={key}
            onClick={() => setExercise(key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              exercise === key
                ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)]"
                : "border-[var(--color-line)] text-[var(--color-text)]/70"
            }`}
          >
            {ex.label}
          </button>
        ))}
      </div>

      <PoseTracker ref={trackerRef} exercise={exercise} />

      <button
        onClick={getFeedback}
        disabled={loading}
        className="rounded-xl bg-[var(--color-accent)] text-black font-medium px-6 py-2 text-sm disabled:opacity-50"
      >
        {loading ? "Analyzing…" : "Get Feedback"}
      </button>

      {repChart && repChart.angles.length > 0 && (
        <div className="max-w-xl w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-4">
          <p className="text-xs text-[var(--color-text)]/50 mb-3 uppercase tracking-widest">Rep angle history</p>
          <div className="flex items-end gap-1 h-16">
            {repChart.angles.map((angle, i) => (
              <div
                key={i}
                title={`${angle.toFixed(0)}°`}
                style={{ height: `${(angle / 180) * 100}%` }}
                className="flex-1 rounded-sm bg-[var(--color-accent)] opacity-80 min-h-[2px]"
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-[var(--color-text)]/60">
            <span>min {repChart.min.toFixed(0)}°</span>
            <span>avg {repChart.avg.toFixed(0)}°</span>
            <span>max {repChart.max.toFixed(0)}°</span>
          </div>
        </div>
      )}

      <div className="max-w-xl w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-4 text-sm leading-relaxed">
        {feedback}
      </div>
    </div>
  );
}
