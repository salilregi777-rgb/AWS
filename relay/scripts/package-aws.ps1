$ErrorActionPreference = 'Stop'
$projectPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$buildPath = Join-Path $projectPath 'dist-aws'
$artifactPath = Join-Path $projectPath 'artifacts'
$zipPath = Join-Path $artifactPath 'relay-amplify.zip'

foreach ($required in @('index.html', 'favicon.svg', 'relay-city-night.webp', 'cedar/cedar_wasm_bg.wasm')) {
    if (-not (Test-Path -LiteralPath (Join-Path $buildPath $required) -PathType Leaf)) {
        throw "Missing release file: $required. Run npm run build:aws first."
    }
}
New-Item -ItemType Directory -Path $artifactPath -Force | Out-Null
# Some npm WASM assets preserve a Unix-epoch mtime; ZIP supports 1980 onward.
# Normalize only generated build files, never source files.
Get-ChildItem -LiteralPath $buildPath -Recurse -File | ForEach-Object {
    if ($_.LastWriteTimeUtc.Year -lt 1980 -or $_.LastWriteTimeUtc.Year -gt 2107) {
        $_.LastWriteTimeUtc = [datetime]'2000-01-01T00:00:00Z'
    }
}
# Zip the contents, not the directory: Amplify expects index.html at the root.
Compress-Archive -Path (Join-Path $buildPath '*') -DestinationPath $zipPath -Force
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    if (-not ($archive.Entries | Where-Object { $_.FullName -eq 'index.html' })) {
        throw 'Invalid deployment archive: index.html is not at the archive root.'
    }
    Write-Output "Packaged $($archive.Entries.Count) files for AWS Amplify."
} finally { $archive.Dispose() }
Get-Item -LiteralPath $zipPath | Select-Object FullName, Length
$digest = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash
Write-Output "SHA256: $digest"
