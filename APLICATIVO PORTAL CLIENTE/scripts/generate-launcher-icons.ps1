# Gera ícones launcher com margem (safe zone Android ~18%)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$logoPath = Join-Path $root "app\src\main\res\drawable\logo_oficina_beto.png"
$bgColor = [System.Drawing.Color]::FromArgb(255, 12, 25, 56) # #0C1938

$sizes = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

$logo = [System.Drawing.Image]::FromFile($logoPath)

foreach ($entry in $sizes.GetEnumerator()) {
    $folder = Join-Path $root "app\src\main\res\$($entry.Key)"
    $size = [int]$entry.Value
    $padding = [int][Math]::Round($size * 0.18)

    foreach ($name in @("ic_launcher.png", "ic_launcher_round.png")) {
        $bmp = New-Object System.Drawing.Bitmap $size, $size
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.Clear($bgColor)

        $inner = $size - (2 * $padding)
        $g.DrawImage($logo, $padding, $padding, $inner, $inner)
        $g.Dispose()

        $out = Join-Path $folder $name
        $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        Write-Host "Wrote $out"
    }
}

$logo.Dispose()
Write-Host "Done."
