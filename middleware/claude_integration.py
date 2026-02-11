import requests
from typing import Dict, Any


class ClaudeIntegration:
    """Integração simples entre Claude (WhatsApp MCP) e a API Express.

    Uso esperado:
        integration = ClaudeIntegration("http://localhost:3000")
        result = integration.process_whatsapp_message(claude_payload)
    """

    def __init__(self, api_base_url: str) -> None:
        self.api_url = api_base_url.rstrip("/")

    def process_whatsapp_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """Recebe dados estruturados do Claude e envia para a API.

        Espera um payload no formato:
            {
                "phone": "48999999999",
                "raw_message": "Oi, meu microondas não está aquecendo...",
                "equipment": "microondas",
                "problem": "não aquece + barulho",
                "name": "Fulano",
                "address": "Rua X, 123"
            }
        """
        payload: Dict[str, Any] = {
            "phone": message_data.get("phone"),
            "message": message_data.get("raw_message"),
            "extracted_data": {
                "equipment_type": message_data.get("equipment"),
                "problem": message_data.get("problem"),
                "urgency": self._calculate_urgency(message_data),
                "customer_name": message_data.get("name"),
                "address": message_data.get("address"),
            },
        }

        url = f"{self.api_url}/api/leads/from-claude"

        try:
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as exc:  # type: ignore[reportAny]
            return {
                "success": False,
                "error": "request_failed",
                "message": str(exc),
            }

    def _calculate_urgency(self, data: Dict[str, Any]) -> str:
        """Calcula urgência baseado em palavras-chave simples."""
        urgent_keywords = ["urgente", "emergência", "emergencia", "agora", "hoje", "o mais rápido"]
        message = str(data.get("raw_message", "")).lower()

        if any(word in message for word in urgent_keywords):
            return "high"
        return "medium"
