# FrameForge

Stack local para generar vídeos de forma automática a partir de audio y texto.
Diseñado para funcionar completamente en Docker (Windows hoy, Ubuntu mañana).

---

## Componentes

- **n8n**  
  Orquestación del workflow (colas, estados, reintentos).

- **worker**  
  API que ejecuta las etapas del pipeline (audio, transcripción, vídeo) mediante jobs asíncronos.

- **dashboard**  
  Frontend en Next.js para controlar proyectos, jobs y configuración.

- **/data**  
  Bind mount local con proyectos, outputs, configuración y logs.

---

## 📁 Estructura del repositorio

```text
frameforge/
├── docker-compose.yml      # Orquestación de servicios
├── .env.example            # Variables de entorno de ejemplo
├── README.md               # Documentación principal
├── apps/
│   └── dashboard/          # Frontend / panel de control
├── services/
│   ├── worker/             # Procesos en segundo plano
│   └── n8n/                # Servicio de automatización n8n
├── workflows/
│   └── n8n/                # Workflows de n8n
└── data/                   # Volúmenes y datos persistentes
```


---

## Persistencia

- **n8n** guarda workflows, credenciales y ejecuciones en el volumen Docker:
  - `n8n_data`

- **Proyectos y outputs** se guardan en:
  - `./data` → montado como `/data` dentro de los contenedores

⚠️ **Si borras el volumen `n8n_data`, pierdes workflows y credenciales de n8n.**

---

## Requisitos

- Docker
- Docker Compose

---

## Configuración inicial

1. Copiar variables de entorno:
```bash
cp .env.example .env
```

2. Editar .env y definir los tokens necesarios para n8n.
```bash
WORKER_TOKEN=aqui_poner_un_token
N8N_TOKEN=aqui_poner_otro_token
```

3. Iniciar servicios:
```bash
docker compose up -d
```


## Arranque del stack
```bash
docker compose up -d --build
```


## Servicios disponibles:

Dashboard: http://localhost:3000

Worker API: http://localhost:8000/health

n8n: http://localhost:5678


## Carpeta /data (runtime)

Todo el estado operativo vive aquí y no se versiona.

Estructura recomendada por proyecto:

```text
/data/projects/<project_id>/
├─ project.json
├─ audio/
│  ├─ source/
│  │  └─ voice.mp3
│  ├─ clean/
│  │  └─ audio_clean.wav
│  └─ tmp/
├─ text/
│  ├─ subtitles.srt
│  └─ tmp/
├─ video/
│  ├─ source/
│  ├─ work/
│  └─ final/
│     └─ final.mp4
└─ logs/
   └─ jobs/
```


## Exportar workflows de n8n

Desde la UI de n8n:

1. Abrir workflow

2. Menú (⋮)

3. Export

4. Guardar el JSON en workflows/n8n/

Recomendación: exportar tras cada cambio importante.



## Backup del volumen de n8n

1. Crear backup
```bash
docker run --rm \
  -v frameforge_n8n_data:/volume \
  -v "$PWD":/backup \
  alpine \
  tar czf /backup/n8n_data_backup.tar.gz -C /volume .
```

2. Restaurar backup
```bash
    ⚠️ Esto sobrescribe el estado actual de n8n.

docker compose down
docker volume rm frameforge_n8n_data

docker volume create frameforge_n8n_data
docker run --rm \
  -v frameforge_n8n_data:/volume \
  -v "$PWD":/backup \
  alpine \
  sh -lc "cd /volume && tar xzf /backup/n8n_data_backup.tar.gz"

docker compose up -d
```

## Desarrollo y debug

1. Ver logs
```bash
docker compose logs -f worker
docker compose logs -f dashboard
docker compose logs -f n8n
```

2. Rebuild de un servicio
```bash
docker compose build --no-cache worker
docker compose up -d --force-recreate worker
```