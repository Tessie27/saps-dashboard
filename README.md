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
- Light/dark theme support

## Tech

Static HTML/CSS/JavaScript with no build step and no external runtime dependencies - the page (`index.html`) loads its data from a bundled `data.json`. Hosted via GitHub Pages from the repository root.

## Data

Source data lives in [`SAPS Master Data/`](./SAPS%20Master%20Data), the raw SAPS quarterly and annual crime statistics workbooks. `data.json` is a processed/aggregated extract used by the dashboard.

Per-100,000 population rates use approximate Stats SA mid-year provincial population estimates and are for relative comparison only.
