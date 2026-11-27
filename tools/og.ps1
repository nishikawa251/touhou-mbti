# Renders the share images for every character:
#   img/og/<id>.jpg       1200x630  simple card (used for OGP)
#   img/og/<id>-full.jpg  1200x900  detailed card with the description text
#   img/og/site.jpg       1200x630  top page card
# Run after: node tools/build-share.mjs
# Keep this file ASCII-only (PowerShell 5.1 misreads BOM-less UTF-8). Japanese text comes from og-data.json.
param([string]$Root = (Split-Path -Parent $PSScriptRoot))

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

$dataPath = Join-Path $Root 'docs/img/og/og-data.json'
$json = Get-Content -LiteralPath $dataPath -Raw -Encoding UTF8 | ConvertFrom-Json
$outDir = Join-Path $Root 'docs/img/og'

$W = 1200
$fontName = 'Zen Maru Gothic'
$fams = (New-Object System.Drawing.Text.InstalledFontCollection).Families | ForEach-Object { $_.Name }
if ($fams -notcontains $fontName) { $fontName = 'Yu Gothic UI' }

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]86)

function Hex($s) { return [System.Drawing.ColorTranslator]::FromHtml($s) }
function RoundRect([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}
function NewFont([single]$size, [bool]$bold) {
  $style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
  return New-Object System.Drawing.Font($fontName, $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
}
function FitFont([System.Drawing.Graphics]$g, [string]$text, [single]$size, [single]$maxW, [single]$minSize, [bool]$bold) {
  while ($size -gt $minSize) {
    $f = NewFont $size $bold
    $m = $g.MeasureString($text, $f)
    if ($m.Width -le $maxW) { return $f }
    $f.Dispose()
    $size -= 2
  }
  return (NewFont $minSize $bold)
}
function NewCanvas([int]$w, [int]$h) {
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  return @($bmp, $g)
}
function SaveJpeg([System.Drawing.Bitmap]$bmp, [string]$path) {
  if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
  $bmp.Save($path, $jpegCodec, $encParams)
}

$ink = Hex '#2a3050'; $ink2 = Hex '#5d6482'; $white = [System.Drawing.Color]::White
$siteLabel = 'https://nishikawa251.github.io/touhou-seikaku-shindan/'
$fmtCenter = New-Object System.Drawing.StringFormat
$fmtCenter.Alignment = [System.Drawing.StringAlignment]::Center
$fmtCenter.LineAlignment = [System.Drawing.StringAlignment]::Center
$fmtLeft = New-Object System.Drawing.StringFormat
$fmtLeft.LineAlignment = [System.Drawing.StringAlignment]::Center
$fmtWrap = New-Object System.Drawing.StringFormat
$fmtWrap.Trimming = [System.Drawing.StringTrimming]::Word

# Draws the character card. $H = 630 (simple) or 900 (with description).
function DrawCard([System.Drawing.Graphics]$g, $c, [int]$H, [bool]$withDesc) {
  $main = Hex $c.color; $soft = Hex $c.soft
  $g.Clear($soft)
  $g.FillRectangle((New-Object System.Drawing.SolidBrush($main)), 0, 0, $W, 14)

  # portrait panel
  $panel = RoundRect 56 50 440 530 28
  $g.FillPath((New-Object System.Drawing.SolidBrush($white)), $panel)
  $g.DrawPath((New-Object System.Drawing.Pen($main, 4)), $panel)
  $img = [System.Drawing.Image]::FromFile((Join-Path $Root ("tools/art-src/" + $c.id + ".png")))
  $g.DrawImage($img, 76, 65, 400, 500)
  $img.Dispose()

  $x = 540; $right = $W - 56; $maxW = $right - $x
  $f = NewFont 26 $true
  $g.DrawString($json.labels.title, $f, (New-Object System.Drawing.SolidBrush($main)), $x, 54); $f.Dispose()
  $f = NewFont 28 $false
  $g.DrawString($json.labels.pre, $f, (New-Object System.Drawing.SolidBrush($ink2)), $x, 96); $f.Dispose()
  $f = FitFont $g $c.name 72 $maxW 40 $true
  $g.DrawString($c.name, $f, (New-Object System.Drawing.SolidBrush($ink)), $x - 6, 136); $nameH = $g.MeasureString($c.name, $f).Height; $f.Dispose()
  $y = 136 + [Math]::Max($nameH, 90) + 10
  $f = NewFont 30 $true
  $codeW = $g.MeasureString($c.mbti, $f).Width + 36
  $pill = RoundRect $x $y $codeW 50 25
  $g.FillPath((New-Object System.Drawing.SolidBrush($main)), $pill)
  $g.DrawString($c.mbti, $f, (New-Object System.Drawing.SolidBrush($white)), (New-Object System.Drawing.RectangleF($x, $y, $codeW, 50)), $fmtCenter)
  $g.DrawString($c.typeName, $f, (New-Object System.Drawing.SolidBrush($main)), (New-Object System.Drawing.RectangleF(($x + $codeW + 14), $y, ($maxW - $codeW - 14), 50)), $fmtLeft)
  $f.Dispose()
  $y += 70
  $f = FitFont $g $c.catch 38 $maxW 26 $true
  $g.DrawString($c.catch, $f, (New-Object System.Drawing.SolidBrush($main)), $x - 3, $y); $y += $g.MeasureString($c.catch, $f).Height + 14; $f.Dispose()
  $f = NewFont 24 $true
  $tx = $x; $ty = $y
  foreach ($t in $c.traits) {
    $tw = $g.MeasureString($t, $f).Width + 30
    if (($tx + $tw) -gt $right) { $tx = $x; $ty += 52 }
    $tag = RoundRect $tx $ty $tw 42 21
    $g.FillPath((New-Object System.Drawing.SolidBrush($white)), $tag)
    $g.DrawPath((New-Object System.Drawing.Pen($main, 2)), $tag)
    $g.DrawString($t, $f, (New-Object System.Drawing.SolidBrush($main)), (New-Object System.Drawing.RectangleF($tx, $ty, $tw, 42)), $fmtCenter)
    $tx += $tw + 10
  }
  $f.Dispose()

  if ($withDesc) {
    # description box under the portrait, full width
    $box = RoundRect 56 612 ($W - 112) 230 22
    $g.FillPath((New-Object System.Drawing.SolidBrush($white)), $box)
    $g.DrawPath((New-Object System.Drawing.Pen($main, 2)), $box)
    $f = NewFont 25 $false
    $g.DrawString($c.desc, $f, (New-Object System.Drawing.SolidBrush($ink)), (New-Object System.Drawing.RectangleF(80, 628, ($W - 160), 150)), $fmtWrap); $f.Dispose()
    $f = NewFont 21 $false
    $blurb = $c.mbti + ' ' + $c.typeName + ': ' + $c.typeBlurb
    $g.DrawString($blurb, $f, (New-Object System.Drawing.SolidBrush($ink2)), (New-Object System.Drawing.RectangleF(80, 790, ($W - 160), 44)), $fmtWrap); $f.Dispose()
  }

  $f = NewFont 22 $false
  $g.DrawString($siteLabel, $f, (New-Object System.Drawing.SolidBrush($ink2)), (New-Object System.Drawing.RectangleF(0, ($H - 44), $W, 30)), $fmtCenter); $f.Dispose()
  $f = NewFont 20 $false
  $g.DrawString($json.labels.credit, $f, (New-Object System.Drawing.SolidBrush($ink2)), 56, ($H - 38)); $f.Dispose()
}

$n = 0
foreach ($c in $json.chars) {
  $pair = NewCanvas $W 630; $bmp = $pair[0]; $g = $pair[1]
  DrawCard $g $c 630 $false
  SaveJpeg $bmp (Join-Path $outDir ($c.id + '.jpg'))
  $g.Dispose(); $bmp.Dispose()

  $pair = NewCanvas $W 900; $bmp = $pair[0]; $g = $pair[1]
  DrawCard $g $c 900 $true
  SaveJpeg $bmp (Join-Path $outDir ($c.id + '-full.jpg'))
  $g.Dispose(); $bmp.Dispose()
  $n++
}

# site image: title + a row of portraits
$pair = NewCanvas $W 630; $bmp = $pair[0]; $g = $pair[1]
$g.Clear((Hex '#fbf6ee'))
$accent = Hex '#cf2f6b'
$g.FillRectangle((New-Object System.Drawing.SolidBrush($accent)), 0, 0, $W, 14)
$f = NewFont 30 $true
$g.DrawString($json.labels.siteEyebrow, $f, (New-Object System.Drawing.SolidBrush($accent)), (New-Object System.Drawing.RectangleF(0, 48, $W, 40)), $fmtCenter); $f.Dispose()
$f = NewFont 76 $true
$g.DrawString($json.labels.siteTitle, $f, (New-Object System.Drawing.SolidBrush($ink)), (New-Object System.Drawing.RectangleF(0, 96, $W, 100)), $fmtCenter); $f.Dispose()
$f = NewFont 30 $false
$g.DrawString($json.labels.siteSub, $f, (New-Object System.Drawing.SolidBrush($ink2)), (New-Object System.Drawing.RectangleF(0, 206, $W, 44)), $fmtCenter); $f.Dispose()
$ids = @('reimu', 'marisa', 'sakuya', 'youmu', 'sanae', 'koishi', 'nue', 'flandre')
$pw = 128; $ph = 160; $gap = 10
$startX = [int](($W - ($ids.Count * $pw + ($ids.Count - 1) * $gap)) / 2)
for ($i = 0; $i -lt $ids.Count; $i++) {
  $px = $startX + $i * ($pw + $gap)
  $card = RoundRect $px 290 $pw $ph 16
  $g.FillPath((New-Object System.Drawing.SolidBrush($white)), $card)
  $g.DrawPath((New-Object System.Drawing.Pen((Hex '#e4d9c6'), 2)), $card)
  $img = [System.Drawing.Image]::FromFile((Join-Path $Root ('tools/art-src/' + $ids[$i] + '.png')))
  $g.DrawImage($img, $px + 4, 295, 120, 150)
  $img.Dispose()
}
$f = NewFont 24 $false
$g.DrawString($siteLabel, $f, (New-Object System.Drawing.SolidBrush($ink2)), (New-Object System.Drawing.RectangleF(0, 500, $W, 40)), $fmtCenter); $f.Dispose()
$f = NewFont 20 $false
$g.DrawString($json.labels.credit, $f, (New-Object System.Drawing.SolidBrush($ink2)), (New-Object System.Drawing.RectangleF(0, 560, $W, 30)), $fmtCenter); $f.Dispose()
SaveJpeg $bmp (Join-Path $outDir 'site.jpg')
$g.Dispose(); $bmp.Dispose()

Write-Output ("rendered " + $n + " characters (simple + full) and site.jpg into " + $outDir)
