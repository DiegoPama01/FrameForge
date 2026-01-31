from sqlalchemy import create_engine, Column, String, DateTime, Text, Index, Integer, text, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
import os
import json
from pathlib import Path

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.getenv('DATA_ROOT', '/data')}/frameforge.db")
DATA_ROOT = Path(os.environ.get("DATA_ROOT", "/data")).resolve()
PROJECTS_ROOT = DATA_ROOT / "projects"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

@event.listens_for(engine, "connect")
def _set_sqlite_pragmas(dbapi_connection, connection_record):
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA busy_timeout=5000;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()
    except Exception:
        pass
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True) 
    title = Column(String)
    author = Column(String)
    subreddit = Column(String, index=True)
    status = Column(String, default="Idle") 
    current_stage = Column(String, default="Text Scrapped")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    meta_json = Column(Text, nullable=True)

class AssetModel(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True, index=True) # path
    name = Column(String)
    categories = Column(Text, default="[]") # JSON string of categories
    size = Column(String)
    file_type = Column(String)
    url = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AssetCategoryModel(Base):
    __tablename__ = "asset_categories"

    id = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class TemplateModel(Base):
    __tablename__ = "templates"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    image_path = Column(String)
    fields_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class WorkflowModel(Base):
    __tablename__ = "workflows"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    description = Column(Text)
    nodes_json = Column(Text) # JSON string of WorkflowNode[]
    status = Column(String, default="active")
    usage_count = Column(Integer, default=0)
    tags_json = Column(Text, default="[]")

class JobModel(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True)
    workflow_id = Column(String, index=True)
    project_id = Column(String, nullable=True, index=True)
    status = Column(String, default="Pending")
    progress = Column(Integer, default=0)
    parameters_json = Column(Text) # JSON string of inputs
    
    # Scheduling fields
    schedule_interval = Column(String, default="once") # once, daily, weekly
    schedule_time = Column(String, nullable=True) # "14:30"
    last_run = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

Base.metadata.create_all(bind=engine)

def ensure_job_columns():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(jobs)"))
            existing = {row[1] for row in result.fetchall()}
            if "schedule_interval" not in existing:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN schedule_interval TEXT DEFAULT 'once'"))
            if "schedule_time" not in existing:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN schedule_time TEXT"))
            if "last_run" not in existing:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN last_run DATETIME"))
            conn.commit()
    except Exception as e:
        print(f"Schema migration warning: {e}")

ensure_job_columns()

def ensure_project_columns():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(projects)"))
            existing = {row[1] for row in result.fetchall()}
            if "author" not in existing:
                conn.execute(text("ALTER TABLE projects ADD COLUMN author TEXT"))
            conn.commit()
    except Exception as e:
        print(f"Schema migration warning: {e}")

ensure_project_columns()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def sync_projects_to_db():
    print("Syncing existing projects to database...")
    db = SessionLocal()
    try:
        if not PROJECTS_ROOT.exists():
            return
            
        for d in PROJECTS_ROOT.iterdir():
            if not d.is_dir():
                continue
                
            project_id = d.name
            existing = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
                
            meta_path = d / "meta.json"
            title = project_id
            subreddit = "Unknown"
            status = "Success"
            stage = "Text Scrapped"
            updated_at = datetime.datetime.fromtimestamp(d.stat().st_mtime)
            
            meta = {}
            if meta_path.exists():
                try:
                    meta = json.loads(meta_path.read_text())
                    title = meta.get("title", title)
                    author = meta.get("author")
                    subreddit = meta.get("subreddit", subreddit)
                    status = meta.get("status", "Success")
                    stage = meta.get("currentStage", stage)
                except:
                    meta = {}
                    author = None
            else:
                author = None
            
            if existing:
                if meta:
                    if existing.meta_json:
                        try:
                            existing_meta = json.loads(existing.meta_json)
                        except Exception:
                            existing_meta = {}
                        for key, value in meta.items():
                            if key not in existing_meta:
                                existing_meta[key] = value
                        existing.meta_json = json.dumps(existing_meta)
                    else:
                        existing.meta_json = json.dumps(meta)
                if existing.title != title:
                    existing.title = title
                if author and existing.author != author:
                    existing.author = author
                if existing.subreddit != subreddit:
                    existing.subreddit = subreddit
                if existing.status != status:
                    existing.status = status
                if existing.current_stage != stage:
                    existing.current_stage = stage
                continue
            
            new_project = ProjectModel(
                id=project_id,
                title=title,
                author=author,
                subreddit=subreddit,
                status=status,
                current_stage=stage,
                updated_at=updated_at,
                meta_json=json.dumps(meta) if meta else None
            )
            db.add(new_project)
        
        db.commit()
        print("Sync complete.")
    except Exception as e:
        print(f"Sync error: {e}")
    finally:
        db.close()
