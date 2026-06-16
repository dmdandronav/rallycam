"""
RallyCam — Flask backend
--------------------------
Pose tracking happens entirely in the BROWSER (MediaPipe Tasks Vision) —
no video is ever sent to this server. This backend takes a small JSON
summary of rep-by-rep angle data (min / max / avg / samples) and returns
consistency-focused coaching via an LLM.

Drills supported:
  freeThrow  — right shoulder-elbow-wrist release angle
  swingArm   — arm follow-through angle at finish
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = Flask(__name__)
CORS(app)

client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
    base_url=os.environ.get("BASE_URL") or os.environ.get("OPENAI_BASE_URL") or None,
)
MODEL = os.environ.get("MODEL", os.environ.get("MODEL_NAME", "gpt-4o-mini"))

SYSTEM_PROMPT = os.environ.get(
    "SYSTEM_PROMPT",
    (
        "You are a sports performance coach focused on consistency, not perfection. "
        "When given rep-by-rep angle data, comment on the spread (tighter is better "
        "for repeatable motions) and give one specific cue for the next set. "
        "Keep it to 2-3 sentences. Reference the actual numbers."
    ),
)

# Rough "good form" ranges (degrees) for each drill.
REFERENCE_RANGES = {
    "freeThrow": {
        "good_min": 80,
        "good_max": 100,
        "note": "a consistent free throw typically has a release elbow angle in the 80-100° range",
    },
    "swingArm": {
        "good_min": 150,
        "good_max": 180,
        "note": "a full follow-through keeps the arm near full extension (150-180°) at the finish",
    },
}


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "model": MODEL})


@app.route("/api/analyze-pose", methods=["POST"])
def analyze_pose():
    """
    Body: { "exercise": "freeThrow", "samples": 8, "min": 82.1, "max": 97.4, "avg": 89.6 }
    Returns: { "feedback": "..." }
    """
    data = request.get_json(force=True)
    exercise = data.get("exercise", "freeThrow")
    ref = REFERENCE_RANGES.get(exercise, {})

    prompt = (
        f"Athlete performed {data.get('samples', 0)} reps of '{exercise}'. "
        f"Release angle: min {data.get('min', 0):.1f}°, max {data.get('max', 0):.1f}°, "
        f"avg {data.get('avg', 0):.1f}° (spread: {(data.get('max', 0) - data.get('min', 0)):.1f}°). "
        f"Reference: {ref.get('note', '')}. Comment on their consistency and give one actionable cue."
    )

    completion = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.6,
    )

    return jsonify({"feedback": completion.choices[0].message.content})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
