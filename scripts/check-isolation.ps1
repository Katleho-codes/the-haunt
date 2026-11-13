# Checks that the API container is hidden: reachable only from the web container, inside Docker.
# Run while the stack is up:  docker compose --profile backend up -d --build
# Usage: pwsh scripts/check-isolation.ps1   (Windows PowerShell also works)
$ProgressPreference = 'SilentlyContinue'
$web = 'the-haunt'
$api = 'the-haunt-api'
$failures = 0

function Check([string]$name, [bool]$ok, [string]$detail) {
  if ($ok) { Write-Output "PASS $name" } else { Write-Output "FAIL $name  ($detail)"; $script:failures++ }
}
function Http([string]$url) {
  try { (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop).StatusCode }
  catch { if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'unreachable' } }
}
# Commands avoid embedded double quotes: Windows PowerShell 5.1 strips them from native command arguments.
function InContainer([string]$name, [string]$cmd) { (docker exec $name sh -c $cmd 2>&1 | Out-String).Trim() }

$publishedApi = docker inspect $api --format '{{json .NetworkSettings.Ports}}'
Check 'api publishes no host port' ($publishedApi -notmatch 'HostPort') $publishedApi
Check 'api is only on the internal network' ((docker inspect $api --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}').Trim() -eq 'the-haunt_backend') 'networks differ'
Check 'backend network is marked internal' ((docker network inspect the-haunt_backend --format '{{.Internal}}') -eq 'true') 'not internal'

Check 'host cannot reach api on localhost:4000' ((Http 'http://127.0.0.1:4000/health') -eq 'unreachable') 'reachable from host'
$ip = (docker inspect $api --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}').Trim()
Check 'host cannot reach the api container IP directly' ((Http "http://${ip}:4000/health") -eq 'unreachable') "reachable at $ip"
Check 'public web port has no route to the api' ((Http 'http://127.0.0.1:3200/api/health') -eq 404) 'unexpected response'

Check 'web container can reach api /health' ((InContainer $web 'wget -q -O - http://api:4000/health') -match '"status":"ok"') 'no health reply'
Check 'api rejects the web container without the token' ((InContainer $web 'wget -O - http://api:4000/anything 2>&1 | tail -3') -match '401') 'not 401'
Check 'api accepts the web container with the token' ((InContainer $web 'wget -O - --header ''Authorization: Bearer ''$API_TOKEN http://api:4000/anything 2>&1 | tail -3') -match '404') 'not authorised'
Check 'api has no route to the internet' ((InContainer $api 'wget -T 4 -O /dev/null http://1.1.1.1 >/dev/null 2>&1 && echo reached || echo blocked') -eq 'blocked') 'internet reachable'
Check 'api cannot reach the docker host' ((InContainer $api 'wget -T 4 -O /dev/null http://host.docker.internal >/dev/null 2>&1 && echo reached || echo blocked') -eq 'blocked') 'host reachable'

$token = InContainer $web 'echo -n $API_TOKEN'
$page = (Invoke-WebRequest -Uri 'http://127.0.0.1:3200/' -UseBasicParsing).Content
Check 'api token is long enough to be a real secret' ($token.Length -ge 32) "length $($token.Length)"
Check 'api token is not in the page served to browsers' (-not $page.Contains($token)) 'token found in HTML'
$bundles = docker exec $web sh -c 'grep -rl "$API_TOKEN" /app/.next/static 2>/dev/null | head -1'
Check 'api token is not in any static browser bundle' ([string]::IsNullOrWhiteSpace(($bundles | Out-String))) 'token found in a bundle'

Check 'web runs as a non-root user' ((InContainer $web 'id -u') -ne '0') 'root'
Check 'api runs as a non-root user' ((InContainer $api 'id -u') -ne '0') 'root'

if ($failures -gt 0) { Write-Output "$failures check(s) failed."; exit 1 } else { Write-Output 'All isolation checks passed.' }
