# FrameForge

Local stack to generate videos automatically from text and audio. Designed to run fully in Docker.

---

## Components

- **n8n**
  Workflow orchestration (queues, retries, schedules).
- **worker**
  API that executes the pipeline (scrape, translate, TTS, subtitles, video, mastering).
- **dashboard**
  Next.js frontend to control projects, jobs, assets, templates, and settings.
- **/data**
  Bind mount with projects, outputs, config, and logs.

---

## What It Does Today (MVP1)

- Reddit ingestion (source discovery) with configurable subreddits and limits.
- Pipeline stages:
  - Translation + narrator gender detection (OpenAI).
  - Voice synthesis (local edge-tts).
  - Subtitles generation (local whisper.cpp, fixed ES).
  - Visuals + mastering (backgrounds, transitions, output format).
  - Intro/Outro segments (video or template based).
  - Final export and optional shorts generation.
- Jobs and schedules (once/daily/weekly).
- Asset library:
  - Upload and category management.
  - Templates with editable fields and preview rendering.
- Dashboard UI for:
  - Projects, logs, workflows, jobs.
  - Assets and templates.
  - Results page to edit mastering settings and preview intro/outro.

---

## Services

- Dashboard: http://localhost:3000
- Worker API: http://localhost:8000/health
- n8n: http://localhost:5678

---

## Quick Start

1) Copy environment file:
```bash
cp .env.example .env
```

2) Set tokens:
```bash
WORKER_TOKEN=your_token_here
N8N_TOKEN=your_token_here
OPENAI_API_KEY=your_openai_key_here
```

3) Start stack:
```bash
docker compose up -d --build
```

---

## Data Layout (/data)

All runtime state lives here and is not versioned.

Example project structure:
```text
/data/projects/<project_id>/
├── audio/
│  ├── source/
│  └── clean/
├── text/
│  ├── story.txt
│  ├── story_translated.txt
│  └── subtitles.srt
├── video/
│  ├── parts/
│  └── final.mp4
├── meta.json
└── logs/
```

---

## OpenAI vs Local

- **OpenAI calls (cloud):**
  - Translation + narrator gender (`gpt-5-mini`).
  - Thumbnail prompt + image generation (`gpt-5-mini` + `gpt-image-1`).
- **Local (no cloud):**
  - Subtitles with whisper.cpp (fixed language: ES).
  - TTS with edge-tts.

---

## Copyright & Responsible Use

FrameForge is a tool. You are responsible for the content you ingest and publish.

- Ensure you have rights to any text, audio, video, music, images, and templates you use.
- Reddit content and user-generated content may be copyrighted and subject to platform terms.
- Do not publish material that violates copyright, privacy, or platform policies.

---

## Code Rights / License

This project is released under a **non-commercial license**.  
Commercial use is not permitted without prior written permission.

---

## Development & Debug

View logs:
```bash
docker compose logs -f worker
docker compose logs -f dashboard
docker compose logs -f n8n
```

Rebuild one service:
```bash
docker compose build --no-cache worker
docker compose up -d --force-recreate worker
```

---

## MVP2 Plan (Next)

- **Utilities API** (no workflow required):
  - Upload video/audio and generate subtitles.
  - Transcription (text + timestamps).
  - TTS (text -> audio).
  - Quick preview (frame + overlay).
- **Main workflow** (smart long vs short):
  - Detect duration and branch into short vs long.
  - Short: pre-defined background and short settings.
  - Long: full render, then auto-generate shorts.
  - Separate profiles: `short_profile` / `long_profile`.
- **Publishing node**:
  - YouTube upload (OAuth2, resumable, thumbnail, scheduling).
