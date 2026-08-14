# weewx-matrix

[![CI](https://github.com/romkey/weewx-matrix/actions/workflows/ci.yml/badge.svg)](https://github.com/romkey/weewx-matrix/actions/workflows/ci.yml)
[![WeeWX 5.0+](https://img.shields.io/badge/WeeWX-5.0%2B-0b7285)](https://weewx.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A [WeeWX](https://weewx.com) report skin styled after *The Matrix*: black background,
phosphor-green digital rain, CRT scanlines, and a terminal-window UI. It ships with a
live dashboard, a full Day/Week/Month/Year history browser, and a deep archive that
lets you browse every month and year your station has ever recorded.

## Features

- **Live dashboard** — current conditions in a `cat /var/status/uplink`-style readout,
  plus 24-hour plots.
- **Extended sensor support** — UV, solar radiation, air quality (PM1.0 / PM2.5 / PM10.0),
  and lightning, each with color-coded threat-level badges. Extended panels are gated on
  `has_data`, so stations without those sensors simply omit the sections.
- **Historical data viewer** — tabbed Day/Week/Month/Year plots plus a statistics
  comparison table.
- **Deep archive** — every calendar month and year gets its own generated page with log
  tables, dropdowns, and directory-style browsing.
- **About / System Info page** — hardware, location, uptime, WeeWX version.
- **Self-hosted fonts** — Share Tech Mono and VT323 (SIL Open Font License). No CDN or
  internet connection required to view reports.
- **Digital rain** — canvas background, CRT scanline overlay, and live clock in a single
  small JS file with no dependencies. Respects `prefers-reduced-motion`.

## Requirements

- WeeWX 5.x (standard Cheetah/Image/Copy generators; no custom Python extension).
- Any WeeWX schema works. Extended-sensor panels and plots appear only when your station
  actually reports that data.

## Installation

### Recommended: `weectl extension install`

From a GitHub release or the repository root:

```bash
weectl extension install https://github.com/romkey/weewx-matrix/archive/refs/heads/main.zip
```

Or, if you have cloned this repository:

```bash
weectl extension install /path/to/weewx-matrix
```

The installer adds a `[[MatrixReport]]` stanza under `[StdReport]` and copies the skin
into your WeeWX `skins/` directory. Restart WeeWX, or generate once without restarting:

```bash
sudo systemctl restart weewx
# or:
weectl report run MatrixReport
```

Open `index.html` in the report's `HTML_ROOT` (by default, the same `public_html`
directory used by your other reports).

### Manual installation

Copy `skins/Matrix/` into your skins directory (commonly `/etc/weewx/skins/` for package
installs, or `~/weewx-data/skins/` for pip installs), then add to `weewx.conf`:

```ini
[StdReport]
    [[MatrixReport]]
        skin = Matrix
        enable = true
```

### Fonts

The skin bundles Share Tech Mono and VT323 under `skins/Matrix/font/`. If you check out
the source tree and the `.ttf` files are missing, fetch them before installing:

```bash
bash scripts/fetch-fonts.sh
```

CI runs this script automatically. The OFL license texts ship in `font/OFL-*.txt`.

## Configuration

Most options can be tuned from `weewx.conf` without editing the skin, by overriding
values under `[StdReport] / [[MatrixReport]]`. The main knobs live in `skin.conf`'s
`[DisplayOptions]` section:

| Option | Purpose |
| --- | --- |
| `observations_current` | Readings shown in Current Conditions, in order. |
| `observations_extended` | Sensors treated as extended telemetry (UV, PM, lightning, …). |
| `observations_stats` | Readings in the History page statistics table. |
| `plot_groups` | Plot groups generated for every period (day/week/month/year). |
| `periods` | Time-span tabs on the History page. |

Example — add another extended sensor in `weewx.conf`:

```ini
[StdReport]
    [[MatrixReport]]
        skin = Matrix
        enable = true
        [[[DisplayOptions]]]
            observations_extended = UV, radiation, pm1_0, pm2_5, pm10_0, lightning_strike_count, lightning_distance, soilMoist1
```

See [skins/Matrix/README.md](skins/Matrix/README.md) for file layout, air-quality notes,
and tips for skin developers.

## Development

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
bash scripts/fetch-fonts.sh
python -m unittest discover -s tests -t tests -v
```

To build an installable zip locally (same layout CI produces):

```bash
bash scripts/fetch-fonts.sh
zip -r dist/weewx-matrix-1.0.0.zip . -x '*.git*' -x 'dist/*' -x '.venv/*'
```

## License

The skin templates, CSS, and JavaScript are licensed under the [MIT License](LICENSE).

Bundled fonts are licensed under the [SIL Open Font License](skins/Matrix/font/OFL-ShareTechMono.txt)
(see also `skins/Matrix/font/OFL-VT323.txt`).
