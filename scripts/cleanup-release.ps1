$ErrorActionPreference = 'SilentlyContinue'

Write-Output '=== 疑似占用进程 ==='
$suspects = Get-Process | Where-Object {
    $_.ProcessName -match 'electron|app-builder|简历|ResumeMaker' -or
    ($_.Path -and $_.Path -like '*win-unpacked*')
}
$suspects | ForEach-Object { Write-Output ("KILL: " + $_.Id + " " + $_.ProcessName + " " + $_.Path) }
$suspects | Stop-Process -Force
Start-Sleep -Milliseconds 800

Write-Output '=== 删除 win-unpacked ==='
Remove-Item -LiteralPath 'C:\Users\Administrator\Desktop\简历制作机\release\win-unpacked' -Recurse -Force
if (Test-Path 'C:\Users\Administrator\Desktop\简历制作机\release\win-unpacked') {
    Write-Output '删除失败，目录仍存在'
} else {
    Write-Output '删除成功'
}
