param(
    [string] $JavaPath = '',
    [string] $PlantUmlPath = ''
)
$ErrorActionPreference = 'Stop'
$diagramDirectory = Split-Path -Parent $PSScriptRoot
$workspaceDirectory = Split-Path -Parent (Split-Path -Parent $diagramDirectory)
$rendererDirectory = Join-Path $workspaceDirectory '.ui-audit\uml-renderer'
if (-not $PlantUmlPath) {
    $PlantUmlPath = Join-Path $rendererDirectory 'plantuml-1.2025.7.jar'
}
if (-not $JavaPath) {
    $javaCandidates = @(Get-ChildItem -LiteralPath (Join-Path $rendererDirectory 'runtime') -Directory -ErrorAction SilentlyContinue | ForEach-Object { Join-Path $_.FullName 'bin\java.exe' } | Where-Object { Test-Path -LiteralPath $_ })
    if ($javaCandidates.Count -gt 0) { $JavaPath = $javaCandidates[0] }
    else { $JavaPath = (Get-Command java -ErrorAction Stop).Source }
}
if (-not (Test-Path -LiteralPath $JavaPath)) { throw 'Java executable not found. Supply -JavaPath.' }
if (-not (Test-Path -LiteralPath $PlantUmlPath)) { throw 'PlantUML jar not found. Supply -PlantUmlPath.' }
$diagramSources = @(Get-ChildItem -LiteralPath $diagramDirectory -Filter '*.puml' -File | ForEach-Object { $_.FullName })
& $JavaPath '-Djava.awt.headless=true' '-DPLANTUML_LIMIT_SIZE=14000' '-jar' $PlantUmlPath '-checkonly' '-charset' 'UTF-8' @diagramSources
if ($LASTEXITCODE -ne 0) { throw 'PlantUML syntax validation failed.' }
& $JavaPath '-Djava.awt.headless=true' '-DPLANTUML_LIMIT_SIZE=14000' '-jar' $PlantUmlPath '-tsvg' '-charset' 'UTF-8' @diagramSources
if ($LASTEXITCODE -ne 0) { throw 'SVG rendering failed.' }
& $JavaPath '-Djava.awt.headless=true' '-DPLANTUML_LIMIT_SIZE=14000' '-jar' $PlantUmlPath '-tpng' '-charset' 'UTF-8' @diagramSources
if ($LASTEXITCODE -ne 0) { throw 'PNG rendering failed.' }
if (Get-Command node -ErrorAction SilentlyContinue) {
    & node (Join-Path $PSScriptRoot 'verify-exports.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Export verification failed.' }
}
Get-ChildItem -LiteralPath $diagramDirectory -File | Where-Object { $_.Extension -in '.svg','.png' } | Select-Object Name,Length
