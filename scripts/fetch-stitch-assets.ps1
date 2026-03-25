param(
    [string]$ProjectId = '6571750922784103837',
    [string[]]$ScreenIds = @(
        'asset-stub-assets-0bc7e48598cb4ee19cc58ddd6c1d0405-1774333160952',
        '8ba609145fd64ae6b8cab8d912310b08',
        '79e6251b57714c4396170cb294b86d57',
        'e380247150074abeb9f587f2c845c250',
        'e63a21d378c64bcf9d2f065d25be2df7'
    ),
    [string]$Endpoint = 'https://stitch.googleapis.com/mcp',
    [string]$OutDir = 'stitch-downloads'
)

$ErrorActionPreference = 'Stop'

if (-not $env:STITCH_API_KEY) {
    throw 'STITCH_API_KEY is not set. Set it in your environment before running this script.'
}

$root = Split-Path -Parent $PSScriptRoot
$outPath = Join-Path $root $OutDir
New-Item -ItemType Directory -Force -Path $outPath | Out-Null

$headers = @{
    'X-Goog-Api-Key' = $env:STITCH_API_KEY
    'Content-Type'   = 'application/json'
}

$idCounter = 0
function Invoke-Mcp {
    param(
        [string]$Method,
        [hashtable]$Params = @{}
    )

    $script:idCounter += 1
    $payload = @{
        jsonrpc = '2.0'
        id      = $script:idCounter
        method  = $Method
        params  = $Params
    } | ConvertTo-Json -Depth 20

    $resp = Invoke-WebRequest -Uri $Endpoint -Method POST -Headers $headers -Body $payload
    $obj = $resp.Content | ConvertFrom-Json -Depth 50

    if ($obj.error) {
        throw ('MCP error on {0}: {1} {2}' -f $Method, $obj.error.code, $obj.error.message)
    }
    return $obj.result
}

function Get-UrlsFromObject {
    param($Object)

    $json = $Object | ConvertTo-Json -Depth 50
    $urlHits = [regex]::Matches($json, 'https?://[^"\s]+')
    return ($urlHits | ForEach-Object { $_.Value } | Sort-Object -Unique)
}

function Save-Json {
    param(
        [string]$FilePath,
        $Object
    )
    $Object | ConvertTo-Json -Depth 50 | Set-Content -Path $FilePath -Encoding UTF8
}

Write-Host 'Initializing MCP session...'
$null = Invoke-Mcp -Method 'initialize' -Params @{
    protocolVersion = '2024-11-05'
    capabilities    = @{}
    clientInfo      = @{ name = 'stitch-fetch-script'; version = '1.0' }
}

Write-Host 'Listing tools...'
$toolsResult = Invoke-Mcp -Method 'tools/list'
Save-Json -FilePath (Join-Path $outPath 'tools-list.json') -Object $toolsResult

$tools = @($toolsResult.tools)
if (-not $tools -or $tools.Count -eq 0) {
    throw 'No MCP tools returned by Stitch endpoint.'
}

$toolOut = Join-Path $outPath 'tool-results'
New-Item -ItemType Directory -Force -Path $toolOut | Out-Null

$downloadOut = Join-Path $outPath 'downloads'
New-Item -ItemType Directory -Force -Path $downloadOut | Out-Null

$allUrls = New-Object System.Collections.Generic.HashSet[string]

# Try all plausible stitch tools with multiple argument shapes; keep successful outputs.
foreach ($screenId in $ScreenIds) {
    Write-Host "\nProcessing screen: $screenId"

    foreach ($t in $tools) {
        $name = $t.name
        if (-not $name) { continue }

        $looksRelevant = ($name -match 'stitch|screen|project|asset|image|code|export|get|fetch')
        if (-not $looksRelevant) { continue }

        $paramSets = @(
            @{ projectId = $ProjectId; screenId = $screenId },
            @{ project_id = $ProjectId; screen_id = $screenId },
            @{ project = $ProjectId; screen = $screenId },
            @{ projectId = $ProjectId; id = $screenId },
            @{ project_id = $ProjectId; id = $screenId },
            @{ id = $screenId },
            @{ screenId = $screenId },
            @{ screen_id = $screenId },
            @{ projectId = $ProjectId },
            @{ project_id = $ProjectId }
        )

        foreach ($callParams in $paramSets) {
            try {
                $result = Invoke-Mcp -Method 'tools/call' -Params @{ name = $name; arguments = $callParams }

                $safeName = ($name -replace '[^a-zA-Z0-9._-]', '_')
                $argHash = ($callParams | ConvertTo-Json -Compress -Depth 10).GetHashCode()
                $outFile = Join-Path $toolOut ("$screenId`__$safeName`__$argHash.json")
                Save-Json -FilePath $outFile -Object $result

                $urls = Get-UrlsFromObject -Object $result
                foreach ($u in $urls) { [void]$allUrls.Add($u) }
            } catch {
                # Ignore mismatched tools/args; this script is intentionally brute-force.
            }
        }
    }
}

if ($allUrls.Count -eq 0) {
    Write-Host '\nNo hosted URLs were discovered in MCP responses.' -ForegroundColor Yellow
    Write-Host "Check $outPath for raw tool outputs and adjust tool argument mapping."
    exit 1
}

Write-Host "\nDiscovered $($allUrls.Count) URL(s). Downloading with curl -L..."

$idx = 0
foreach ($url in $allUrls) {
    $idx += 1
    try {
        $uri = [Uri]$url
        $leaf = [IO.Path]::GetFileName($uri.LocalPath)
        if ([string]::IsNullOrWhiteSpace($leaf)) {
            $leaf = "asset-$idx"
        }
        $dest = Join-Path $downloadOut $leaf

        # Keep duplicates distinct
        if (Test-Path $dest) {
            $dest = Join-Path $downloadOut ("$idx-$leaf")
        }

        & curl.exe -L "$url" -o "$dest"
        Write-Host "Downloaded: $url -> $dest"
    } catch {
        Write-Host "Failed to download: $url" -ForegroundColor Yellow
    }
}

Write-Host "\nDone. Outputs in: $outPath"
