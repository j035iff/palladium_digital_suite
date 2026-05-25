# Reference books (local only)

Place Nightbane and other Palladium PDFs here for agent-assisted data entry. Files in this tree are **gitignored** and must not be committed or shipped with the app.

Suggested layout:

```text
nightbane/
  Nightbane_RPG.pdf
  WB1-Between_the_Shadows.pdf
  WB2-Nightlands.pdf
  WB3-Through_the_Glass_Darkly.pdf
  WB4-Shadows_of_Light.pdf
  WB5-Nightbane_Survival_Guide.pdf
  WB6-Dark_Designs.pdf
```

When transcribing Morphus tables: use printed **start page** in `sources`, skip **Other** percentile rows, and run `npm run validate:schemas` after edits.
