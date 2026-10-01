"""
Summarization Service — generates meeting summaries and action items.

Uses an LLM API (Gemini / OpenAI) when an API key is configured;
falls back to a basic extractive summarizer otherwise.
"""

import json
import re
import requests
from typing import Optional

import config


# ── Public API ──────────────────────────────────────────────────────────

def generate_summary(transcript: str) -> dict:
    """
    Generate a structured meeting summary from the transcript.
    Returns dict with keys: overview, key_points, decisions, action_items,
    deadlines, follow_up_questions, method.
    """
    if not transcript or not transcript.strip():
        return _empty_summary("No transcript text available.")

    # Try LLM-powered summary first
    if config.LLM_API_KEY:
        try:
            return _llm_summary(transcript)
        except Exception as e:
            print(f"[SummarizationService] LLM summarization failed: {e}")
            print("[SummarizationService] Falling back to extractive summary.")

    # Extractive fallback
    return _extractive_summary(transcript)


# ── LLM-powered summarization ──────────────────────────────────────────

def _llm_summary(transcript: str) -> dict:
    """Call the configured LLM API to produce a structured summary."""
    prompt = _build_prompt(transcript)

    if config.LLM_PROVIDER == "gemini":
        return _call_gemini(prompt)
    elif config.LLM_PROVIDER == "openai":
        return _call_openai(prompt)
    else:
        raise ValueError(f"Unknown LLM provider: {config.LLM_PROVIDER}")


def _build_prompt(transcript: str) -> str:
    # Truncate very long transcripts to stay within token limits
    max_chars = 12000
    truncated = transcript[:max_chars]
    if len(transcript) > max_chars:
        truncated += "\n\n[... transcript truncated for summarization ...]"

    return f"""Analyze the following meeting transcript and produce a JSON object with exactly these keys:

- "overview": A 2-3 sentence summary of the meeting.
- "key_points": An array of the most important discussion points (strings).
- "decisions": An array of decisions made during the meeting (strings). Only include decisions explicitly stated or clearly agreed upon.
- "action_items": An array of objects, each with "task" (string), "assignee" (string or "Unassigned"), and "deadline" (string or "Not specified").
- "deadlines": An array of any deadlines mentioned (strings).
- "follow_up_questions": An array of questions that remain unanswered or need follow-up (strings).

Rules:
- Do NOT invent any decisions, deadlines, or action items not supported by the text.
- If nothing fits a category, use an empty array.
- Mark uncertain information with "[uncertain]" prefix.
- Return ONLY valid JSON. No markdown fences, no explanation.

Transcript:
\"\"\"
{truncated}
\"\"\"
"""


def _call_gemini(prompt: str) -> dict:
    """Call the Google Gemini API."""
    url = f"{config.LLM_API_URL}?key={config.LLM_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2048,
        }
    }
    resp = requests.post(url, json=payload, timeout=60)
    resp.raise_for_status()

    data = resp.json()
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    return _parse_llm_json(text, method="gemini")


def _call_openai(prompt: str) -> dict:
    """Call the OpenAI-compatible API."""
    url = config.LLM_API_URL or "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {config.LLM_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [
            {"role": "system", "content": "You are a meeting notes assistant. Return only valid JSON."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 2048,
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()

    data = resp.json()
    text = data["choices"][0]["message"]["content"]
    return _parse_llm_json(text, method="openai")


def _parse_llm_json(text: str, method: str) -> dict:
    """Parse JSON from the LLM response, stripping markdown fences."""
    text = text.strip()
    # Remove markdown code fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    parsed = json.loads(text)

    # Normalize keys
    result = {
        "overview": parsed.get("overview", ""),
        "key_points": parsed.get("key_points", []),
        "decisions": parsed.get("decisions", []),
        "action_items": parsed.get("action_items", []),
        "deadlines": parsed.get("deadlines", []),
        "follow_up_questions": parsed.get("follow_up_questions", []),
        "method": method,
    }
    return result


# ── Extractive fallback ─────────────────────────────────────────────────

def _extractive_summary(transcript: str) -> dict:
    """
    Basic extractive summarization when no LLM is available.
    Picks important sentences and extracts simple action items.
    """
    sentences = _split_sentences(transcript)

    if len(sentences) == 0:
        return _empty_summary("Transcript contained no recognizable sentences.")

    # Overview: first few sentences
    overview_count = min(3, len(sentences))
    overview = " ".join(sentences[:overview_count])

    # Key points: sentences with signal words
    key_signal = {"important", "key", "main", "critical", "significant",
                  "decided", "agreed", "conclusion", "summary", "result",
                  "goal", "objective", "plan", "strategy", "update"}
    key_points = []
    for s in sentences:
        lower = s.lower()
        if any(word in lower for word in key_signal):
            key_points.append(s)
        if len(key_points) >= 8:
            break

    if not key_points and len(sentences) > 3:
        step = max(1, len(sentences) // 5)
        key_points = sentences[::step][:5]

    # Action items
    action_signals = {"need to", "should", "must", "will", "action",
                      "follow up", "follow-up", "assign", "task",
                      "deadline", "todo", "to-do", "complete by",
                      "responsible", "take care", "make sure"}
    action_items = []
    for s in sentences:
        lower = s.lower()
        if any(sig in lower for sig in action_signals):
            action_items.append({
                "task": s,
                "assignee": "Unassigned",
                "deadline": "Not specified",
            })
        if len(action_items) >= 10:
            break

    # Decisions
    decision_signals = {"decided", "agreed", "approved", "confirmed",
                        "resolved", "conclusion", "finalized"}
    decisions = []
    for s in sentences:
        lower = s.lower()
        if any(sig in lower for sig in decision_signals):
            decisions.append(s)
        if len(decisions) >= 5:
            break

    # Deadlines
    deadline_patterns = [
        r"(?:by|before|until|due|deadline)\s+\w+\s+\d{1,2}",
        r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}",
        r"(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)",
        r"(?:end of (?:day|week|month|quarter|year))",
        r"(?:next (?:week|month|monday|tuesday|wednesday|thursday|friday))",
    ]
    deadlines = []
    for s in sentences:
        for pattern in deadline_patterns:
            if re.search(pattern, s.lower()):
                deadlines.append(s)
                break
        if len(deadlines) >= 5:
            break

    # Follow-up questions
    questions = [s for s in sentences if s.strip().endswith("?")][:5]

    return {
        "overview": overview,
        "key_points": key_points,
        "decisions": decisions,
        "action_items": action_items,
        "deadlines": deadlines,
        "follow_up_questions": questions,
        "method": "extractive",
    }


def _split_sentences(text: str) -> list[str]:
    """Roughly split text into sentences."""
    raw = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in raw if len(s.strip()) > 10]


def _empty_summary(reason: str) -> dict:
    return {
        "overview": reason,
        "key_points": [],
        "decisions": [],
        "action_items": [],
        "deadlines": [],
        "follow_up_questions": [],
        "method": "none",
    }
