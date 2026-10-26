param(
  [Parameter(Mandatory = $true)][string]$TextBase64,
  [Parameter(Mandatory = $true)][string]$AudioPath,
  [int]$Rate = 0,
  [int]$Volume = 100
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($TextBase64))
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $synth.Rate = [Math]::Max(-10, [Math]::Min(10, $Rate))
  $synth.Volume = [Math]::Max(0, [Math]::Min(100, $Volume))
  $synth.SetOutputToWaveFile($AudioPath)
  $synth.Speak($text)
} finally {
  $synth.Dispose()
}
