param(
  [string]$MySqlUser = "root",
  [string]$MySqlDatabase = "magang_db",
  [string]$MongoDatabase = "magang_chat",
  [string]$OutputDir = "db-migration"
)

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $OutputDir $timestamp
$mysqlFile = Join-Path $target "$MySqlDatabase.sql"
$mongoDir = Join-Path $target "mongodb"

New-Item -ItemType Directory -Force -Path $target | Out-Null

Write-Host "Exporting MySQL database '$MySqlDatabase' to $mysqlFile"
mysqldump `
  -u $MySqlUser `
  -p `
  --single-transaction `
  --routines `
  --triggers `
  --default-character-set=utf8mb4 `
  $MySqlDatabase > $mysqlFile

Write-Host "Exporting MongoDB database '$MongoDatabase' to $mongoDir"
mongodump `
  --db $MongoDatabase `
  --out $mongoDir

Write-Host ""
Write-Host "Done. Copy this folder to Mac:"
Write-Host (Resolve-Path $target)
Write-Host ""
Write-Host "Also copy uploaded CV files if needed:"
Write-Host "backend-php\uploads\cv"
