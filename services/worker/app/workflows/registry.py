from typing import Any, Dict, List

from .nodes.source_discovery import SourceDiscoveryNode
from .nodes.voice_language import VoiceLanguageNode
from .nodes.caption_engine import CaptionEngineNode
from .nodes.visuals import VisualsNode
from .nodes.mastering import MasteringNodeDefinition


def build_reddit_shorts_workflow() -> Dict[str, Any]:
    nodes = [
        SourceDiscoveryNode(posts_per_subreddit=3, min_chars=500, max_chars=4000, timeframe="day").to_dict(),
        VoiceLanguageNode().to_dict(),
        CaptionEngineNode().to_dict(),
        VisualsNode().to_dict(),
        MasteringNodeDefinition().to_dict()
    ]
    return {
        "id": "wf-reddit-shorts",
        "name": "Reddit Shorts",
        "description": "Generate viral vertical videos from Reddit stories. Includes automated scraping, text-to-speech, and dynamic captions.",
        "status": "active",
        "usage_count": 0,
        "tags": ["reddit", "shorts", "vertical", "automation"],
        "nodes": nodes
    }


def build_reddit_longform_workflow() -> Dict[str, Any]:
    nodes = [
        SourceDiscoveryNode(posts_per_subreddit=1, min_chars=2000, max_chars=15000, timeframe="week").to_dict(),
        VoiceLanguageNode().to_dict(),
        CaptionEngineNode().to_dict(),
        VisualsNode().to_dict(),
        MasteringNodeDefinition().to_dict()
    ]
    return {
        "id": "wf-reddit-longform",
        "name": "Reddit Longform",
        "description": "Generate longer narrated videos from full-length Reddit stories with subtitles and mastering.",
        "status": "active",
        "usage_count": 0,
        "tags": ["reddit", "longform", "narration"],
        "nodes": nodes
    }


def get_default_workflows() -> List[Dict[str, Any]]:
    return [build_reddit_shorts_workflow(), build_reddit_longform_workflow()]
