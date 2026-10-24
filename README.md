# ezcon

**Turn a conference into a practical career opportunity plan.**

ezcon pairs a currently open role (checked on the employer's own careers site) with a talk at the conference by someone listed with that company, links straight to the employer's application page with an honest fit caveat, adds the talk to your day, gives one prep step, and compares commute options by cost and time against your budget. It also remembers who you met so the next recommendation changes.

- Live demo (cached snapshot, fictional profile): https://ezcon-six.vercel.app
- Built for Patch the Conference with Bright Data, FalkorDB, OpenAI via TrueForge, and Qodo.

## Run locally

```bash
npm ci
npm test
npm run dev        # cached mode
npm run dev:api    # live mode: needs FALKORDB_URL in .env and TrueForge on localhost:8790
```

Docs: [build handoff](docs/BUILD_HANDOFF.md) · [demo script](docs/DEMO.md) · [architecture](docs/ARCHITECTURE.md) · [data sources](docs/DATA_SOURCES.md)
