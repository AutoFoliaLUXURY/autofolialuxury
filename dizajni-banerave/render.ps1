# Nxjerr banerët si JPG në madhësitë e sakta me Edge (pa dritare).
#   powershell -ExecutionPolicy Bypass -File banners\render.ps1 -Html snow-socks.html -Name chorapi-za-sneg
param([string]$Html = 'snow-socks.html', [string]$Name = 'baner', [int]$Quality = 86)
$ErrorActionPreference = 'Stop'
$dir  = $PSScriptRoot
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }
Add-Type -AssemblyName System.Drawing
$uri = ([Uri](Join-Path $dir $Html)).AbsoluteUri
foreach ($v in @(@{k='d'; w=1920; h=720; s='kompjuter'}, @{k='m'; w=1080; h=1000; s='celular'})) {
  $png = Join-Path $dir "$Name-$($v.s).png"
  $jpg = Join-Path $dir "$Name-$($v.s)-$($v.w)x$($v.h).jpg"
  $prof = Join-Path $env:TEMP "edge-banner-$($v.k)"
  & $edge --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 "--user-data-dir=$prof" `
      "--window-size=$($v.w),$($v.h)" "--screenshot=$png" --virtual-time-budget=8000 --allow-file-access-from-files "$uri`?v=$($v.k)" | Out-Null
  $t = 0; while (-not (Test-Path $png) -and $t -lt 40) { Start-Sleep -Milliseconds 250; $t++ }
  $img = [Drawing.Image]::FromFile($png)
  $enc = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $ep  = New-Object Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality), ([long]$Quality)
  $img.Save($jpg, $enc, $ep); $size = "$($img.Width)x$($img.Height)"; $img.Dispose(); Remove-Item $png
  "{0}  {1}  {2:N0} KB" -f (Split-Path $jpg -Leaf), $size, ((Get-Item $jpg).Length / 1KB)
}
