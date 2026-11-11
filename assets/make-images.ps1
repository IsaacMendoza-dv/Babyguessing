# Regenera public/banner.jpg y public/og-banner.jpg a partir de assets/daddys.jpeg.
# Uso (desde la raiz del repo): powershell -NoProfile -ExecutionPolicy Bypass -File assets\make-images.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$pub = Join-Path $root "public"

function Save-Jpeg($bmp, $path, $quality) {
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$quality)
  $bmp.Save($path, $codec, $params)
}

function Render($src, $srcRect, $w, $h) {
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $dest = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
  $g.DrawImage($src, $dest, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  return $bmp
}

$src = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot "daddys.jpeg"))

# Banner de la pagina: 1200x800
$banner = Render $src (New-Object System.Drawing.Rectangle(0, 0, 1536, 1024)) 1200 800
Save-Jpeg $banner (Join-Path $pub "banner.jpg") 82
$banner.Dispose()

# Vista previa de WhatsApp: 1200x630, recorte que conserva las caras y el texto "Bearly wait"
$og = Render $src (New-Object System.Drawing.Rectangle(0, 150, 1536, 804)) 1200 630
Save-Jpeg $og (Join-Path $pub "og-banner.jpg") 85
$og.Dispose()

$src.Dispose()
