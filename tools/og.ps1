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

# "Dopagaki mode" stamp, same look as drawStamp() in app.js (red box, dashed gold inner line, tilted -4 deg)
function DrawStamp([System.Drawing.Graphics]$g) {
  $boxW = 420; $boxH = 81
  $g.TranslateTransform($W - 56, 476)
  $g.RotateTransform(-4)
  $g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 0, 0, 0))), (RoundRect (-$boxW) 3 $boxW $boxH 14))
  $g.FillPath((New-Object System.Drawing.SolidBrush((Hex '#c1121f'))), (RoundRect (-$boxW) 0 $boxW $boxH 14))
  $pen = New-Object System.Drawing.Pen((Hex '#ffe08a'), 3)
  $pen.DashPattern = [single[]]@(3.3, 2.3)
  $g.DrawPath($pen, (RoundRect (-$boxW + 7) 7 ($boxW - 14) ($boxH - 14) 9)); $pen.Dispose()
  $f = NewFont 30 $true
  $g.DrawString($json.labels.stampTitle, $f, (New-Object System.Drawing.SolidBrush($white)), (New-Object System.Drawing.RectangleF(-$boxW, 11, $boxW, 36)), $fmtCenter); $f.Dispose()
  $f = NewFont 17 $true
  $g.DrawString($json.labels.stampSub, $f, (New-Object System.Drawing.SolidBrush($white)), (New-Object System.Drawing.RectangleF(-$boxW, 47, $boxW, 24)), $fmtCenter); $f.Dispose()
  $g.ResetTransform()
}

$n = 0
foreach ($c in $json.chars) {
  $pair = NewCanvas $W 630; $bmp = $pair[0]; $g = $pair[1]
  DrawCard $g $c 630 $false
  SaveJpeg $bmp (Join-Path $outDir ($c.id + '.jpg'))
  $g.Dispose(); $bmp.Dispose()

  # dopagaki-mode card: the simple card plus the stamp (used as the OGP image of s/<id>-q.html)
  $pair = NewCanvas $W 630; $bmp = $pair[0]; $g = $pair[1]
  DrawCard $g $c 630 $false
  DrawStamp $g
  SaveJpeg $bmp (Join-Path $outDir ($c.id + '-q.jpg'))
  $g.Dispose(); $bmp.Dispose()

  $pair = NewCanvas $W 900; $bmp = $pair[0]; $g = $pair[1]
  DrawCard $g $c 900 $true
  SaveJpeg $bmp (Join-Path $outDir ($c.id + '-full.jpg'))
  $g.Dispose(); $bmp.Dispose()
  $n++
}

# site image: spell-card style frame, big title, tilted portrait row
$pair = NewCanvas $W 630; $bmp = $pair[0]; $g = $pair[1]
$accent = Hex '#cf2f6b'; $line = Hex '#e4d9c6'; $paper = Hex '#f3ebe0'
$g.Clear($paper)
# faint dot pattern on the paper
$dot = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(22, 42, 48, 80))
for ($yy = 14; $yy -lt 630; $yy += 28) { for ($xx = 14; $xx -lt $W; $xx += 28) { $g.FillEllipse($dot, $xx, $yy, 3, 3) } }
# card with shadow and a left accent band
$shadow = RoundRect 36 44 1128 558 28
$g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 42, 48, 80))), $shadow)
$card = RoundRect 36 36 1128 558 28
$g.FillPath((New-Object System.Drawing.SolidBrush($white)), $card)
$g.SetClip($card)
$g.FillRectangle((New-Object System.Drawing.SolidBrush($accent)), 36, 36, 18, 558)
# outlined watermark in the top-right corner
$wm = New-Object System.Drawing.Drawing2D.GraphicsPath
$wm.AddString('137', (New-Object System.Drawing.FontFamily($fontName)), [int][System.Drawing.FontStyle]::Bold, 190, (New-Object System.Drawing.PointF(790, 56)), $fmtLeft)
$g.DrawPath((New-Object System.Drawing.Pen((Hex '#f4d6e2'), 3)), $wm)
$g.ResetClip()
$g.DrawPath((New-Object System.Drawing.Pen($line, 2)), $card)
# eyebrow: pill badge + meta
$f = NewFont 22 $true
$m = $g.MeasureString($json.labels.siteEyebrow, $f)
$pill = RoundRect 92 70 ($m.Width + 36) 40 20
$g.FillPath((New-Object System.Drawing.SolidBrush($accent)), $pill)
$g.DrawString($json.labels.siteEyebrow, $f, (New-Object System.Drawing.SolidBrush($white)), (New-Object System.Drawing.RectangleF(92, 70, ($m.Width + 36), 40)), $fmtCenter); $f.Dispose()
$f = NewFont 24 $false
$g.DrawString($json.labels.siteMeta, $f, (New-Object System.Drawing.SolidBrush($ink2)), (New-Object System.Drawing.RectangleF((92 + $m.Width + 52), 70, 600, 40)), $fmtLeft); $f.Dispose()
# title and subtitle
$f = NewFont 92 $true
$g.DrawString($json.labels.siteTitle, $f, (New-Object System.Drawing.SolidBrush($ink)), (New-Object System.Drawing.RectangleF(84, 112, 1000, 120)), $fmtLeft); $f.Dispose()
$f = NewFont 34 $true
$g.DrawString($json.labels.siteSub, $f, (New-Object System.Drawing.SolidBrush($accent)), (New-Object System.Drawing.RectangleF(92, 232, 1000, 50)), $fmtLeft); $f.Dispose()
# tilted portrait row
$ids = @('reimu', 'marisa', 'sakuya', 'youmu', 'sanae', 'koishi', 'nue', 'flandre')
$tilts = @(-6, 4, -3, 5, -5, 3, -4, 6)
$pw = 124; $ph = 156; $step = 130
$startX = [int](($W - (($ids.Count - 1) * $step + $pw)) / 2) + 8
for ($i = 0; $i -lt $ids.Count; $i++) {
  $cx = $startX + $i * $step + $pw / 2
  $cy = 380 + (($i % 2) * 14)
  $g.TranslateTransform($cx, $cy)
  $g.RotateTransform($tilts[$i])
  $cardP = RoundRect (-$pw / 2) (-$ph / 2) $pw $ph 16
  $g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(36, 42, 48, 80))), (RoundRect (-$pw / 2) (-$ph / 2 + 5) $pw $ph 16))
  $g.FillPath((New-Object System.Drawing.SolidBrush($white)), $cardP)
  $g.DrawPath((New-Object System.Drawing.Pen($line, 2)), $cardP)
  $img = [System.Drawing.Image]::FromFile((Join-Path $Root ('tools/art-src/' + $ids[$i] + '.png')))
  $g.DrawImage($img, (-$pw / 2 + 4), (-$ph / 2 + 4), ($pw - 8), ($ph - 8))
  $img.Dispose()
  $g.ResetTransform()
}
# footer: url left, credits right
$f = NewFont 22 $false
$g.DrawString($siteLabel, $f, (New-Object System.Drawing.SolidBrush($ink2)), (New-Object System.Drawing.RectangleF(92, 534, 700, 30)), $fmtLeft); $f.Dispose()
$fmtRight = New-Object System.Drawing.StringFormat
$fmtRight.Alignment = [System.Drawing.StringAlignment]::Far
$f = NewFont 20 $false
$g.DrawString($json.labels.credit, $f, (New-Object System.Drawing.SolidBrush($ink2)), (New-Object System.Drawing.RectangleF(600, 520, 508, 28)), $fmtRight)
$g.DrawString($json.labels.credit2, $f, (New-Object System.Drawing.SolidBrush($ink2)), (New-Object System.Drawing.RectangleF(600, 548, 508, 28)), $fmtRight); $f.Dispose()
SaveJpeg $bmp (Join-Path $outDir 'site.jpg')
$g.Dispose(); $bmp.Dispose()

Write-Output ("rendered " + $n + " characters (simple + dopagaki + full) and site.jpg into " + $outDir)
