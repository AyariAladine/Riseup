# Quick Launch Script for AI Calendar System

Write-Host "🚀 Starting RiseUP AI Calendar System..." -ForegroundColor Green
Write-Host ""

# Check if Node.js is running
$nodeProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcess) {
    Write-Host "✅ Next.js is already running on http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "⚠️ Next.js is not running" -ForegroundColor Yellow
    Write-Host "   Starting Next.js dev server..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\alaay\Desktop\next_app'; npm run dev"
    Start-Sleep -Seconds 3
    Write-Host "✅ Next.js started!" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open PyCharm" -ForegroundColor White
Write-Host "2. Open project: C:\Users\alaay\Desktop\next_app\src\ai" -ForegroundColor White
Write-Host "3. Right-click app.py → Run 'app'" -ForegroundColor White
Write-Host "4. Wait for Flask to start on port 5000" -ForegroundColor White
Write-Host "5. Open browser: http://localhost:3000/dashboard/calendar" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Ready to get AI recommendations!" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
