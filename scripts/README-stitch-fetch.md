# Stitch Asset Fetch Script

This script tries to fetch hosted code/image URLs for your Stitch project screens via MCP, then downloads them with `curl -L`.

## Prerequisites

- `STITCH_API_KEY` must be set in your shell environment.
- `curl.exe` available on Windows (default in modern Windows).

## Run

From `football-analytics-engine`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\fetch-stitch-assets.ps1
```

## Output

- `stitch-downloads/tools-list.json` — MCP tool metadata
- `stitch-downloads/tool-results/*.json` — raw tool responses tried by the script
- `stitch-downloads/downloads/*` — downloaded assets from discovered hosted URLs

## Notes

- The script intentionally tries multiple argument shapes because Stitch MCP tool names/arg schemas can vary.
- If no URLs are found, inspect `stitch-downloads/tool-results` and adapt argument mapping.
