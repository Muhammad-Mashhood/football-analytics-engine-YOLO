
param(
    [switch]$NoMigrate,
    [switch]$FrontendOnly
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $projectRoot
$pythonExe = Join-Path $workspaceRoot 'env\Scripts\python.exe'

if (-not (Test-Path $pythonExe)) {
    Write-Error "Python executable not found at $pythonExe"
}

$backendDir = Join-Path $projectRoot 'backend'
$frontendDir = Join-Path $projectRoot 'frontend'

if (-not (Test-Path $backendDir)) {
    Write-Error "Backend directory not found: $backendDir"
}
if (-not (Test-Path $frontendDir)) {
    Write-Error "Frontend directory not found: $frontendDir"
}

function Test-TcpPort {
    param(
        [string]$HostName,
        [int]$Port,
        [int]$TimeoutMs = 1200
    )
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $iar = $client.BeginConnect($HostName, $Port, $null, $null)
        if (-not $iar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
            $client.Close()
            return $false
        }
        $client.EndConnect($iar)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

function Start-ServiceIfFound {
    param(
        [string[]]$NamePatterns,
        [string]$Label
    )

    $svc = $null
    foreach ($pattern in $NamePatterns) {
        $svc = Get-Service -Name $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -ne $svc) { break }
    }

    if ($null -eq $svc) {
        Write-Host "$Label service not found by patterns: $($NamePatterns -join ', ')" -ForegroundColor Yellow
        return $false
    }

    if ($svc.Status -ne 'Running') {
        Write-Host "Starting $Label service: $($svc.Name)"
        try {
            Start-Service -Name $svc.Name
            $svc.WaitForStatus('Running', [TimeSpan]::FromSeconds(20))
        } catch {
            Write-Host "Failed to start $Label service ($($svc.Name)): $($_.Exception.Message)" -ForegroundColor Yellow
            return $false
        }
    }

    return $true
}

if (-not $FrontendOnly) {
    Write-Host 'Checking infrastructure services (PostgreSQL, Redis)...'
    [void](Start-ServiceIfFound -NamePatterns @('postgresql*', 'PostgreSQL*') -Label 'PostgreSQL')
    [void](Start-ServiceIfFound -NamePatterns @('redis*', 'Redis*', 'memurai*', 'Memurai*') -Label 'Redis')

    $pgOk = $false
    $rdOk = $false
    for ($i = 0; $i -lt 20; $i++) {
        if (-not $pgOk) { $pgOk = Test-TcpPort -HostName 'localhost' -Port 5432 }
        if (-not $rdOk) { $rdOk = Test-TcpPort -HostName 'localhost' -Port 6379 }
        if ($pgOk -and $rdOk) { break }
        Start-Sleep -Seconds 1
    }

    if (-not $pgOk -or -not $rdOk) {
        Write-Host ''
        Write-Host 'Cannot start backend stack because required ports are not reachable:' -ForegroundColor Red
        Write-Host "  PostgreSQL localhost:5432 => $pgOk"
        Write-Host "  Redis      localhost:6379 => $rdOk"
        Write-Host ''
        Write-Host 'Start PostgreSQL and Redis, then re-run this command.' -ForegroundColor Yellow
        Write-Host 'Tip: you can still launch frontend only with:' -ForegroundColor Yellow
        Write-Host '  powershell -ExecutionPolicy Bypass -File .\start-all.ps1 -FrontendOnly'
        exit 1
    }
}

$djangoCmd = if ($NoMigrate) {
    "Set-Location '$backendDir'; & '$pythonExe' manage.py runserver 8000"
} else {
    "Set-Location '$backendDir'; & '$pythonExe' manage.py migrate; & '$pythonExe' manage.py runserver 8000"
}

$fastapiCmd = "Set-Location '$backendDir'; & '$pythonExe' -m uvicorn fastapi_ml.main:app --host 0.0.0.0 --port 8001 --reload"
$celeryCmd = "Set-Location '$backendDir'; & '$pythonExe' -m celery -A celery_app worker -n worker1@%h --pool=solo --loglevel=info"
$frontendCmd = "Set-Location '$frontendDir'; npm run dev"

Write-Host 'Starting services in separate PowerShell windows...'
Start-Process powershell -ArgumentList @('-NoExit', '-Command', $frontendCmd)

if (-not $FrontendOnly) {
    Start-Process powershell -ArgumentList @('-NoExit', '-Command', $djangoCmd)
    Start-Process powershell -ArgumentList @('-NoExit', '-Command', $fastapiCmd)
    Start-Process powershell -ArgumentList @('-NoExit', '-Command', $celeryCmd)
}

Write-Host 'All services launched.'
Write-Host 'Frontend:http://localhost:5173'
if (-not $FrontendOnly) {
    Write-Host 'Django:  http://localhost:8000'
    Write-Host 'FastAPI: http://localhost:8001/health'
}
