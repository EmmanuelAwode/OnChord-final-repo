param(
    [Parameter(Mandatory = $false)]
    [string]$AllowedOrigins,

    [Parameter(Mandatory = $false)]
    [string]$ProjectRef,

    [Parameter(Mandatory = $false)]
    [string]$EnvFile = "OnChord Frontend/.env"
)

$ErrorActionPreference = "Stop"

function Resolve-ProjectRef {
    param([string]$Url)
    if (-not $Url) { return $null }
    if ($Url -match "https://([^.]+)\.supabase\.co") {
        return $Matches[1]
    }
    return $null
}

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Error "Supabase CLI is not installed. Install it with: npm install -g supabase"
}

if (-not $ProjectRef) {
    if (Test-Path $EnvFile) {
        $envText = Get-Content $EnvFile -Raw
        if ($envText -match "VITE_SUPABASE_URL=(.+)") {
            $supabaseUrl = $Matches[1].Trim().Trim('"').Trim("'")
            $ProjectRef = Resolve-ProjectRef -Url $supabaseUrl
        }
    }
}

if (-not $ProjectRef) {
    Write-Error "Could not resolve project ref. Pass -ProjectRef <your-ref> or ensure VITE_SUPABASE_URL exists in $EnvFile"
}

if (-not $AllowedOrigins) {
    $AllowedOrigins = "https://onchord-frontend.onrender.com,http://localhost:3001"
}

if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Warning "SUPABASE_ACCESS_TOKEN is not set. You must run 'supabase login' first or set the token env var."
}

Write-Host "Setting ALLOWED_ORIGINS for project $ProjectRef" -ForegroundColor Cyan
Write-Host "Value: $AllowedOrigins" -ForegroundColor Gray

supabase secrets set ALLOWED_ORIGINS="$AllowedOrigins" --project-ref $ProjectRef

Write-Host "Done. Redeploy functions if needed:" -ForegroundColor Green
Write-Host "  supabase functions deploy spotify-callback --project-ref $ProjectRef" -ForegroundColor Gray
Write-Host "  supabase functions deploy spotify-refresh --project-ref $ProjectRef" -ForegroundColor Gray
Write-Host "  supabase functions deploy ticketmaster-proxy --project-ref $ProjectRef" -ForegroundColor Gray
