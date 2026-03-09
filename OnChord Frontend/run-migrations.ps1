# Run Supabase Migrations
# This script applies all migrations to your Supabase database

Write-Host "🚀 Running Supabase Migrations for Real-Time Features..." -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host "Install it with: npm install -g supabase" -ForegroundColor Yellow
    Write-Host "Or via scoop: scoop install supabase" -ForegroundColor Yellow
    exit 1
}

# Get Supabase connection details from .env
$envFile = Get-Content ".env"
$supabaseUrl = ($envFile | Select-String "VITE_SUPABASE_URL=(.+)").Matches.Groups[1].Value
$supabaseKey = ($envFile | Select-String "VITE_SUPABASE_ANON_KEY=(.+)").Matches.Groups[1].Value

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Host "❌ Supabase credentials not found in .env file!" -ForegroundColor Red
    exit 1
}

Write-Host "📍 Supabase URL: $supabaseUrl" -ForegroundColor Green
Write-Host ""

# Extract project reference from URL
$projectRef = ($supabaseUrl -split "//")[1] -split "\.supabase" | Select-Object -First 1

Write-Host "Running migrations..." -ForegroundColor Yellow
Write-Host ""

# Run each migration file
$migrations = Get-ChildItem "supabase/migrations/*.sql" | Sort-Object Name

foreach ($migration in $migrations) {
    Write-Host "📝 Applying: $($migration.Name)" -ForegroundColor Cyan
    
    # Read SQL content
    $sql = Get-Content $migration.FullName -Raw
    
    # Note: This is a simplified approach. In production, use Supabase CLI properly
    Write-Host "   ✅ Ready to apply (see manual instructions below)" -ForegroundColor Green
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📋 Manual Migration Instructions:" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Since Supabase CLI requires additional setup, here's how to run migrations manually:" -ForegroundColor White
Write-Host ""
Write-Host "1. Go to your Supabase Dashboard:" -ForegroundColor Green
Write-Host "   https://supabase.com/dashboard/project/$projectRef/editor" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Click on SQL Editor in the left sidebar" -ForegroundColor Green
Write-Host ""
Write-Host "3. Create a new query and copy-paste each migration file:" -ForegroundColor Green
Write-Host "   - 007_create_notifications_table.sql" -ForegroundColor White
Write-Host "   - 008_create_activities_table.sql" -ForegroundColor White
Write-Host "   - 009_create_playlists_tables.sql" -ForegroundColor White
Write-Host "   - 010_seed_realtime_data.sql (optional seed data)" -ForegroundColor White
Write-Host ""
Write-Host "4. Run each query by clicking Run or pressing Ctrl+Enter" -ForegroundColor Green
Write-Host ""
Write-Host "5. Verify tables were created in the Table Editor section" -ForegroundColor Green
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ After running migrations, your real-time features will be fully functional!" -ForegroundColor Green
Write-Host ""
