from typing import Any, Dict, List
from ..node_interface import WorkflowNodeDefinition


class SourceDiscoveryNode(WorkflowNodeDefinition):
    def __init__(self, posts_per_subreddit: int, min_chars: int, max_chars: int, timeframe: str):
        self.id = "node_1"
        self.label = "Source Discovery"
        self.icon = "rss_feed"
        self.description = "Scrape stories from subreddits."
        self.parameters: List[Dict[str, Any]] = [
            { "id": "subreddits", "label": "Target Subreddits", "type": "chips", "placeholder": "AskReddit, scarystories...", "defaultValue": ["AskReddit"] },
            { "id": "posts_per_subreddit", "label": "Limit", "type": "number", "defaultValue": posts_per_subreddit },
            { "id": "minChars", "label": "Min Characters", "type": "number", "defaultValue": min_chars },
            { "id": "maxChars", "label": "Max Characters", "type": "number", "defaultValue": max_chars },
            { "id": "timeframe", "label": "Timeframe", "type": "select", "defaultValue": timeframe, "options": [
                { "label": "Hour", "value": "hour" },
                { "label": "Day", "value": "day" },
                { "label": "Week", "value": "week" },
                { "label": "Month", "value": "month" },
                { "label": "Year", "value": "year" },
                { "label": "All Time", "value": "all" }
            ]},
            { "id": "sort", "label": "Sort By", "type": "select", "defaultValue": "top", "options": [
                { "label": "Hot", "value": "hot" },
                { "label": "New", "value": "new" },
                { "label": "Top", "value": "top" },
                { "label": "Rising", "value": "rising" }
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
