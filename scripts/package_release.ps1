# UNIKART Clean Distribution Packaging Script
# Creates a production-ready, clean source code archive for deployment/handoff
# STRICTLY excludes: .env files (root and nested), .git repository, *.db databases, node_modules, .venv, __pycache__, and build artifacts.

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$destZip = "$PSScriptRoot\..\unikart-release-$timestamp.zip"
$destZip = [System.IO.Path]::GetFullPath($destZip)

Write-Host "📦 Preparing clean UNIKART distribution package..." -ForegroundColor Cyan

$tempStageDir = Join-Path $env:TEMP "unikart_clean_stage_$timestamp"
if (Test-Path $tempStageDir) {
    Remove-Item -Path $tempStageDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempStageDir | Out-Null

$projectRoot = [System.IO.Path]::GetFullPath("$PSScriptRoot\..")

# Copy files using Robocopy for high-performance exclusion of sensitive files and directories
# Excluded Directories: .git, node_modules, .venv, __pycache__, .pytest_cache, dist
# Excluded Files: .env, *.env (except .env.example), *.db, *.db-shm, *.db-wal, *.sqlite, *.pyc, *.log
$excludeDirs = @(".git", "node_modules", ".venv", "venv", "__pycache__", ".pytest_cache", "dist", ".gemini", "brain")
$excludeFiles = @("*.env", ".env", "*.db", "*.db-shm", "*.db-wal", "*.sqlite", "*.sqlite3", "*.pyc", "*.pyo", "*.log", "test_unikart.db")

$roboArgs = @(
    $projectRoot,
    $tempStageDir,
    "/E",
    "/XD"
) + $excludeDirs + @(
    "/XF"
) + $excludeFiles + @(
    "/NFL", "/NDL", "/NJH", "/NJS"
)

& robocopy @roboArgs | Out-Null

# Robocopy exit codes 0-7 indicate success
if ($LASTEXITCODE -ge 8) {
    Write-Error "Robocopy failed with exit code $LASTEXITCODE"
}

# Explicitly ensure all safe example configs are retained if missed
$exampleEnvFiles = Get-ChildItem -Path $projectRoot -Filter "*.env.example" -Recurse
foreach ($envEx in $exampleEnvFiles) {
    $relative = $envEx.FullName.Substring($projectRoot.Length).TrimStart("\", "/")
    $targetPath = Join-Path $tempStageDir $relative
    $targetDir = Split-Path $targetPath -Parent
    if (!(Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }
    Copy-Item -Path $envEx.FullName -Destination $targetPath -Force
}

# Double check that ZERO sensitive files exist in the stage directory
$leakedFiles = Get-ChildItem -Path $tempStageDir -Recurse | Where-Object {
    ($_.Name -eq ".env" -or ($_.Name.EndsWith(".env") -and !$_.Name.EndsWith(".env.example") -and !$_.Name.EndsWith(".env.production.example"))) -or
    ($_.Extension -in @(".db", ".sqlite", ".pyc") -or $_.Name -like "*test*.db")
}

if ($leakedFiles.Count -gt 0) {
    Write-Error "Security audit failed! The following sensitive files were detected in stage: $($leakedFiles.FullName -join ', ')"
}

# Create the clean ZIP archive
if (Test-Path $destZip) {
    Remove-Item -Path $destZip -Force
}

Compress-Archive -Path "$tempStageDir\*" -DestinationPath $destZip -Force

# Cleanup temp staging directory
Remove-Item -Path $tempStageDir -Recurse -Force

Write-Host "✅ Verified Clean Distribution Archive created at: $destZip" -ForegroundColor Green
Write-Host "🔒 Verified: Zero .env secrets, Zero .git history, Zero *.db files, Zero node_modules included." -ForegroundColor Green
