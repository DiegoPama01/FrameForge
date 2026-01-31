from typing import Any, Dict, List
from ..node_interface import WorkflowNodeDefinition


class MasteringNodeDefinition(WorkflowNodeDefinition):
    def __init__(self):
        self.id = "node_5"
        self.label = "Mastering"
        self.icon = "layers"
        self.description = "Final composition settings."
        self.parameters: List[Dict[str, Any]] = [
            { "id": "output_format", "label": "Output Format", "type": "select", "defaultValue": "mp4", "options": [
                { "label": "MP4 1080p (Vertical)", "value": "mp4" },
                { "label": "MP4 4K (Vertical)", "value": "4k_vertical" },
                { "label": "MP4 1080p (Horizontal)", "value": "mp4_horizontal" },
                { "label": "MP4 4K (Horizontal)", "value": "4k_horizontal" }
            ]},
            { "id": "aspect_ratio", "label": "Aspect Ratio", "type": "select", "defaultValue": "horizontal", "options": [
                { "label": "Horizontal (16:9)", "value": "horizontal" },
                { "label": "Vertical (9:16)", "value": "vertical" }
            ]},
            { "id": "output_resolution", "label": "Output Resolution", "type": "select", "defaultValue": "4k_30", "options": [
                { "label": "4K Ultra HD (30fps)", "value": "4k_30" },
                { "label": "1080p Full HD (60fps)", "value": "1080p_60" },
                { "label": "720p Standard", "value": "720p" }
            ]},
            { "id": "bgm_enabled", "label": "Background Music", "type": "boolean", "defaultValue": True },
            { "id": "bgm_volume", "label": "BGM Volume (%)", "type": "number", "defaultValue": 75 },
            { "id": "background_mode", "label": "Background Mode", "type": "select", "defaultValue": "category", "options": [
                { "label": "Category Mix", "value": "category" },
                { "label": "Single Video", "value": "single" }
            ]},
            { "id": "background_video", "label": "Background Video (Asset Path)", "type": "select", "defaultValue": "" },
            { "id": "background_segment_minutes", "label": "Segment Minutes", "type": "number", "defaultValue": 2 },
            { "id": "background_strategy", "label": "Selection Strategy", "type": "select", "defaultValue": "random", "options": [
                { "label": "Random", "value": "random" },
                { "label": "Sequential", "value": "sequential" }
            ]},
            { "id": "background_transition", "label": "Transition Type", "type": "select", "defaultValue": "dissolve", "options": [
                { "label": "Cut", "value": "cut" },
                { "label": "Dissolve", "value": "dissolve" },
                { "label": "Blur Fade", "value": "blur_fade" }
            ]},
            { "id": "thumbnail", "label": "Thumbnail (Asset Path)", "type": "select", "defaultValue": "" },
            { "id": "intro_mode", "label": "Intro Mode", "type": "select", "defaultValue": "compose", "options": [
                { "label": "Compose", "value": "compose" },
                { "label": "Video", "value": "video" },
                { "label": "None", "value": "none" }
            ]},
            { "id": "intro_template_id", "label": "Intro Template", "type": "select", "defaultValue": "" },
            { "id": "intro_video", "label": "Intro Video (Asset Path)", "type": "select", "defaultValue": "" },
            { "id": "intro_text", "label": "Intro Text", "type": "text", "defaultValue": "" },
            { "id": "intro_voice", "label": "Intro Voice", "type": "select", "defaultValue": "same", "options": [
                { "label": "Same as Narrator", "value": "same" },
                { "label": "ES - Alvaro (Male)", "value": "es-ES-AlvaroNeural" },
                { "label": "ES - Elvira (Female)", "value": "es-ES-ElviraNeural" },
                { "label": "MX - Jorge (Male)", "value": "es-MX-JorgeNeural" },
                { "label": "EN - Guy (Male)", "value": "en-US-GuyNeural" },
                { "label": "EN - Aria (Female)", "value": "en-US-AriaNeural" }
            ]},
            { "id": "intro_preview_aspect", "label": "Intro Preview Aspect", "type": "select", "defaultValue": "16:9", "options": [
                { "label": "16:9", "value": "16:9" },
                { "label": "9:16", "value": "9:16" },
                { "label": "Image", "value": "image" }
            ]},
            { "id": "outro_mode", "label": "Outro Mode", "type": "select", "defaultValue": "compose", "options": [
                { "label": "Compose", "value": "compose" },
                { "label": "Video", "value": "video" },
                { "label": "None", "value": "none" }
            ]},
            { "id": "outro_template_id", "label": "Outro Template", "type": "select", "defaultValue": "" },
            { "id": "outro_video", "label": "Outro Video (Asset Path)", "type": "select", "defaultValue": "" },
            { "id": "outro_text", "label": "Outro Text", "type": "text", "defaultValue": "" },
            { "id": "outro_voice", "label": "Outro Voice", "type": "select", "defaultValue": "same", "options": [
                { "label": "Same as Narrator", "value": "same" },
                { "label": "ES - Alvaro (Male)", "value": "es-ES-AlvaroNeural" },
                { "label": "ES - Elvira (Female)", "value": "es-ES-ElviraNeural" },
                { "label": "MX - Jorge (Male)", "value": "es-MX-JorgeNeural" },
                { "label": "EN - Guy (Male)", "value": "en-US-GuyNeural" },
                { "label": "EN - Aria (Female)", "value": "en-US-AriaNeural" }
            ]},
            { "id": "outro_preview_aspect", "label": "Outro Preview Aspect", "type": "select", "defaultValue": "16:9", "options": [
                { "label": "16:9", "value": "16:9" },
                { "label": "9:16", "value": "9:16" },
                { "label": "Image", "value": "image" }
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
