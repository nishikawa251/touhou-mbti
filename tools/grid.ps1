# Detect each cell frame (colored rounded rect) in the chart image -> tools/grid.json
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$bmp = New-Object System.Drawing.Bitmap (Join-Path $root 'img\chart.jpg')
$W = $bmp.Width; $H = $bmp.Height

function IsWhite($x, $y) {
  $c = $bmp.GetPixel($x, $y)
  return ($c.R -gt 225 -and $c.G -gt 225 -and $c.B -gt 225)
}
# returns flat list: x0,x1,x0,x1,... of non-white runs with 150 <= length < 200
function HRuns($y) {
  $out = New-Object System.Collections.ArrayList
  $start = -1
  for ($x = 0; $x -lt $W; $x++) {
    $isw = IsWhite $x $y
    if (-not $isw -and $start -lt 0) { $start = $x }
    if ($isw -and $start -ge 0) {
      $len = $x - $start
      if ($len -ge 150 -and $len -lt 200) { [void]$out.Add($start); [void]$out.Add($x - 1) }
      $start = -1
    }
  }
  return , $out
}

$cells = New-Object System.Collections.ArrayList
for ($r = 0; $r -lt 13; $r++) {
  $yApprox = [int](221 + 198.6 * $r)
  $best = $null; $bestY = 0
  for ($dy = 150; $dy -le 195; $dy += 2) {
    $runs = HRuns ($yApprox + $dy)
    if ($best -eq $null -or $runs.Count -gt $best.Count) { $best = $runs; $bestY = $yApprox + $dy }
  }
  $line = "row $r (scan y=$bestY):"
  for ($i = 0; $i -lt $best.Count; $i += 2) {
    $x0 = $best[$i]; $x1 = $best[$i + 1]
    $xs = $x0 + 24
    $yBot = $bestY; while ($yBot -lt $H - 1 -and -not (IsWhite $xs ($yBot + 1))) { $yBot++ }
    $col = [int][math]::Round(($x0 - 28) / 178.8)
    [void]$cells.Add([pscustomobject]@{ row = $r; col = $col; x0 = $x0; x1 = $x1; y1 = $yBot })
    $line += " c$col[$x0-$x1,b$yBot]"
  }
  $line
}
$cells | ConvertTo-Json | Out-File -Encoding ascii (Join-Path $root 'tools\grid.json')
$bmp.Dispose()
