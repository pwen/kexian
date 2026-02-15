# Ascents Tab + Stream Tab — Implementation Plan

## Overview

Split into two new tabs:
- **Ascents** — Grade distribution bar charts (sends/flashes only), filtered by year
- **Stream** — Activity timeline grouped by month, showing past sessions

---

## Tab 1: Ascents (Grade Breakdown)

### What it shows
Two side-by-side Chart.js bar charts:
1. **Boulders by Grade** — green bars (V0–V10)
2. **Rock Routes by Grade** — red/orange bars (5.11- through 5.13+)

Only **sends and flashes** are counted (style=1 or style=2). Attempts are excluded.

### Grade bucketing (routes → MP-style groups)
| Letter Grade | Display Bucket |
|---|---|
| 5.11a | 5.11- |
| 5.11b, 5.11c | 5.11 |
| 5.11d | 5.11+ |
| 5.12a | 5.12- |
| 5.12b, 5.12c | 5.12 |
| 5.12d | 5.12+ |
| 5.13a | 5.13- |
| 5.13b, 5.13c | 5.13 |
| 5.13d | 5.13+ |

Boulder grades map directly (V0, V1, ... V10).

### Year filter
Dropdown at top of tab: **All Time | YTD | 2025 | 2024 | ...**  
Reuses the existing `session-years` API endpoint.

### Data source
New API endpoint: `GET /api/<username>/ascents?year=2026&ytd=1`  
Returns flat list of sends/flashes with project info:
```json
[
  {
    "date": "2026-02-14",
    "style": 2,
    "style_label": "Send",
    "project_name": "Crucifriction",
    "grade": "V5",
    "type": 1,
    "type_label": "Boulder",
    "location": { "crag": "Three Sisters", "state_name": "Colorado" }
  }
]
```

### Visuals
- Chart.js `type: "bar"` with custom colors (#22c55e for boulders, #ef4444 for routes)
- Y-axis: count, X-axis: grade buckets
- Canvas elements side by side in a flex container
- Dark theme: transparent background, white labels, zinc grid lines

---

## Tab 2: Stream (Activity Timeline)

### What it shows
A vertical timeline of **past sessions** (non-planned), grouped by month descending.

### Monthly summary header
> **February 2026** — 8 sessions · 3 sends · 2 locations

### Individual entries (within each month)
Each entry shows:
> `Feb 14` · **Sent** Crucifriction **V5** at Three Sisters, CO  
> `Feb 12` · **Attempted** Aqua Hack **V5** at Clear Creek Canyon, CO

- Date on the left
- Style badge (Send/Flash/Attempt) with color
- Project name, grade badge, location
- Notes shown as muted text below if present

### Year filter
Same dropdown pattern as Ascents — All Time, YTD, specific years.

### Data source
New API endpoint: `GET /api/<username>/stream?year=2026&ytd=1`  
Returns all non-planned sessions (all styles, not just sends) with project info:
```json
[
  {
    "date": "2026-02-14",
    "style": 2,
    "style_label": "Send",
    "project_name": "Crucifriction",
    "grade": "V5",
    "type": 1,
    "type_label": "Boulder",
    "location": { "crag": "Three Sisters", "state_name": "Colorado" },
    "notes": "felt strong today"
  }
]
```

---

## Files to Create / Modify

### New files
| File | Purpose |
|---|---|
| `routes/ascents.py` | API endpoints for `/api/<username>/ascents` and `/api/<username>/stream` |
| `static/js/ascents.js` | Grade chart rendering with Chart.js |
| `static/js/stream.js` | Timeline rendering |
| `templates/partials/_tab_stream.html` | Stream tab HTML |

### Modified files
| File | Change |
|---|---|
| `templates/partials/_tab_ascents.html` | Replace placeholder with chart containers + year filter |
| `templates/index.html` | Add Chart.js CDN, Stream tab nav link, include `_tab_stream.html` |
| `static/css/style.css` | Add ascents chart + stream timeline styles |
| `static/js/app.js` | Import and init ascents + stream modules |
| `static/js/router.js` | Add "stream" to tab routing |
| `routes/pages.py` | Add `/<username>/stream` route |
| `app.py` | Register ascents blueprint |

---

## Implementation Order

1. Create `routes/ascents.py` with both API endpoints + register blueprint
2. Update `routes/pages.py` to add `/stream` route
3. Update `templates/index.html` — add Chart.js CDN, Stream nav tab, include stream partial
4. Update `templates/partials/_tab_ascents.html` — chart containers + year filter
5. Create `templates/partials/_tab_stream.html` — timeline HTML structure
6. Create `static/js/ascents.js` — chart data processing + Chart.js rendering
7. Create `static/js/stream.js` — timeline rendering
8. Update `static/js/app.js` — import + init both modules
9. Update `static/js/router.js` — handle "stream" tab
10. Add CSS styles for charts + timeline
11. Test end to end
