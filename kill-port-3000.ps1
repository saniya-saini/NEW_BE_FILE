# Kill process using port 3000 (fixes EADDRINUSE)
$conn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force
    Write-Host "Killed process on port 3000. You can now run: node server.js"
} else {
    Write-Host "No process is using port 3000."
}
