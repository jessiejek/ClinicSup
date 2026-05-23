$base = 'd:/PROJECT AI/clinic1/src/app'
Get-ChildItem -Path "$base/portals" -Recurse -Filter *.html | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $relative = $_.FullName.Substring($base.Length + 1)
    if ($relative -like 'portals/admin/*') { $portal = 'admin' }
    elseif ($relative -like 'portals/staff/*') { $portal = 'staff' }
    elseif ($relative -like 'portals/doctor/*') { $portal = 'doctor' }
    else { $portal = 'patient' }

    $newContent = $content -replace '<app-status-badge([^>]*?)\s*\[status\]=([^>]+?)>', {
        param($m)
        $preAttrs = $m.Groups[1].Value.TrimEnd()
        $statusExpr = $m.Groups[2].Value.Trim()
        $portalAttr = " portal='$portal'"
        $paymentAttr = ''
        if ($statusExpr -match '\\.paymentStatus') {
            $paymentAttr = " [paymentStatus]='$statusExpr'"
            $statusExpr = $statusExpr -replace '\\.paymentStatus',''
        }
        "<app-status-badge $preAttrs$portalAttr [status]=\"$statusExpr\"$paymentAttr>"
    }
    if ($newContent -ne $content) {
        Set-Content -Path $_.FullName -Value $newContent -Force
    }
}
