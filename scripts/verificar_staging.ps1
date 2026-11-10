# Verificación final del staging: SPA, assets, headers y turno restaurado.
$out = Join-Path $env:TEMP "bf_o.txt"
$base = "http://localhost:8090"

# Login
$loginBody = Join-Path $env:TEMP "bf_login.txt"
[System.IO.File]::WriteAllText($loginBody, "username=admin&password=barberflow-staging", [System.Text.UTF8Encoding]::new($false))
curl.exe -s -m 15 -X POST "$base/api/auth/login" -H "Content-Type: application/x-www-form-urlencoded" --data-binary "@$loginBody" -o $out
$tok = (Get-Content $out -Raw | ConvertFrom-Json).access_token
if (-not $tok) { Write-Host "LOGIN FALLA" -ForegroundColor Red; exit 1 }
Write-Host "login OK" -ForegroundColor Green

# Restaurar hora del turno de prueba
$f = Join-Path $env:TEMP "bf_p.json"
[System.IO.File]::WriteAllText($f, '{"fecha_hora":"2026-11-10T16:00:00"}', [System.Text.UTF8Encoding]::new($false))
$code = curl.exe -s -m 15 -o $out -w "%{http_code}" -X PATCH "$base/api/turnos/9a0f778e-f296-4643-aeef-3b2580e23028" -H "Authorization: Bearer $tok" -H "Content-Type: application/json" --data-binary "@$f"
$j = Get-Content $out -Raw | ConvertFrom-Json
Write-Host "PATCH turno -> HTTP $code | hora=$($j.fecha_hora) estado=$($j.estado)"

# Rutas SPA (fallback a index.html) y assets con hash
$idx = curl.exe -s -m 10 -o $out "$base/" ; $idx = Get-Content $out -Raw
$asset = [regex]::Match($idx, 'assets/index-[^"]+\.js').Value
Write-Host "`nRutas:"
foreach ($p in "/", "/$asset", "/assets/index-Xzn-WTer.css", "/citas", "/finanzas", "/noexiste") {
    $c = curl.exe -s -m 10 -o $out -w "%{http_code}" "$base$p"
    $len = (Get-Content $out -Raw).Length
    $tag = if ($p -like "/assets/*") { "asset" } elseif ($c -eq 200 -and $len -gt 50000) { "asset" } else { "html " }
    Write-Host ("  {0,-42} -> {1}  {2} bytes  {3}" -f $p, $c, $len, $tag)
}

# Headers de seguridad del servidor estático
Write-Host "`nHeaders de /:"
$body = Join-Path $env:TEMP "bf_body2.txt"
curl.exe -s -m 10 -D $out -o $body "$base/"
(Get-Content $out) | Select-String -Pattern "X-Content-Type-Options|X-Frame-Options|Referrer-Policy|Cache-Control" | ForEach-Object { "  $_" }

# Health final
Write-Host "`nHealth:"
$health = curl.exe -s -m 10 "$base/api/health"
Write-Host "  $health"
