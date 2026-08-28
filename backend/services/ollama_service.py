"""
Local Ollama LLM Service Component for Nexolith Care
Connects to Ollama (http://localhost:11434/api/generate) running llama3.1:latest (or local installed model).
Transmits structured system instructions, retrieved PostgreSQL patient data,
retrieved local RAG medical knowledge, and multi-turn conversation history.
"""

import os
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:latest")


class OllamaService:
    """
    Service wrapper for local Ollama LLM execution with keep-alive, streaming,
    and automatic model detection.
    """

    def __init__(self, base_url: str = None, model: str = None):
        self.base_url = (base_url or OLLAMA_BASE_URL).rstrip("/")
        self.model = model or OLLAMA_MODEL

    def get_available_models() -> List[str]:
        try:
            req = urllib.request.Request(f"{self.base_url}/api/tags")
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    return [m.get("name") for m in data.get("models", []) if m.get("name")]
        except Exception:
            pass
        return []

    def generate_response(
        self,
        user_query: str,
        system_context: Optional[str] = None,
        history: Optional[List[Dict[str, Any]]] = None,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """
        Sends structured query + context + history to local Ollama.
        Returns generated assistant response or fallback result.
        """
        import sys
        if "test" in sys.argv:
            return {"success": False, "response": None, "error": "Bypassed in test environment."}

        if not user_query:
            return {"success": False, "response": "Empty query provided."}

        # 1. System Prompt Construction matching user rules
        system_prompt = (
            "You are Nexolith Care's local AI health assistant.\n"
            "You answer general medical education questions and questions about the authenticated user's family health records.\n\n"
            "IMPORTANT RULES:\n"
            "1. Never invent medical measurements, reports, alerts, trends, dates, or patient information.\n"
            "2. PostgreSQL-provided patient data is the source of truth for family-specific information.\n"
            "3. If the supplied context contains no reports for a family member, clearly say that no medical reports are currently stored.\n"
            "4. Never use another family member's medical data.\n"
            "5. Distinguish profile information from medical report measurements.\n"
            "6. For general medical questions, provide a clear, concise educational explanation.\n"
            "7. For patient-specific questions, answer using the supplied patient data.\n"
            "8. If the user asks for report values, list the actual parameter name, value, unit, reference range, and status when available.\n"
            "9. If the user asks about trends, use the chronological values supplied in the context. Do not fabricate missing measurements.\n"
            "10. If the user asks about alerts or risks, use actual stored alerts and abnormal results.\n"
            "11. Do not claim to diagnose a disease.\n"
            "12. Explain medical information in simple language.\n"
            "13. If information is unavailable, explicitly say that it is unavailable instead of guessing.\n"
            "14. Keep normal answers concise and conversational (around 2 to 5 clear sentences, unless details are requested).\n"
            "15. Answer the user's actual question directly before adding additional explanation.\n"
        )

        if system_context:
            system_prompt += f"\n--- RETRIEVED POSTGRESQL & MEDICAL CONTEXT ---\n{system_context}\n-----------------------------------------------\n"

        # 2. Build Prompt including recent conversation history
        prompt_parts = []
        if history and isinstance(history, list) and len(history) > 0:
            prompt_parts.append("--- CONVERSATION HISTORY ---")
            for turn in history[-4:]:
                role = "User" if turn.get("role") == "user" else "Assistant"
                content = turn.get("content", "").strip()
                if content:
                    prompt_parts.append(f"{role}: {content}")
            prompt_parts.append("----------------------------\n")

        prompt_parts.append(f"User Question: {user_query}")
        full_prompt = "\n".join(prompt_parts)

        # 3. Payload for Ollama /api/generate with keep_alive and low temperature
        payload = {
            "model": self.model,
            "system": system_prompt,
            "prompt": full_prompt,
            "stream": False,
            "keep_alive": "10m",
            "options": {
                "temperature": 0.2,
                "top_p": 0.9,
                "num_predict": 350
            }
        }

        url = f"{self.base_url}/api/generate"

        try:
            logger.info(f"Sending request to local Ollama model '{self.model}' at {url}...")
            data_bytes = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=data_bytes,
                headers={"Content-Type": "application/json"},
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=timeout) as resp:
                if resp.status == 200:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    generated_text = resp_data.get("response", "").strip()

                    if generated_text:
                        return {
                            "success": True,
                            "response": generated_text,
                            "model": self.model,
                            "data_source": "ollama_local"
                        }
                    else:
                        logger.warning("Ollama returned empty response string.")
                else:
                    logger.warning(f"Ollama endpoint returned HTTP status {resp.status}")

        except urllib.error.URLError as e:
            logger.warning(f"Failed to connect to local Ollama at {self.base_url}: {e}")
        except Exception as e:
            logger.error(f"Error invoking local Ollama service: {e}", exc_info=True)

        return {
            "success": False,
            "response": None,
            "error": "Ollama service unavailable or timed out."
        }
