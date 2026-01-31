from typing import Any, Dict, List
from ..node_interface import WorkflowNodeDefinition


class VoiceLanguageNode(WorkflowNodeDefinition):
    def __init__(self):
        self.id = "node_2"
        self.label = "Voice & Language"
        self.icon = "record_voice_over"
        self.description = "Configure the narrator voice and language."
        self.parameters: List[Dict[str, Any]] = [
            { "id": "global_voice_style", "label": "Voice Model", "type": "select", "defaultValue": "es-ES-AlvaroNeural", "options": [
                { "label": "ES - Alvaro (Male)", "value": "es-ES-AlvaroNeural" },
                { "label": "ES - Elvira (Female)", "value": "es-ES-ElviraNeural" },
                { "label": "MX - Jorge (Male)", "value": "es-MX-JorgeNeural" },
                { "label": "EN - Guy (Male)", "value": "en-US-GuyNeural" },
                { "label": "EN - Aria (Female)", "value": "en-US-AriaNeural" }
            ]},
            { "id": "global_language", "label": "Language", "type": "select", "defaultValue": "es", "options": [
                { "label": "Spanish", "value": "es" },
                { "label": "English", "value": "en" }
            ]},
            { "id": "global_gender", "label": "Narrator Gender", "type": "select", "defaultValue": "auto", "options": [
                { "label": "Auto Detect", "value": "auto" },
                { "label": "Male", "value": "male" },
                { "label": "Female", "value": "female" }
            ]}
        ]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "icon": self.icon,
            "description": self.description,
            "parameters": self.parameters
        }
