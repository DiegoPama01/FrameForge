FROM debian:bookworm-slim AS whisper-build

RUN apt-get update && apt-get install -y --no-install-recommends \
    git ca-certificates build-essential cmake curl \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://github.com/ggerganov/whisper.cpp /opt/whisper.cpp \
    && cmake -S /opt/whisper.cpp -B /opt/whisper.cpp/build -DBUILD_SHARED_LIBS=ON \
    && cmake --build /opt/whisper.cpp/build -j --target whisper-cli
RUN /opt/whisper.cpp/models/download-ggml-model.sh small
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg ca-certificates python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Whisper binary + models + libraries
COPY --from=whisper-build /opt/whisper.cpp/build/bin/whisper-cli /usr/local/bin/whisper
COPY --from=whisper-build /opt/whisper.cpp/build/*.so* /usr/local/lib/
RUN ldconfig
COPY --from=whisper-build /opt/whisper.cpp/models /opt/whisper.cpp/models

RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel \
    && /opt/venv/bin/pip install --no-cache-dir "fastapi==0.115.*" "uvicorn==0.34.*" "httpx" "feedparser" "beautifulsoup4" "sqlalchemy" "openai" "python-multipart" "aiofiles" \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade edge-tts

ENV PATH="/opt/venv/bin:$PATH"
ENV DATA_ROOT=/data

WORKDIR /app
COPY app /app/app

EXPOSE 8000
CMD ["python3", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
