Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem") | Out-Null

$ufs = @("AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO")
$majoritariasDir = "C:/Users/lixov/OneDrive/Documentos/Observatorio/resultados_geo/Majoritarias 2022"
$output = @{}

$mapping = @{
    "12" = "PDT"
    "13" = "FE BRASIL"
    "14" = "PTB"
    "15" = "MDB"
    "16" = "PSTU"
    "21" = "PCB"
    "22" = "PL"
    "27" = "DC"
    "30" = "NOVO"
    "44" = "UNIÃO"
    "80" = "UP"
}

# Create a temporary extraction directory
$tempDir = Join-Path $PSScriptRoot "temp_extract"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir | Out-Null

foreach ($uf in $ufs) {
    $zipPath = Join-Path $majoritariasDir "presidente_2022_t1_$($uf).zip"
    $resumoName = "presidente_2022_t1_$($uf)_resumo.json"
    
    # Extract only the resumo file
    $zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
    $entry = $zip.Entries | Where-Object { $_.Name -eq $resumoName }
    if ($entry) {
        $targetPath = Join-Path $tempDir $resumoName
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $targetPath, $true)
        
        $json = Get-Content -Raw -Path $targetPath | ConvertFrom-Json
        $totals = $json.TOTALS
        
        $coalitions = @()
        $validVotes = 0
        
        foreach ($candNum in $totals.psobject.Properties.Name) {
            # Skip blank/null votes
            if ($candNum -eq "95" -or $candNum -eq "96") { continue }
            
            $votes = $totals.$candNum
            $party = $mapping[$candNum]
            if (-not $party) { $party = "OUTROS" }
            
            $validVotes += $votes
            $coalitions += @{
                "id" = $party
                "raw_comp" = $party
                "votes" = $votes
            }
        }
        
        $output[$uf] = @{
            "f" = @{
                "stats" = @{
                    "qt_votos_validos" = $validVotes
                }
                "coalitions" = $coalitions
            }
        }
    }
    $zip.Dispose()
}

Remove-Item -Recurse -Force $tempDir

# Convert output to JSON and write to file
$jsonOut = $output | ConvertTo-Json -Depth 5
$jsonOut | Out-File -FilePath "C:/Users/lixov/OneDrive/Documentos/Simulador Parlamentar Brasil/resultados_geo/official_totals_2022_presidente.json" -Encoding utf8
Write-Output "Presidential totals generated successfully!"
