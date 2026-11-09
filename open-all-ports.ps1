# ==============================================================================
# UNIKART Ecosystem — Browser Opener
# Opens the 2 Maintained Applications + FastAPI OpenAPI Docs in your default browser
# ==============================================================================

$urls = @(
  "http://localhost:5173/",         # 01. Customer E-Commerce Storefront
  "http://localhost:5177/login",    # 02. Inventory & Business Management Console
  "http://localhost:8000/docs"      # FastAPI OpenAPI Documentation
)

Write-Host "Opening all UNIKART services in default browser..." -ForegroundColor Cyan
foreach ($u in $urls) {
  Write-Host " -> $u" -ForegroundColor Green
  Start-Process $u
  Start-Sleep -Milliseconds 400
}
Write-Host "All applications opened successfully!" -ForegroundColor Green
