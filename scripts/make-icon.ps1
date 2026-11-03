# Generate the original terminal mark for Windows packaging. No external assets.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$bitmap = [System.Drawing.Bitmap]::new(256, 256)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$background = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#087c71'))
$pen = [System.Drawing.Pen]::new([System.Drawing.Color]::White, 16)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$path = [System.Drawing.Drawing2D.GraphicsPath]::new()
try {
    $path.AddArc(8, 8, 60, 60, 180, 90)
    $path.AddArc(188, 8, 60, 60, 270, 90)
    $path.AddArc(188, 188, 60, 60, 0, 90)
    $path.AddArc(8, 188, 60, 60, 90, 90)
    $path.CloseFigure()
    $graphics.FillPath($background, $path)
    $graphics.DrawLine($pen, 68, 87, 103, 119)
    $graphics.DrawLine($pen, 103, 119, 68, 151)
    $graphics.DrawLine($pen, 128, 151, 185, 151)
    $png = [System.IO.MemoryStream]::new()
    $bitmap.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $png.ToArray()
    $destination = Join-Path (Split-Path -Parent $PSScriptRoot) 'build\windows\icon.ico'
    $stream = [System.IO.File]::Create($destination)
    $writer = [System.IO.BinaryWriter]::new($stream)
    try {
        $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]1)
        $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0)
        $writer.Write([uint16]1); $writer.Write([uint16]32)
        $writer.Write([uint32]$bytes.Length); $writer.Write([uint32]22); $writer.Write($bytes)
    } finally { $writer.Dispose(); $stream.Dispose(); $png.Dispose() }
} finally { $path.Dispose(); $pen.Dispose(); $background.Dispose(); $graphics.Dispose(); $bitmap.Dispose() }
