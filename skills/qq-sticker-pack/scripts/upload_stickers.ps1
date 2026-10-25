# 批量把表情 PNG 上架到 QQ 收藏表情（SnowLuma / NapCat OneBot HTTP API）
#
# 用法：
#   .\upload_stickers.ps1 -StickerDir D:\qqbot\stickers `
#                         -BridgeConfig D:\qqbot\qq-bridge\config.json `
#                         -Captions @{ idle='在的'; yay='好耶' }
#
# 依赖：本机正在跑的 SnowLuma/NapCat HTTP API（默认 127.0.0.1:3000）。
# 注意：JSON 一律写临时文件再用 --data-binary @file 传，
#       命令行内联 JSON 会被 PowerShell 的引号规则破坏（实测）。

param(
  [Parameter(Mandatory = $true)][string]$StickerDir,
  [Parameter(Mandatory = $true)][string]$BridgeConfig,
  [hashtable]$Captions = @{},
  [string]$HttpUrl = 'http://127.0.0.1:3000'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $BridgeConfig)) { throw "找不到桥接配置：$BridgeConfig" }
$cfg = Get-Content $BridgeConfig -Raw -Encoding UTF8 | ConvertFrom-Json
$token = $cfg.snowluma.accessToken
if (-not $token) { throw 'config.json 里没有 snowluma.accessToken（桥接启动后会自动自愈写回）' }
$auth = @("-H", "Authorization: Bearer $token")

function Invoke-OneBot([string]$action, [string]$json) {
  $body = Join-Path $env:TEMP ("ob_" + $action + "_" + [guid]::NewGuid().ToString('N').Substring(0, 8) + ".json")
  [System.IO.File]::WriteAllText($body, $json, (New-Object System.Text.UTF8Encoding($false)))
  try {
    curl.exe -sS -m 30 @auth -X POST "$HttpUrl/$action" -H 'Content-Type: application/json' --data-binary "@$body" 2>&1
  } finally {
    Remove-Item $body -Force -ErrorAction SilentlyContinue
  }
}

function Count-Stickers {
  # 传 {"count":N} 时 SnowLuma 会返回空数组（实测雪崩为 0 条），必须发空对象 {}
  $raw = Invoke-OneBot 'fetch_custom_face_detail' '{}'
  try { return (($raw | ConvertFrom-Json).data | Measure-Object).Count } catch { return -1 }
}

$before = Count-Stickers
Write-Host "上传前收藏数: $before"

$pngs = Get-ChildItem $StickerDir -Filter *.png | Sort-Object Name
if (-not $pngs) { throw "$StickerDir 下没有 PNG" }

foreach ($png in $pngs) {
  $key = [System.IO.Path]::GetFileNameWithoutExtension($png.Name)
  $b64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($png.FullName))
  $res = Invoke-OneBot 'add_custom_face' ('{"file":"base64://' + $b64 + '"}')
  $obj = $null
  try { $obj = $res | ConvertFrom-Json } catch { }
  $eid = if ($obj) { [string]$obj.data.emoji_id } else { '' }
  $state = if ($obj) { "$($obj.status)/$($obj.retcode)" } else { 'parse-fail' }
  Write-Host ("{0,-12} -> {1}  emoji_id={2}" -f $key, $state, $eid)

  $caption = if ($Captions.ContainsKey($key)) { $Captions[$key] } else { $key }
  if ($eid -and $caption) {
    # 备注最多 20 字，超长由网关截断
    $desc = $caption
    if ($desc.Length -gt 20) { $desc = $desc.Substring(0, 20) }
    $r = Invoke-OneBot 'modify_custom_face' ('{"emoji_id":"' + $eid + '","desc":"' + $desc + '"}')
    Write-Host ("            备注 {0} -> {1}" -f $desc, $r.Trim())
  }
  Start-Sleep -Milliseconds 400
}

Start-Sleep -Seconds 2
$after = Count-Stickers
Write-Host "上传后收藏数: $after（增加 $($after - $before)）"
if ($after -le $before) {
  Write-Warning '收藏数没有增加：检查 token、网关是否在线、以及是否触发了频率限制'
}
