param(
  [Parameter(Mandatory = $false)]
  [string]$ProjectName = "astro",
  [Parameter(Mandatory = $false)]
  [string]$ProductionBranch = "main"
)

Write-Host "=== Astro Cloudflare Pages Setup (Terminal-Only) ===" -ForegroundColor Cyan
Write-Host "Project: $ProjectName"
Write-Host "Branch:  $ProductionBranch"
Write-Host ""

Write-Host "1) Authenticate with Cloudflare:" -ForegroundColor Yellow
Write-Host "   npx wrangler login"
Write-Host ""

Write-Host "2) Create/attach Pages project in Cloudflare dashboard:" -ForegroundColor Yellow
Write-Host "   - Connect GitHub repository"
Write-Host "   - Set Production branch to '$ProductionBranch'"
Write-Host "   - Build command: npm run build"
Write-Host "   - Build output directory: build/client"
Write-Host ""

Write-Host "3) Set Pages environment variables (Dashboard -> Settings -> Variables):" -ForegroundColor Yellow
Write-Host "   - Add runtime keys needed by server routes"
Write-Host "   - Add secrets (never in client code)"
Write-Host ""

Write-Host "4) Optional CLI deploy from local build:" -ForegroundColor Yellow
Write-Host "   npm run build"
Write-Host "   npx wrangler pages deploy ./build/client --project-name $ProjectName"
Write-Host ""

Write-Host "5) Add custom domain (Dashboard -> Pages -> Custom domains)." -ForegroundColor Yellow
Write-Host ""

Write-Host "Done. Keep this setup admin-only; end users should not access infra tokens." -ForegroundColor Green
