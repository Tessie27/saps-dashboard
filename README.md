# SAPS Crime Statistics Dashboard

An interactive dashboard for South African Police Service (SAPS) recorded crime statistics, built from the official SAPS crime stats workbooks in [`SAPS Master Data/`](./SAPS%20Master%20Data).

**Live site: https://tessie27.github.io/saps-dashboard/**

## What's in it

Built from the `2024-2025 Annual (Financial Year)` SAPS workbook, covering 10 financial years (2015/16-2024/25), 1,172 police stations, and 29 crime categories.

- **KPI summary** - national total, year-on-year change, 10-year change, top province, top crime category
- **Crime hotspot map** - an interactive map of South Africa with province bubbles sized and colored by crime volume, toggleable between raw totals and per-100,000-population rate, with click-to-drill-down
- **National trend** - 10-year line chart of recorded crime totals
- **Province and crime-category breakdowns** - bar charts and a category-group donut chart
- **Police station leaderboard** - sortable, searchable, province-filterable table of the highest-volume stations with year-on-year deltas
- **Gender breakdown** - a separate section built from Stats SA's Victims of Crime Survey (P0341, 2025/26): male vs female victims by crime category, a per-crime trend explorer, safety-perception trends, and an intimate-partner-violence callout. This is household-survey data, not SAPS recorded crime, and isn't directly comparable to the figures above it - the dashboard calls this out.
- Light/dark theme support

## Tech

Built with [Astro](https://astro.build) - static output, no client framework/hydration. Layout, KPI tiles, and each chart's markup live in `src/components/`; the interactive SVG rendering (map, bars, lines, donut, sortable table) is one client script at `src/scripts/dashboard.js`, imported as an ES module on the page.

```
src/
  layouts/Layout.astro       page shell + design tokens (light/dark)
  components/                Header, KpiRow, SapsSection, GenderSection, StationTable, Footer
  scripts/dashboard.js       chart/map/table rendering + interactivity
  data/saps.json             processed SAPS extract (imported at build time)
  data/gender.js             Stats SA gender-breakdown data
  pages/index.astro          assembles everything
```

`npm install` then `npm run build` outputs static files to `docs/`, which is what GitHub Pages serves (repo Pages source: `main` branch, `/docs` folder). `npm run dev` runs a local dev server; `npm run preview` serves the built `docs/` output.

## Data

Source data lives in [`SAPS Master Data/`](./SAPS%20Master%20Data), the raw SAPS quarterly and annual crime statistics workbooks. `src/data/saps.json` is a processed/aggregated extract used by the dashboard, bundled into the build rather than fetched at runtime.

Per-100,000 population rates use approximate Stats SA mid-year provincial population estimates and are for relative comparison only.
