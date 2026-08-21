param(
    [Parameter(Mandatory = $true)]
    [string]$PbipRoot
)

$ErrorActionPreference = 'Stop'

function Get-UnquotedName {
    param([string]$Value)
    $name = $Value.Trim()
    if ($name.StartsWith("'") -and $name.EndsWith("'")) {
        return $name.Substring(1, $name.Length - 2).Replace("''", "'")
    }
    return $name
}

function Get-SourceKind {
    param([string]$Text)
    if ($Text -match 'Oracle\.Database') { return 'Oracle' }
    if ($Text -match 'Sql\.Database') { return 'SQL Server' }
    if ($Text -match 'Excel\.Workbook') { return 'Excel' }
    if ($Text -match 'Table\.FromRows') { return 'Embedded' }
    if ($Text -match '(?m)^\s*(Source|Fonte)\s*=') { return 'Referenced query' }
    return 'Calculated/other'
}

$reportRoot = Join-Path $PbipRoot 'MIFC.Report\MIFC.Report'
$modelRoot = Join-Path $PbipRoot 'MIFC.SemanticModel\MIFC.SemanticModel'
$tablesRoot = Join-Path $modelRoot 'definition\tables'
$pagesRoot = Join-Path $reportRoot 'definition\pages'

if (-not (Test-Path -LiteralPath $reportRoot)) {
    throw "Report root not found: $reportRoot"
}
if (-not (Test-Path -LiteralPath $modelRoot)) {
    throw "Semantic model root not found: $modelRoot"
}

$tables = @()
$measureRecords = @()

foreach ($file in Get-ChildItem -LiteralPath $tablesRoot -Filter '*.tmdl' | Sort-Object Name) {
    $text = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
    $lines = $text -split "`r?`n"
    $tableMatch = [regex]::Match($text, '(?m)^table\s+(.+?)\s*$')
    if (-not $tableMatch.Success) { continue }
    $tableName = Get-UnquotedName $tableMatch.Groups[1].Value

    $columns = @()
    $currentColumn = $null
    foreach ($line in $lines) {
        $columnMatch = [regex]::Match($line, '^\s*column\s+(.+?)(?:\s*=.*)?$')
        if ($columnMatch.Success) {
            if ($null -ne $currentColumn) { $columns += [pscustomobject]$currentColumn }
            $currentColumn = [ordered]@{
                name = Get-UnquotedName $columnMatch.Groups[1].Value
                dataType = $null
                sourceColumn = $null
                calculated = $line -match '='
            }
            continue
        }
        if ($null -ne $currentColumn) {
            $dataTypeMatch = [regex]::Match($line, '^\s*dataType:\s*(.+?)\s*$')
            if ($dataTypeMatch.Success) {
                $currentColumn.dataType = $dataTypeMatch.Groups[1].Value.Trim()
            }
            $sourceColumnMatch = [regex]::Match($line, '^\s*sourceColumn:\s*(.+?)\s*$')
            if ($sourceColumnMatch.Success) {
                $currentColumn.sourceColumn = Get-UnquotedName $sourceColumnMatch.Groups[1].Value
            }
            if ($line -match '^\s*(measure|hierarchy|partition|annotation)\s+') {
                $columns += [pscustomobject]$currentColumn
                $currentColumn = $null
            }
        }
    }
    if ($null -ne $currentColumn) { $columns += [pscustomobject]$currentColumn }

    $measureMatches = [regex]::Matches($text, '(?m)^\s*measure\s+(.+?)\s*=')
    foreach ($match in $measureMatches) {
        $measureRecords += [pscustomobject]@{
            table = $tableName
            name = Get-UnquotedName $match.Groups[1].Value
        }
    }

    $tables += [pscustomobject]@{
        name = $tableName
        file = $file.Name
        sourceKind = Get-SourceKind $text
        columnCount = $columns.Count
        measureCount = $measureMatches.Count
        columns = $columns
    }
}

$expressionInventory = @()
$expressionsFile = Join-Path $modelRoot 'definition\expressions.tmdl'
if (Test-Path -LiteralPath $expressionsFile) {
    $expressionText = Get-Content -LiteralPath $expressionsFile -Raw -Encoding UTF8
    $expressionStarts = [regex]::Matches($expressionText, '(?m)^expression\s+(.+?)\s*=')
    for ($index = 0; $index -lt $expressionStarts.Count; $index++) {
        $start = $expressionStarts[$index].Index
        $end = if ($index + 1 -lt $expressionStarts.Count) { $expressionStarts[$index + 1].Index } else { $expressionText.Length }
        $block = $expressionText.Substring($start, $end - $start)
        $paths = [regex]::Matches($block, '(?:[A-Za-z]:|\\\\)[^\r\n"''\]]+\.(?:xlsx|xls|csv)', 'IgnoreCase') | ForEach-Object { $_.Value.Trim() } | Select-Object -Unique
        $expressionInventory += [pscustomobject]@{
            name = Get-UnquotedName $expressionStarts[$index].Groups[1].Value
            sourceKind = Get-SourceKind $block
            paths = @($paths)
            hasNativeQuery = $block -match 'Value\.NativeQuery|Query\s*='
        }
    }
}

$pages = @()
$layoutDetails = $null
foreach ($pageFile in Get-ChildItem -LiteralPath $pagesRoot -Filter 'page.json' -Recurse | Sort-Object FullName) {
    $pageDirectory = Split-Path -Parent $pageFile.FullName
    $page = Get-Content -LiteralPath $pageFile.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    $visualFiles = @(Get-ChildItem -LiteralPath (Join-Path $pageDirectory 'visuals') -Filter 'visual.json' -Recurse -ErrorAction SilentlyContinue)
    $pageRecord = [pscustomobject]@{
        name = $page.name
        displayName = $page.displayName
        width = $page.width
        height = $page.height
        displayOption = $page.displayOption
        visualCount = $visualFiles.Count
        folder = Split-Path -Leaf $pageDirectory
    }
    $pages += $pageRecord

    if ($page.displayName -eq 'Layout') {
        $visualTypes = @{}
        $entityRefs = @{}
        $nativeQueryRefs = @{}
        $filterValues = @()
        foreach ($visualFile in $visualFiles) {
            $raw = Get-Content -LiteralPath $visualFile.FullName -Raw -Encoding UTF8
            $json = $raw | ConvertFrom-Json
            $visualType = if ($null -ne $json.visual -and -not [string]::IsNullOrWhiteSpace($json.visual.visualType)) {
                $json.visual.visualType
            } elseif ($null -ne $json.visualGroup) {
                'visualGroup'
            } else {
                'unknown'
            }
            if (-not $visualTypes.ContainsKey($visualType)) { $visualTypes[$visualType] = 0 }
            $visualTypes[$visualType]++

            foreach ($match in [regex]::Matches($raw, '"Entity"\s*:\s*"([^"]+)"')) {
                $value = $match.Groups[1].Value
                if (-not $entityRefs.ContainsKey($value)) { $entityRefs[$value] = 0 }
                $entityRefs[$value]++
            }
            foreach ($match in [regex]::Matches($raw, '"nativeQueryRef"\s*:\s*"([^"]+)"')) {
                $value = $match.Groups[1].Value
                if (-not $nativeQueryRefs.ContainsKey($value)) { $nativeQueryRefs[$value] = 0 }
                $nativeQueryRefs[$value]++
            }

            foreach ($filter in @($json.filterConfig.filters)) {
                if ($null -eq $filter.field) { continue }
                $fieldKind = if ($null -ne $filter.field.Column) { 'Column' } elseif ($null -ne $filter.field.Measure) { 'Measure' } else { $null }
                if ($null -eq $fieldKind) { continue }
                $field = $filter.field.$fieldKind
                $entity = $field.Expression.SourceRef.Entity
                $property = $field.Property
                $filterText = if ($null -ne $filter.filter) { $filter.filter | ConvertTo-Json -Depth 100 -Compress } else { '' }
                $values = [regex]::Matches($filterText, '"Value":"([^"]+)"') | ForEach-Object { $_.Groups[1].Value.Trim("'") } | Select-Object -Unique
                foreach ($value in $values) {
                    $filterValues += [pscustomobject]@{
                        entity = $entity
                        property = $property
                        value = $value
                    }
                }
            }
        }
        $layoutDetails = [pscustomobject]@{
            visualTypes = @($visualTypes.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object { [pscustomobject]@{ type = $_.Key; count = $_.Value } })
            entityReferences = @($entityRefs.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object { [pscustomobject]@{ entity = $_.Key; count = $_.Value } })
            topNativeQueryReferences = @($nativeQueryRefs.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 100 | ForEach-Object { [pscustomobject]@{ reference = $_.Key; count = $_.Value } })
            filterValues = @($filterValues | Sort-Object entity, property, value -Unique)
        }
    }
}

$relationships = @()
$relationshipsFile = Join-Path $modelRoot 'definition\relationships.tmdl'
if (Test-Path -LiteralPath $relationshipsFile) {
    $relationshipText = Get-Content -LiteralPath $relationshipsFile -Raw -Encoding UTF8
    $blocks = [regex]::Split($relationshipText, '(?m)(?=^relationship\s+)') | Where-Object { $_ -match '^relationship\s+' }
    foreach ($block in $blocks) {
        $nameMatch = [regex]::Match($block, '(?m)^relationship\s+(.+?)\s*$')
        $fromMatch = [regex]::Match($block, '(?m)^\s*fromColumn:\s*(.+?)\s*$')
        $toMatch = [regex]::Match($block, '(?m)^\s*toColumn:\s*(.+?)\s*$')
        $crossMatch = [regex]::Match($block, '(?m)^\s*crossFilteringBehavior:\s*(.+?)\s*$')
        $relationships += [pscustomobject]@{
            name = if ($nameMatch.Success) { Get-UnquotedName $nameMatch.Groups[1].Value } else { $null }
            fromColumn = if ($fromMatch.Success) { $fromMatch.Groups[1].Value.Trim() } else { $null }
            toColumn = if ($toMatch.Success) { $toMatch.Groups[1].Value.Trim() } else { $null }
            crossFilteringBehavior = if ($crossMatch.Success) { $crossMatch.Groups[1].Value.Trim() } else { 'single/default' }
        }
    }
}

[pscustomobject]@{
    generatedAt = (Get-Date).ToString('o')
    pbipRoot = $PbipRoot
    summary = [pscustomobject]@{
        tableCount = $tables.Count
        measureCount = $measureRecords.Count
        expressionCount = $expressionInventory.Count
        relationshipCount = $relationships.Count
        pageCount = $pages.Count
        visualCount = ($pages | Measure-Object -Property visualCount -Sum).Sum
    }
    tables = $tables
    expressions = $expressionInventory
    pages = $pages
    layout = $layoutDetails
    relationships = $relationships
} | ConvertTo-Json -Depth 12
