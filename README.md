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

To replace the sample content later, update `festival.sample.json` with festival details that conform to `festival.schema.json`, then regenerate the calendar file:

```bash
node generate-ics.js
```

This writes `schedule.ics` to the repository root. Commit both `festival.sample.json` and `schedule.ics` together so the hosted file stays in sync.

## GitHub Pages

This repository includes a GitHub Actions workflow at `.github/workflows/pages.yml` that deploys the repository root to GitHub Pages on pushes to `main`.

In the repository settings, set **Pages** to use **GitHub Actions** as the source. Once enabled, the site will publish automatically from the workflow.

The current data structure supports:

- festival overview
- day-by-day schedule
- calendar subscription via `webcal://` and one-off download as an `.ics` file; `schedule.ics` is generated automatically on deploy from `festival.sample.json`
- wellness information
- visitor guidance such as weather, access, age limits, payments, and parking
- transport, rules, contact details, and official links