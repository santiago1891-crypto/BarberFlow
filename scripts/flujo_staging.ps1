# BarberFlow — Recorrido del flujo completo sobre el staging.
# login -> turno -> completar (servicio) -> cobro -> cierre -> historial
# Uso: powershell -File scripts\flujo_staging.ps1
$ErrorActionPreference = "Stop"
$base = "http://localhost:8090/api"
$paso = 0
function Ok($m)  { Write-Host "  [OK]   $m" -ForegroundColor Green }
function Info($m){ Write-Host "  $m" -ForegroundColor Gray }
function Fail($m){ Write-Host "  [FAIL] $m" -ForegroundColor Red; exit 1 }
function Step($m){ $script:paso++; Write-Host "`nPASO $paso - $m" -ForegroundColor Cyan }

$tmpBody = Join-Path $env:TEMP "bf_body.json"

function J($method, $path, $body, $token, $form) {
    $args = @("-s", "-m", "20", "-X", $method, "$base$path", "-w", "`n%{http_code}")
    if ($token) { $args += @("-H", "Authorization: Bearer $token") }
    if ($body -ne $null) {
        # PowerShell rompe las comillas al pasar JSON como argumento a curl.exe:
        # por eso el body va en un archivo temporal.
        [System.IO.File]::WriteAllText($tmpBody, $body, [System.Text.UTF8Encoding]::new($false))
        $args += @("-H", "Content-Type: application/json", "--data-binary", "@$tmpBody")
    }
    if ($form -ne $null) {
        # OAuth2PasswordRequestForm espera x-www-form-urlencoded, no JSON.
        [System.IO.File]::WriteAllText($tmpBody, $form, [System.Text.UTF8Encoding]::new($false))
        $args += @("-H", "Content-Type: application/x-www-form-urlencoded", "--data-binary", "@$tmpBody")
    }
    $raw = & curl.exe @args
    $code = $raw[-1]
    $json = ($raw[0..($raw.Count - 2)] -join "`n")
    return @{ code = [int]$code; json = $json }
}

Step "Login (admin / barberflow-staging)"
$r = J "POST" "/auth/login" $null $null "username=admin&password=barberflow-staging"
if ($r.code -ne 200) { Fail "login HTTP $($r.code): $($r.json)" }
$token = ($r.json | ConvertFrom-Json).access_token
if (-not $token) { Fail "sin access_token: $($r.json)" }
Ok "login 200, token JWT obtenido"

Step "Listar barberos y servicios (datos del seed)"
$barberos = (J "GET" "/barberos/" $null $token)
$tipos = (J "GET" "/tipos-servicio/" $null $token)
if ($barberos.code -ne 200 -or $tipos.code -ne 200) { Fail "GET base HTTP $($barberos.code)/$($tipos.code)" }
$bs = $barberos.json | ConvertFrom-Json
$ts = $tipos.json | ConvertFrom-Json
if ($bs.Count -lt 2 -or $ts.Count -lt 4) { Fail "faltan datos del seed: $($bs.Count) barberos / $($ts.Count) servicios" }
Ok "$($bs.Count) barberos, $($ts.Count) servicios"

Step "Crear un turno nuevo (flujo de UI: Citas -> Nueva cita)"
$hora = (Get-Date).AddHours(3).ToString("yyyy-MM-ddTHH:mm:ss")
$turnoBody = @{
    barbero_id        = $bs[0].id
    tipo_servicio_id  = $ts[0].id
    fecha_hora        = $hora
    cliente_nombre    = "Cliente Flujo Test"
    cliente_telefono  = "11-9999-0000"
    notas             = "Turno creado por el recorrido automatizado"
} | ConvertTo-Json
$r = J "POST" "/turnos/" $turnoBody $token
if ($r.code -ne 201) { Fail "POST /turnos/ HTTP $($r.code): $($r.json)" }
$turno = $r.json | ConvertFrom-Json
Ok "turno 201 id=$($turno.id) estado=$($turno.estado) hora=$($turno.fecha_hora)"

Step "Transiciones: pendiente -> confirmado -> en_curso"
$e1 = J "PATCH" "/turnos/$($turno.id)" '{"estado":"confirmado"}' $token
if ($e1.code -ne 200) { Fail "confirmar HTTP $($e1.code): $($e1.json)" }
$e2 = J "PATCH" "/turnos/$($turno.id)" '{"estado":"en_curso"}' $token
if ($e2.code -ne 200) { Fail "iniciar HTTP $($e2.code): $($e2.json)" }
Ok "estado actual: $(($e2.json | ConvertFrom-Json).estado)"

Step "Completar el turno -> genera el ServicioRealizado"
$r = J "POST" "/turnos/$($turno.id)/completar" '{}' $token
if ($r.code -ne 201) { Fail "completar HTTP $($r.code): $($r.json)" }
$serv = $r.json | ConvertFrom-Json
Ok "servicio realizado 201 id=$($serv.id) precio=$($serv.precio_cobrado) comision=$($serv.comision_pct)%"

Step "Cobro: crear pago y marcarlo como pagado"
$pagoBody = @{ servicio_realizado_id = $serv.id; metodo = "efectivo"; monto = $serv.precio_cobrado } | ConvertTo-Json
$r = J "POST" "/pagos/" $pagoBody $token
if ($r.code -ne 201) { Fail "POST /pagos/ HTTP $($r.code): $($r.json)" }
$pago = $r.json | ConvertFrom-Json
Ok "pago 201 id=$($pago.id) estado=$($pago.estado) monto=$($pago.monto)"
$r = J "PATCH" "/pagos/$($pago.id)" '{"estado":"pagado"}' $token
if ($r.code -ne 200) { Fail "PATCH pago HTTP $($r.code): $($r.json)" }
Ok "pago estado final: $(($r.json | ConvertFrom-Json).estado)"

Step "Verificar regla de negocio: solapamiento rechazado"
$dupBody = @{
    barbero_id       = $bs[0].id
    tipo_servicio_id = $ts[0].id
    fecha_hora       = $hora
    cliente_nombre   = "Otro Cliente"
} | ConvertTo-Json
$r = J "POST" "/turnos/" $dupBody $token
if ($r.code -eq 409 -or $r.code -eq 400) { Ok "turno solapado rechazado con HTTP $($r.code)" }
else { Fail "se esperaba 409/400 y llegó $($r.code): $($r.json)" }

Step "Caja actual antes del cierre"
$r = J "GET" "/cierres-caja/actual" $null $token
if ($r.code -ne 200) { Fail "GET actual HTTP $($r.code): $($r.json)" }
$caja = $r.json | ConvertFrom-Json
Ok "facturado=$($caja.total_facturado) comisiones=$($caja.total_comisiones_pagadas) ganancia=$($caja.ganancia_barberia)"

Step "Cerrar la caja (modelo: cerrar -> historial -> caja nueva en $0)"
$r = J "POST" "/cierres-caja/" '{}' $token
if ($r.code -ne 201) { Fail "POST cierre HTTP $($r.code): $($r.json)" }
$cierre = $r.json | ConvertFrom-Json
Ok "cierre 201 id=$($cierre.id) facturado=$($cierre.total_facturado) ganancia=$($cierre.ganancia_barberia)"

Step "Historial: el cierre quedó guardado"
$r = J "GET" "/cierres-caja/" $null $token
if ($r.code -ne 200) { Fail "GET historial HTTP $($r.code)" }
$hist = $r.json | ConvertFrom-Json
if ($hist.Count -lt 1) { Fail "historial vacío" }
Ok "historial con $($hist.Count) cierre(s); el más reciente id=$($hist[0].id)"

Step "Caja nueva en cero despues del cierre"
$r = J "GET" "/cierres-caja/actual" $null $token
if ($r.code -ne 200) { Fail "GET actual post-cierre HTTP $($r.code)" }
$nueva = $r.json | ConvertFrom-Json
if ([double]$nueva.total_facturado -ne 0) { Fail "la caja nueva no arranca en cero: $($nueva.total_facturado)" }
Ok "caja nueva facturado=$($nueva.total_facturado) (lista para un nuevo dia)"

Step "Deshacer el cierre de prueba (DELETE /cierres-caja/ultimo-hoy)"
$r = J "DELETE" "/cierres-caja/ultimo-hoy" $null $token
if ($r.code -ne 204) { Fail "DELETE ultimo-hoy HTTP $($r.code): $($r.json)" }
Ok "cierre deshecho 204"
$r = J "GET" "/cierres-caja/actual" $null $token
$rest = $r.json | ConvertFrom-Json
Ok "la caja volvio a tener sus ventas: facturado=$($rest.total_facturado)"

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "FLUJO COMPLETO OK - $paso pasos" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
