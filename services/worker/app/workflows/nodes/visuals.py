from typing import Any, Dict, List
from ..node_interface import WorkflowNodeDefinition


class VisualsNode(WorkflowNodeDefinition):
    def __init__(self):
        self.id = "node_4"
        self.label = "Visuals"
        self.icon = "video_settings"
        self.description = "Choose background visuals."
        self.parameters: List[Dict[str, Any]] = [
            { "id": "asset_folder", "label": "Background Folder", "type": "select", "defaultValue": "backgrounds", "options": [
                { "label": "Backgrounds", "value": "backgrounds" },
                { "label": "Gameplay", "value": "gameplay" },
                { "label": "Minecraft", "value": "minecraft" },
                { "label": "GTA 5", "value": "gta5" }
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
