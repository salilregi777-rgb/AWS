# Relay

A community flood-response command centre built for AWS First Commit 2026.

Relay connects **signal → team matching → Cedar authorization → human-confirmed action → audit trail**. It helps a coordinator reconcile fragmented reports, select suitable responders, and explain each decision.

## Run locally

Use Node.js 24 LTS. From this directory:

```sh
npm ci
npm run dev
```

Open http://localhost:5173. No AWS account, API key or cloud resources are required. Installation copies the actual AWS Cedar WebAssembly runtime into the public assets.

## Try the complete experience

1. **Report an incident**: describe a fictional incident, or choose a sample. Analyze this report extracts an editable draft with visible text cues.
2. **Combine duplicate reports**: select a suggested incident and confirm. Both accounts survive; headcounts are never added together.
3. **Review response**: inspect matching, try a volunteer dispatch to see a real Cedar Deny, then confirm as coordinator for Allow.
4. **Evidence / Timeline**: inspect original accounts, extracted cues and incident-linked decisions. Resolve the response to release its team.
5. **Operations Lab**: inject a flood, medical or infrastructure drill; see live local activity and workspace analytics.
6. **Play the rehearsal**: follow a six-stage animated policy demonstration. It is isolated from saved data and uses real Cedar decisions.

The midnight-blue interface opens on original animated city artwork with pointer parallax. City, 3D field and Map views are available. Experience settings offer tidal-wave, ember-dissolve and soft-fade page transitions, optional synthesized interface sounds, and an ambient-motion toggle. A new wave/beacon logo, simpler navigation and a three-step guide make the workflow easier to follow. Reduced-motion preferences take priority.

See [artwork and motion notes](docs/ARTWORK.md) for the image prompt and asset provenance.

## What is real, and what is simulated?

- Real: Cedar 4.13.0 WASM policy evaluation, matching logic, local text extraction, confirmed duplicate fusion, persisted local assignments, evidence, decision log and JSON export.
- Simulated: incidents, people, responders, assignments and straight-line route/ETA.
- Not connected: an AI model, AWS cloud services, authenticated roles, real responder notifications or multi-device synchronization.

Triage uses local language rules, **not an AI model**. Demo roles can be switched in the interface. Browser authorization is inspectable and functional but is not a production security boundary. Data remains in this browser. Map tiles and fonts use the internet.

## Check the implementation

```sh
npm test
npm run typecheck
npm run build
```

Tests exercise the actual Cedar engine, schema validation, denied and allowed actions, unsafe team exclusions, number extraction, negation, duplicate fusion and persistence invariants. The production output is generated in `dist/`. The development preview is the supported local demonstration flow; no cloud deployment is configured.

## Submission material

- [Hackathon checklist](docs/HACKATHON.md)
- [2:45 demo script](docs/DEMO.md)
- [Architecture and limitations](docs/ARCHITECTURE.md)
- [Credits and AI disclosure](NOTICE.md)

Built with React, TypeScript, Three.js and AWS Cedar, using the Vinext/Vite starter. Original application code is MIT licensed; dependency licenses remain applicable.
