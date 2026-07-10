$path = "D:\A\TaoVideo\src\app\login\actions.ts"
takeown /f $path
icacls $path /grant Users:F
(Get-Content $path) -replace '}\\n$', '}' | Set-Content $path
Write-Host "Da fix loi file actions.ts xong!"
Pause
