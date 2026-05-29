# Festival info starter

This repository now includes:

- `/tmp/workspace/eoinobrien/tools/festival.schema.json` – a JSON Schema for festival data
- `/tmp/workspace/eoinobrien/tools/festival.sample.json` – starter data matching the schema
- `/tmp/workspace/eoinobrien/tools/index.html` – a simple static web app
- `/tmp/workspace/eoinobrien/tools/app.js` and `/tmp/workspace/eoinobrien/tools/styles.css` – rendering and styling

## Local usage

Serve the repository root with a simple static file server, for example:

```bash
cd /tmp/workspace/eoinobrien/tools
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

To replace the sample content later, update `/tmp/workspace/eoinobrien/tools/festival.sample.json` with festival details that conform to `/tmp/workspace/eoinobrien/tools/festival.schema.json`.