# builds the same signed aarch64 APK as CI, using the SDK installed by Android Studio
$ErrorActionPreference = 'Stop'

$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
# keep in sync with the NDK version in .github/workflows/build.yml
$ndkPath = "$sdkPath\ndk\29.0.13846066"

if (-not (Test-Path $ndkPath)) {
  throw "NDK not found at $ndkPath, install it from the SDK Manager in Android Studio"
}

$env:ANDROID_HOME = $sdkPath
$env:NDK_HOME = $ndkPath

Push-Location (Join-Path $PSScriptRoot '..')
try {
  pnpm tauri android build --apk --target aarch64
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

$apkPath = Join-Path $PSScriptRoot '..\src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release.apk'
Write-Host "APK: $apkPath"

# install onto a connected phone when there is one
$adbPath = "$sdkPath\platform-tools\adb.exe"
if (-not (Test-Path $adbPath)) {
  Write-Host 'adb not found, skipping install'
  exit 0
}
$connectedDevices = & $adbPath devices | Select-String "`tdevice$"
if (-not $connectedDevices) {
  Write-Host 'no device connected, skipping install'
  exit 0
}
& $adbPath install -r $apkPath
exit $LASTEXITCODE
