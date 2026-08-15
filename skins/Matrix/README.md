# Matrix — a WeeWX skin

A [WeeWX](https://weewx.com) report skin styled after *The Matrix*: black
background, phosphor-green digital rain, CRT scanlines, and a terminal-window
UI. It ships with a live dashboard, a full Day/Week/Month/Year history
browser, and a "deep archive" that lets you browse every month and year your
station has ever recorded.

![Matrix skin dashboard](https://img.shields.io/badge/theme-matrix-00ff41?style=flat-square)

## Features

- **Live dashboard** (`/`) — current conditions in a `cat
  /var/status/uplink`-style readout, plus 24-hour plots.
- **Extended sensor support** — UV index, solar radiation, particulates
  (PM1.0 / PM2.5 / PM10.0), AQI, ozone, nitrogen dioxide, sulfur dioxide,
  carbon monoxide, tree and grass pollen, sound level, and lightning, each
  rendered with color-coded "threat level" badges. Every extended block is
  individually gated on `has_data`, so a station with none of these sensors
  simply won't show the panel at all — no errors, no empty boxes, no
  configuration required. See [Extended sensor
  cards](#extended-sensor-cards) for the field names and threat bands.
- **Historical data viewer** (`/history/`) — tabbed Day/Week/Month/Year
  plots plus a side-by-side statistics comparison table.
- **Deep archive** (`/archive/`) — every calendar month and year in the
  station's database gets its own generated page (`archive/month-YYYY-MM.html`,
  `archive/year-YYYY.html`) with a daily/monthly log table, plus dropdowns
  and a directory-style listing for browsing the full history.
- **About / System Info page** (`/about/`) — hardware, location, uptime,
  WeeWX version.
- Self-hosted, open-license monospace fonts (Share Tech Mono, VT323) —
  no external CDN or internet connection required to view the reports.
- Digital-rain canvas background, CRT scanline overlay, and a live clock,
  all in a single small JS file with no dependencies. Respects
  `prefers-reduced-motion`.
- **Safe Mode** — nav toggle for a static, accessible layout (system dark-mode
  aware) with light-palette plots on light-color-scheme systems.
- **Interactive shell** — type commands in the title bar (`wx`, `ls days/`,
  `plot outTemp`, `rm -rf /`, …). Hidden in Safe Mode. See the
  [project README](../../README.md) for options and command list.

## Requirements

- WeeWX 5.x (uses the standard Cheetah/Image/Copy generators; no custom
  Python extension is required).
- Any WeeWX schema works. UV / solar radiation / particulate (air quality)
  / lightning panels and plots only appear if your schema and station
  actually report that data (e.g. the `wview_extended` schema). The `wview`
  schema (no extended sensors) works fine — those sections are simply
  omitted.

## Installation

Install the [weewx-matrix](https://github.com/romkey/weewx-matrix) extension from
the repository root (recommended):

```bash
weectl extension install /path/to/weewx-matrix
```

Or copy this `Matrix` directory into your skins directory manually (commonly
`/etc/weewx/skins/` for package installs, or `~/weewx-data/skins/` for pip
installs) and add a `[[MatrixReport]]` stanza to `weewx.conf`. See the
[project README](../../README.md) for full instructions.

## Configuration

Most things can be tuned from `weewx.conf` without touching the skin
itself, by overriding options under
`[StdReport] / [[MatrixReport]]`. The important knobs live in
`skin.conf`'s `[DisplayOptions]` section:

| Option | Purpose |
| --- | --- |
| `observations_current` | Which readings appear in "Current Conditions", and in what order. |
| `observations_extended` | Which sensors are treated as "extended" telemetry (UV, radiation, PM, lightning). |
| `observations_stats` | Which readings appear in the History page's statistics table. |
| `plot_groups` | Which plots are generated/shown, for every period (day/week/month/year). |
| `periods` | Which time-span tabs appear on the History page. |

For example, to add another plot group or extra sensor, add it to the
appropriate list in `weewx.conf`:

```ini
[StdReport]
    [[MatrixReport]]
        skin = Matrix
        enable = true
        [[[DisplayOptions]]]
            observations_extended = UV, radiation, pm1_0, pm2_5, pm10_0, lightning_strike_count, lightning_distance, soilMoist1
```

To add a brand-new plot, follow the pattern already used in
`skin.conf`'s `[ImageGenerator]` section (one stanza per period, e.g.
`day_images`, `week_images`, ...).

### Extended sensor cards

Every card in the "Extended Sensor Array" is gated on `has_data`, so it
appears only if your database actually has readings for that observation.
A station with none of them doesn't render the panel at all.

Most of these read WeeWX's standard observation names, which already exist in
the default `wview_extended` schema — you only need something populating them:

| Card | Field | Units | Threat bands |
| --- | --- | --- | --- |
| UV Index | `UV` | index | WHO UV index categories |
| Solar Radiation | `radiation` | W/m² | none (reading only) |
| Air Quality | `pm2_5`, `pm10_0`, `pm1_0` | µg/m³ | EPA AQI breakpoints for PM2.5 |
| Ozone | `o3` | ppm | EPA 8-hour AQI breakpoints |
| Nitrogen Dioxide | `no2` | µg/m³ | EPA 1-hour AQI breakpoints |
| Sulfur Dioxide | `so2` | ppm | EPA 1-hour AQI breakpoints |
| Carbon Monoxide | `co` | ppm | EPA 8-hour AQI breakpoints |
| Sound Level | `noise` | dB | hearing-risk bands (85 dB NIOSH limit) |
| Lightning | `lightning_strike_count`, `lightning_distance` | count, distance | none (reading only) |

Three cards use field names that are **not** part of the standard schema, so
you have to add the columns yourself before they can appear:

| Card | Field | Units | Threat bands |
| --- | --- | --- | --- |
| Air Quality Index | `aqi` | index 0–500 | EPA AQI categories |
| Tree Pollen | `pollen_tree` | grains/m³ | National Allergy Bureau, tree scale |
| Grass Pollen | `pollen_grass` | grains/m³ | National Allergy Bureau, grass scale |

```
weectl database add-column aqi --type REAL
weectl database add-column pollen_tree --type REAL
weectl database add-column pollen_grass --type REAL
```

Then point something at them — a driver, an MQTT topic via `MQTTSubscribe`, or
a service that fetches from an air-quality or pollen API.

The EPA publishes its ozone, SO2, and NO2 breakpoints in parts per billion,
but WeeWX stores `o3` and `so2` as `group_fraction` (ppm) and `no2` as
`group_concentration` (µg/m³), and defines no conversion between them. The
thresholds in `sensors.inc` are therefore written in the units WeeWX actually
stores, with NO2 converted using the standard 1 ppb = 1.88 µg/m³ at 25 °C. If
your sensor reports different units, edit the bounds lists at the top of
`sensors.inc` to match.

The pollen bands differ between tree and grass because the National Allergy
Bureau scales differ: grass counts run an order of magnitude lower than tree
counts for the same severity.

The "Air Quality" card estimates a category from PM2.5 directly, so it works
without an AQI feed. It is kept alongside the `aqi` card so you can see the
particulate readings and a real index side by side. If you use a dedicated AQI
add-on such as `weewx-aqi` with its own data binding, see the comments at the
top of `sensors.inc` for where to pull from it instead.

## File layout

```
Matrix/
├── skin.conf                  # generator, plot, and display configuration
├── lang/en.conf                # localizable text strings
├── index.html.tmpl             # dashboard, served at /
├── history/index.html.tmpl     # Day/Week/Month/Year plots + stats, at /history/
├── archive/
│   ├── index.html.tmpl         # deep archive index (month/year picker), at /archive/
│   ├── month-%Y-%m.html.tmpl   # one page per calendar month (SummaryByMonth)
│   └── year-%Y.html.tmpl       # one page per calendar year (SummaryByYear)
├── about/index.html.tmpl       # station / system info, at /about/
├── rss.xml.tmpl                # RSS feed
├── titlebar.inc / footer.inc / current.inc / sensors.inc   # shared includes
├── static/
│   ├── matrix.css
│   ├── matrix.js
│   └── favicon.svg
└── font/                        # self-hosted OFL fonts (Share Tech Mono, VT323)
```

## Notes for skin developers

- `#include` paths in every template are relative to the **skin root**, not
  to the including file's own directory — this is because WeeWX's report
  engine runs with the skin directory as the current working directory for
  the whole generation pass. That's why `archive/month-%Y-%m.html.tmpl`
  includes `titlebar.inc`, not `../titlebar.inc`, even though it lives one
  directory down.
- Variables that need to be visible inside an `#include`d file (like `$rel`
  and `$nav_current`, used to compute relative links and highlight the
  active nav item) are set with `#set global`, since a plain `#set` is not
  visible inside includes.
- The main pages live in their own directories (`history/index.html.tmpl` and
  friends) so their URLs are `/history/` rather than `/history.html`. Every
  asset and cross-page link is written as `${rel}…` so a template keeps
  working if its depth changes; `$rel` is the only thing that needs updating.
- The per-year and per-month archive pages keep a `.html` extension on
  purpose. WeeWX builds a page's output directory from `os.path.dirname()` of
  the configured template path and only expands `strftime` codes in the
  *basename* (see `getFileName()` in `weeutil/weeutil.py`), so a template path
  like `archive/%Y/index.html.tmpl` would create a literal `%Y` directory
  rather than one per year.

## License

The skin's own code (templates, CSS, JS) is provided under the MIT License
(see the [project LICENSE](../../LICENSE)). Bundled fonts are licensed under
the SIL Open Font License (see `font/OFL-*.txt`).
