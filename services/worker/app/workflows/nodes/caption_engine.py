from typing import Any, Dict, List
from ..node_interface import WorkflowNodeDefinition


class CaptionEngineNode(WorkflowNodeDefinition):
    def __init__(self):
        self.id = "node_3"
        self.label = "Caption Engine"
        self.icon = "subtitles"
        self.description = "Configure subtitle styles."
        self.parameters: List[Dict[str, Any]] = [
            { "id": "caption_mode", "label": "Caption Mode", "type": "select", "defaultValue": "line", "options": [
                { "label": "Standard (Lines)", "value": "line" },
                { "label": "Word by Word", "value": "word" }
            ]},
            { "id": "style", "label": "Display Style", "type": "select", "defaultValue": "modern", "options": [
                { "label": "Modern (Clean)", "value": "modern" },
                { "label": "Dynamic (Pop)", "value": "dynamic" }
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
