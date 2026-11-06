# Cut per-character images out of the chart: img/chars/<id>.jpg (portrait) and img/cards/<id>.jpg (whole cell)
# Also writes a contact sheet to the path given as -Sheet for visual checking.
param([string]$Sheet = '')
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$bmp = New-Object System.Drawing.Bitmap (Join-Path $root 'img\chart.jpg')
$chars = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'tools\characters.json') | ConvertFrom-Json
$grid = Get-Content -Raw (Join-Path $root 'tools\grid.json') | ConvertFrom-Json
New-Item -ItemType Directory -Force (Join-Path $root 'img\chars') | Out-Null
New-Item -ItemType Directory -Force (Join-Path $root 'img\cards') | Out-Null
$jpg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]93)

# bottom edge per row = median of detected bottoms
$rowBottom = @{}
foreach ($g in ($grid | Group-Object row)) {
  $ys = @($g.Group | ForEach-Object { $_.y1 } | Sort-Object)
  $rowBottom[[int]$g.Name] = $ys[[int][math]::Floor($ys.Count / 2)]
}

$PW = 107; $PH = 116   # portrait size (the white panel inside the cell)
$CW = 170; $CH = 182   # card size
$perRow = 14
$sheetBmp = $null
if ($Sheet) {
  $rows = [math]::Ceiling($chars.Count / $perRow)
  $sheetBmp = New-Object System.Drawing.Bitmap ($perRow * $PW), ($rows * $PH)
  $sg = [System.Drawing.Graphics]::FromImage($sheetBmp)
  $sg.Clear([System.Drawing.Color]::White)
}
$i = 0
foreach ($c in $chars) {
  $cell = $grid | Where-Object { $_.row -eq $c.row -and $_.col -eq $c.col } | Select-Object -First 1
  if (-not $cell) { "MISSING cell for $($c.id)"; $i++; continue }
  $cx = ($cell.x0 + $cell.x1) / 2.0
  $x0 = [int][math]::Round($cx - 83)
  $y0 = $rowBottom[[int]$c.row] - 178

  $pr = New-Object System.Drawing.Rectangle ($x0 + 52), ($y0 + 5), $PW, $PH
  $p = $bmp.Clone($pr, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $p.Save((Join-Path $root "img\chars\$($c.id).jpg"), $jpg, $ep)
  if ($sheetBmp) { $sg.DrawImage($p, ($i % $perRow) * $PW, [math]::Floor($i / $perRow) * $PH, $PW, $PH) }
  $p.Dispose()

  $cr = New-Object System.Drawing.Rectangle ($x0 - 2), ($y0 - 2), $CW, $CH
  $k = $bmp.Clone($cr, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $k.Save((Join-Path $root "img\cards\$($c.id).jpg"), $jpg, $ep)
  $k.Dispose()
  $i++
}
if ($sheetBmp) { $sg.Dispose(); $sheetBmp.Save($Sheet, [System.Drawing.Imaging.ImageFormat]::Png); $sheetBmp.Dispose() }
$bmp.Dispose()
"done: $i characters"
