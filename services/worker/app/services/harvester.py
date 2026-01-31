import feedparser
import json
from bs4 import BeautifulSoup
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session
from ..database import ProjectModel, get_db
from ..utils.text_cleaner import clean_reddit_text
import os

PROJECTS_ROOT = Path(os.environ.get("DATA_ROOT", "/data")).resolve() / "projects"

class HarvesterService:
    def __init__(self, db: Session):
        self.db = db

    def harvest(self, config: dict) -> list:
        return harvest_from_reddit(self.db, config)

def ensure_project_dirs(project_id: str) -> Path:
    p = PROJECTS_ROOT / project_id
    (p / "audio/source").mkdir(parents=True, exist_ok=True)
    (p / "audio/clean").mkdir(parents=True, exist_ok=True)
    (p / "video/parts").mkdir(parents=True, exist_ok=True)
    (p / "text").mkdir(parents=True, exist_ok=True)
    return p

def harvest_from_reddit(db: Session, config: dict) -> list:
    subreddits = config.get("SUBREDDITS", ["scarystories", "nosleep", "shortstories"])
    limit = config.get("REDDIT_LIMIT", 25)
    min_chars = config.get("MIN_CHARS", 600)
    max_chars = config.get("MAX_CHARS", 12000)
    sort = (config.get("REDDIT_SORT") or "top").lower()
    timeframe = (config.get("REDDIT_TIMEFRAME") or "day").lower()
    if timeframe not in ["hour", "day", "week", "month", "year", "all"]:
        timeframe = "day"
    
    harvested = []
    
    for sub in subreddits:
        if sort == "top":
            url = f"https://www.reddit.com/r/{sub}/top/.rss?t={timeframe}&limit={limit}"
        elif sort in ["new", "hot", "rising"]:
            url = f"https://www.reddit.com/r/{sub}/{sort}/.rss?limit={limit}"
        else:
            url = f"https://www.reddit.com/r/{sub}/top/.rss?t={timeframe}&limit={limit}"
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries:
                content_html = entry.summary
                if not content_html: continue
                
                soup = BeautifulSoup(content_html, "html.parser")
                raw_text = soup.get_text(separator="\n").strip()
                text = clean_reddit_text(raw_text)
                
                if len(text) < min_chars or len(text) > max_chars:
                    continue
                
                raw_id = entry.id.split("_")[-1] if "_" in entry.id else entry.id
                project_id = f"reddit_{sub}_{raw_id}"
                
                # Check DB
                existing = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
                if existing:
                    continue

                p_dir = ensure_project_dirs(project_id)
                
                author = None
                if hasattr(entry, "author"):
                    author = entry.author
                elif isinstance(entry, dict):
                    author = entry.get("author")
                if not author and isinstance(entry, dict):
                    author_detail = entry.get("author_detail") or {}
                    author = author_detail.get("name")
                if not author and isinstance(entry, dict):
                    author = entry.get("dc_creator")

                meta = {
                    "id": project_id,
                    "title": entry.title,
                    "author": author,
                    "subreddit": sub,
                    "link": entry.link,
                    "published": entry.published if hasattr(entry, 'published') else datetime.now().isoformat(),
                    "textLen": len(text),
                    "status": "Success",
                    "currentStage": "Text Scrapped"
                }
                
                (p_dir / "meta.json").write_text(json.dumps(meta, indent=4))
                (p_dir / "text/story.txt").write_text(text)
                
                # Save to DB
                new_project = ProjectModel(
                    id=project_id,
                    title=entry.title,
                    author=author,
                    subreddit=sub,
                    status="Success",
                    current_stage="Text Scrapped",
                    updated_at=datetime.utcnow(),
                    meta_json=json.dumps(meta)
                )
                db.add(new_project)
                harvested.append(project_id)
        except Exception as e:
            print(f"Error harvesting r/{sub}: {e}")
            
    db.commit()
    return harvested
