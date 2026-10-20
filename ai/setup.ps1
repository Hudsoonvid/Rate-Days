# RateDays — set up this Windows PC as the AI that writes your recaps.
#
# What it does:
#   1. Installs Ollama (the local AI server) if it's missing.
#   2. Lets the RateDays website talk to it from your phone's browser.
#   3. Downloads an AI model that runs well on a gaming laptop's GPU.
#   4. If Tailscale is installed, gives the server an https address your iPhone can reach.
#
# Run it in PowerShell:
#   irm https://raw.githubusercontent.com/Hudsoonvid/Rate-Days/main/ai/setup.ps1 | iex
# Optional overrides (set before running):
#   $env:RATEDAYS_MODEL = "llama3.1:8b"                 # any model from https://ollama.com/library
#   $env:RATEDAYS_SITE  = "https://hudsoonvid.github.io" # where your RateDays site is hosted
#
# Safe to run again; it just re-applies the settings.

& {
  $ErrorActionPreference = "Stop"
  $Model = if ($env:RATEDAYS_MODEL) { $env:RATEDAYS_MODEL } else { "llama3.1:8b" }
  $Site = if ($env:RATEDAYS_SITE) { $env:RATEDAYS_SITE.TrimEnd("/") } else { "https://hudsoonvid.github.io" }
  $OllamaDir = Join-Path $env:LOCALAPPDATA "Programs\Ollama"

  function Have($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
  function Step($n, $text) { Write-Host "`n[$n/5] $text" -ForegroundColor Cyan }

  Step 1 "Checking for Ollama"
  if (-not (Have "ollama")) {
    if (Test-Path (Join-Path $OllamaDir "ollama.exe")) {
      $env:Path += ";$OllamaDir"
    } elseif (Have "winget") {
      winget install --id Ollama.Ollama -e --accept-source-agreements --accept-package-agreements
      $env:Path += ";$OllamaDir"
    } else {
      Write-Host "Install Ollama from https://ollama.com/download, then run this again." -ForegroundColor Yellow
      return
    }
  }
  Write-Host "Ollama is installed."

  Step 2 "Allowing $Site to use it"
  $vars = @{
    # Which websites may call the AI from a browser.
    "OLLAMA_ORIGINS"        = $Site
    # Listen beyond localhost so Tailscale can forward to it. Windows may ask to allow it through the firewall.
    "OLLAMA_HOST"           = "0.0.0.0:11434"
    # Room for a whole season of episodes in one prompt.
    "OLLAMA_CONTEXT_LENGTH" = "16384"
  }
  foreach ($name in $vars.Keys) {
    [Environment]::SetEnvironmentVariable($name, $vars[$name], "User")
    Set-Item "env:$name" $vars[$name]
    Write-Host "  $name = $($vars[$name])"
  }

  Step 3 "Restarting Ollama with the new settings"
  Get-Process -Name "ollama app", "ollama" -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Seconds 2
  $tray = Join-Path $OllamaDir "ollama app.exe"
  if (Test-Path $tray) { Start-Process $tray } else { Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden }
  $up = $false
  for ($i = 0; $i -lt 30 -and -not $up; $i++) {
    try { Invoke-RestMethod "http://127.0.0.1:11434/api/version" | Out-Null; $up = $true } catch { Start-Sleep -Seconds 1 }
  }
  if (-not $up) {
    Write-Host "Ollama didn't start. Open it from the Start menu, then run this again." -ForegroundColor Yellow
    return
  }
  Write-Host "Ollama is running."

  Step 4 "Downloading the AI model (about 5 GB, first time only)"
  ollama pull $Model

  Step 5 "Giving it an https address your phone can reach"
  $tailscale = if (Have "tailscale") { "tailscale" } elseif (Test-Path "$env:ProgramFiles\Tailscale\tailscale.exe") { "$env:ProgramFiles\Tailscale\tailscale.exe" } else { $null }
  $address = $null
  if ($tailscale) {
    & $tailscale serve --bg 11434
    $dns = (& $tailscale status --json | ConvertFrom-Json).Self.DNSName.TrimEnd(".")
    if ($dns) { $address = "https://$dns" }
  }

  Write-Host ""
  if ($address) {
    Set-Clipboard -Value $address
    Write-Host "Done! Your AI address: $address  (copied to the clipboard)" -ForegroundColor Green
    Write-Host "Make sure Tailscale is installed and signed in on your phone too."
  } else {
    Write-Host "The AI is ready, but your phone needs an https address to reach it." -ForegroundColor Yellow
    Write-Host "Install Tailscale on this PC and your phone (https://tailscale.com/download), sign in on both, then run this again."
    Write-Host "(On this PC itself you can already use http://localhost:11434.)"
  }
  Write-Host "On your phone: RateDays > Settings > Connect to AI > paste the address > Connect."
}
