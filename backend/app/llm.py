import os
import json
import requests

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

_SYSTEM = (
    "You are a clinical NLP expert. Analyze medical reports and extract structured "
    "information. Always respond with valid JSON only — no extra text, no markdown."
)

_PROMPT = """\
Analyze this clinical report and respond with JSON in exactly this format:
{
  "summary": "concise clinical summary in ~100 words",
  "conditions": [
    {"name": "condition name", "code": "ICD-10 code, or empty string if unknown"}
  ],
  "severity": "mild or moderate or severe"
}

Report:
"""


def analyze_report(text: str) -> dict:
    """Send clinical text to a local Ollama model and return structured results."""
    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/chat",
        json={
            "model": OLLAMA_MODEL,
            "messages": [
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": _PROMPT + text},
            ],
            "format": "json",   # forces Ollama to return valid JSON
            "stream": False,
            "options": {"temperature": 0.1},
        },
        timeout=120,
    )
    response.raise_for_status()
    content = response.json()["message"]["content"]
    return json.loads(content)
