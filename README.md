# Festival info starter

This repository now includes:

- `festival.schema.json` – a JSON Schema for festival data
- `festival.sample.json` – sample data populated with When Next We Meet festival details
- `index.html` – a simple static web app
- `app.js` and `styles.css` – rendering and styling

## Local usage

Serve the repository root with a simple static file server, for example:

```bash
cd /path/to/tools
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

To replace the sample content later, update `festival.sample.json` with festival details that conform to `festival.schema.json`.

The current data structure supports:

- festival overview
- day-by-day schedule
- wellness information
- visitor guidance such as weather, access, age limits, payments, and parking
- transport, rules, contact details, and official links