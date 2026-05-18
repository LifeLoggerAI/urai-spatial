# URAI Foundation Integration

URAI Spatial uses URAI Foundation as the public-interest governance, consent, safety, accessibility, and risk-review anchor for spatial computing and environmental-intelligence work.

## Canonical references

- Foundation repository: `LifeLoggerAI/urai-foundation`
- Public domain target: `https://uraifoundation.org/`
- Governance charter: `https://uraifoundation.org/docs/governance-charter.md`
- Ethical AI principles: `https://uraifoundation.org/docs/ethical-ai-principles.md`
- Transparency framework: `https://uraifoundation.org/docs/transparency-framework.md`
- Risk review process: `https://uraifoundation.org/docs/risk-review-process.md`
- System-of-systems contract: `https://uraifoundation.org/docs/system-of-systems-integration.md`

## Spatial alignment requirements

Spatial changes should reference Foundation standards when they affect:

- room semantics, scene graphs, or environmental context;
- spatial consent zones or geo-fenced redaction;
- AR/VR capture, replay, or shared-space experiences;
- sensitive location, bystander, home, workplace, or biometric-adjacent context;
- accessibility, motion safety, or embodied user control;
- public claims about spatial intelligence, safety, or user protection.

## Risk-review gate

Spatial systems are high-risk by default when they involve physical spaces, bystanders, private environments, or location-derived context. Use the Foundation risk-review process before production deployment.

## Release gate

Run the spatial repo checks defined by this repository. If the change affects Foundation commitments, also verify the Foundation repository:

```bash
git pull origin main
python3 -m unittest discover -s tests
python3 scripts/validate-docs.py
```

## Live-domain caveat

Do not treat `uraifoundation.org` as live on GitHub Pages until DNS no longer resolves to Squarespace and `/sitemap.xml` returns `200`.
