#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Cài đặt và cấu hình OpenSSH Server trên Windows
.DESCRIPTION
    - Cài OpenSSH Server
    - Khởi động service
    - Mở firewall port 22
    - Configure key-based auth (optional)
.NOTES
    Chạy PowerShell AS ADMINISTRATOR
#>

Write-Host "=== Cài đặt OpenSSH Server trên Windows ===" -ForegroundColor Cyan

# 1. Kiểm tra và cài OpenSSH Server
Write-Host "`n[1/5] Kiểm tra OpenSSH Server..." -ForegroundColor Yellow
$capability = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'

if ($capability.State -eq 'Installed') {
    Write-Host "  ✓ OpenSSH Server đã được cài đặt" -ForegroundColor Green
} else {
    Write-Host "  → Đang cài đặt OpenSSH Server..." -ForegroundColor Yellow
    Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
    Write-Host "  ✓ Đã cài đặt xong" -ForegroundColor Green
}

# 2. Khởi động service sshd
Write-Host "`n[2/5] Khởi động SSH Server service..." -ForegroundColor Yellow
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic
Write-Host "  ✓ Service sshd đã chạy và khởi động cùng Windows" -ForegroundColor Green

# 3. Mở firewall
Write-Host "`n[3/5] Mở firewall port 22..." -ForegroundColor Yellow
$rule = Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue
if (-not $rule) {
    New-NetFirewallRule -Name "OpenSSH-Server-In-TCP" `
        -DisplayName "OpenSSH Server (sshd)" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort 22 `
        -Action Allow `
        -Profile Any
    Write-Host "  ✓ Đã tạo firewall rule" -ForegroundColor Green
} else {
    Write-Host "  ✓ Firewall rule đã tồn tại" -ForegroundColor Green
}

# 4. Kiểm tra cấu hình
Write-Host "`n[4/5] Kiểm tra cấu hình..." -ForegroundColor Yellow
$sshdConfig = Get-Content "$env:ProgramData\ssh\sshd_config" -ErrorAction SilentlyContinue
$port = ($sshdConfig | Select-String "^Port\s+(\d+)").Matches.Groups[1].Value
if (-not $port) { $port = "22" }
Write-Host "  Port: $port"

# 5. Hiển thị thông tin
Write-Host "`n[5/5] Thông tin kết nối..." -ForegroundColor Yellow
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -ne "127.0.0.1"} | Select-Object -ExpandProperty IPAddress

Write-Host "`n=== THÔNG TIN KẾT NỐI ===" -ForegroundColor Cyan
Write-Host "IP Address(s):" -ForegroundColor White
foreach ($ip in $ipAddresses) {
    Write-Host "  → $ip" -ForegroundColor Green
}
Write-Host "Port: $port" -ForegroundColor White
Write-Host "Username: $env:USERNAME" -ForegroundColor White
Write-Host "`nCommand kết nối từ điện thoại:" -ForegroundColor White
Write-Host "  ssh $env:USERNAME@$($ipAddresses[0])" -ForegroundColor Yellow

Write-Host "`n=== HƯỚNG DẪN TỪ ĐIỆN THOẠI ===" -ForegroundColor Cyan
Write-Host "1. Cài Termius (iOS/Android) hoặc JuiceSSH (Android)" -ForegroundColor White
Write-Host "2. Tạo host mới:" -ForegroundColor White
Write-Host "   - Hostname: $($ipAddresses[0])" -ForegroundColor Green
Write-Host "   - Port: $port" -ForegroundColor Green
Write-Host "   - Username: $env:USERNAME" -ForegroundColor Green
Write-Host "3. Kết nối và nhập password" -ForegroundColor White

Write-Host "`n=== HOẶC DÙNG KEY-BASED AUTH (khuyến nghị) ===" -ForegroundColor Cyan
Write-Host "Xem hướng dẫn trong file setup-ssh-keys.ps1" -ForegroundColor White

Write-Host "`n✓ HOÀN THÀNH!" -ForegroundColor Green
