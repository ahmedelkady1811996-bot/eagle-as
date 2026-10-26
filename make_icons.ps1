# EAGLE icon asset builder v2 (parse-safe)
$ErrorActionPreference="Continue"
$dir=Split-Path -Parent $MyInvocation.MyCommand.Path
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12

# ---------- 1) download CDN icons locally ----------
$cdn="https://cdn.jsdelivr.net/gh/philanri/arduino-icons@main/images/svg"
$files=@("arduino_uno.svg","led_unit.svg","resistor_unit.svg","push_button.svg","potentiometer.svg",
"servo.svg","dc_motor.svg","relay_module.svg","lcd_display.svg","digit_display.svg",
"8_8_led_matrix_display.svg","ultrasonic_distance_sensor.svg","pir_sensor.svg","temperature_sensor.svg",
"light_sensor.svg","sound_sensor.svg","moisture_sensor.svg","tilt_sensor.svg","touch_sensor.svg",
"capacitor.svg","diode.svg","transistor.svg","9v_battery.svg","mini_breadboard.svg",
"stepper_motor.svg","shift_register.svg","aa_battery_pack.svg")
$ok=0;$fail=@()
foreach($f in $files){
  $out=Join-Path $dir $f
  if(Test-Path $out){$ok++;continue}
  try{ Invoke-WebRequest -Uri ($cdn+"/"+$f) -OutFile $out -UseBasicParsing -TimeoutSec 25; $ok++ }
  catch{ $fail+=$f }
}
Write-Output ("downloaded/exists: "+$ok+" failed: "+$fail.Count+" "+($fail -join ','))

function Save-Svg([string]$name,[string]$content){
  [IO.File]::WriteAllText((Join-Path $dir $name),$content,(New-Object Text.UTF8Encoding($false)))
}
function Rep([string]$s,[string]$k,[string]$v){ return $s.Replace($k,$v) }

# ---------- module template ----------
$tpl=@'
<svg xmlns="http://www.w3.org/2000/svg" width="__W" height="__H" viewBox="0 0 __W __H">
<rect x="4" y="6" width="__W2" height="__H2" rx="6" fill="#0f3460" stroke="#0a2647" stroke-width="2"/>
<rect x="4" y="6" width="__W2" height="10" rx="5" fill="#16407a"/>
__EXTRA
<text x="__CX" y="__LB" text-anchor="middle" font-family="Arial" font-size="9" font-weight="bold" fill="#cfe8ff">__LABEL</text>
<g fill="#d4af37">
<rect x="14" y="__PY" width="8" height="6"/><rect x="34" y="__PY" width="8" height="6"/><rect x="54" y="__PY" width="8" height="6"/><rect x="74" y="__PY" width="8" height="6"/>
<rect x="94" y="__PY" width="8" height="6"/><rect x="114" y="__PY" width="8" height="6"/>
</g>
<circle cx="12" cy="12" r="2" fill="#e2e8f0"/><circle cx="__CXR" cy="__CYR" r="2" fill="#e2e8f0"/>
</svg>
'@

function ModuleSvg([string]$label,[string]$extra){
  $s=$tpl
  $s=Rep $s "__W" "140"; $s=Rep $s "__H" "92"
  $s=Rep $s "__W2" "132"; $s=Rep $s "__H2" "78"
  $s=Rep $s "__CX" "70"; $s=Rep $s "__LB" "80"
  $s=Rep $s "__PY" "84"
  $s=Rep $s "__CXR" "128"; $s=Rep $s "__CYR" "78"
  $s=Rep $s "__EXTRA" $extra
  $s=Rep $s "__LABEL" $label
  return $s
}

# VL53L0X
$x1=@'
<circle cx="52" cy="42" r="13" fill="#101820" stroke="#94a3b8" stroke-width="2"/><circle cx="52" cy="42" r="6" fill="#1e293b"/>
<circle cx="88" cy="42" r="13" fill="#101820" stroke="#94a3b8" stroke-width="2"/><circle cx="88" cy="42" r="6" fill="#1e293b"/>
'@
Save-Svg "vl53l0x.svg" (ModuleSvg "VL53L0X ToF" $x1)

# MPU9250
$x2=@'
<rect x="56" y="28" width="28" height="24" fill="#0b0f19" stroke="#64748b"/>
<text x="70" y="43" text-anchor="middle" font-size="7" fill="#93c5fd">INV</text>
<path d="M40 40 L26 40 M31 36 L26 40 L31 44" stroke="#22d3ee" stroke-width="2" fill="none"/>
<path d="M100 40 L114 40 M109 36 L114 40 L109 44" stroke="#f472b6" stroke-width="2" fill="none"/>
<path d="M70 58 L70 70 M66 65 L70 70 L74 65" stroke="#4ade80" stroke-width="2" fill="none"/>
'@
Save-Svg "mpu9250.svg" (ModuleSvg "MPU-9250" $x2)

# TCS34725
$x3=@'
<rect x="48" y="30" width="18" height="18" fill="#111827" stroke="#9ca3af"/>
<rect x="76" y="30" width="18" height="18" fill="#fff" stroke="#cbd5e1"/>
<circle cx="57" cy="39" r="4" fill="#ef4444"/><circle cx="85" cy="35" r="3" fill="#22c55e"/><circle cx="85" cy="43" r="3" fill="#3b82f6"/>
'@
Save-Svg "tcs34725.svg" (ModuleSvg "TCS34725" $x3)

# RS485 / CAN
$x4=@'
<rect x="52" y="26" width="36" height="24" fill="#0b0f19" stroke="#64748b"/>
<text x="70" y="41" text-anchor="middle" font-size="7" fill="#93c5fd">MAX485</text>
<rect x="100" y="28" width="26" height="20" rx="2" fill="#9ca3af"/>
<text x="113" y="41" text-anchor="middle" font-size="6" fill="#1f2937">A B</text>
'@
Save-Svg "rs485_mod.svg" (ModuleSvg "RS485 TTL" $x4)
$x5=$x4 -replace 'MAX485','TJA1050'
Save-Svg "can_mod.svg" (ModuleSvg "CAN BUS" $x5)

# MQ series
$mqTpl=@'
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="112" viewBox="0 0 120 112">
<rect x="10" y="60" width="100" height="38" rx="4" fill="#7f1d1d" stroke="#450a0a" stroke-width="2"/>
<circle cx="60" cy="46" r="34" fill="#9ca3af" stroke="#475569" stroke-width="3"/>
<circle cx="60" cy="46" r="26" fill="#64748b"/>
<g stroke="#334155" stroke-width="2">
<line x1="60" y1="22" x2="60" y2="70"/>
<line x1="60" y1="22" x2="60" y2="70" transform="rotate(30 60 46)"/>
<line x1="60" y1="22" x2="60" y2="70" transform="rotate(60 60 46)"/>
<line x1="60" y1="22" x2="60" y2="70" transform="rotate(90 60 46)"/>
<line x1="60" y1="22" x2="60" y2="70" transform="rotate(120 60 46)"/>
<line x1="60" y1="22" x2="60" y2="70" transform="rotate(150 60 46)"/>
</g>
<circle cx="60" cy="46" r="10" fill="#e2e8f0" stroke="#94a3b8"/>
<text x="60" y="86" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#fecaca">__LB</text>
<text x="60" y="97" text-anchor="middle" font-family="Arial" font-size="7" fill="#fca5a5">__SUB target</text>
<g fill="#d4af37"><rect x="24" y="99" width="9" height="9"/><rect x="55" y="99" width="9" height="9"/><rect x="86" y="99" width="9" height="9"/></g>
</svg>
'@
Save-Svg "mq2.svg"   (Rep (Rep $mqTpl "__LB" "MQ-2")   "__SUB" "smoke/gas")
Save-Svg "mq3.svg"   (Rep (Rep $mqTpl "__LB" "MQ-3")   "__SUB" "alcohol")
Save-Svg "mq135.svg" (Rep (Rep $mqTpl "__LB" "MQ-135") "__SUB" "air quality")

# Hall
Save-Svg "hall.svg" @'
<svg xmlns="http://www.w3.org/2000/svg" width="90" height="94" viewBox="0 0 90 94">
<rect x="25" y="16" width="40" height="30" rx="3" fill="#1f2937" stroke="#4b5563" stroke-width="2"/>
<text x="45" y="35" text-anchor="middle" font-family="Arial" font-size="9" fill="#e5e7eb">A3144</text>
<g stroke="#cbd5e1" stroke-width="3"><line x1="35" y1="46" x2="35" y2="80"/><line x1="45" y1="46" x2="45" y2="80"/><line x1="55" y1="46" x2="55" y2="80"/></g>
<text x="45" y="92" text-anchor="middle" font-family="Arial" font-size="8" fill="#94a3b8">HALL</text>
</svg>
'@

# Reed
Save-Svg "reed.svg" @'
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="64" viewBox="0 0 120 64">
<rect x="14" y="20" width="92" height="20" rx="10" fill="rgba(180,220,255,.35)" stroke="#93c5fd" stroke-width="2"/>
<g stroke="#f59e0b" stroke-width="3"><line x1="20" y1="30" x2="58" y2="30"/><line x1="62" y1="30" x2="100" y2="30"/></g>
<circle cx="60" cy="30" r="3" fill="#fbbf24"/>
<g stroke="#cbd5e1" stroke-width="3"><line x1="8" y1="30" x2="20" y2="30"/><line x1="106" y1="30" x2="118" y2="30"/></g>
<text x="60" y="56" text-anchor="middle" font-family="Arial" font-size="9" fill="#94a3b8">REED SWITCH</text>
</svg>
'@

# Trimpot
Save-Svg "trimpot.svg" @'
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="98" viewBox="0 0 100 98">
<rect x="18" y="30" width="64" height="46" rx="4" fill="#1d4ed8" stroke="#1e3a8a" stroke-width="2"/>
<circle cx="50" cy="46" r="14" fill="#b45309" stroke="#92400e" stroke-width="2"/>
<line x1="50" y1="46" x2="50" y2="34" stroke="#fde68a" stroke-width="3"/>
<text x="50" y="72" text-anchor="middle" font-family="Arial" font-size="9" fill="#dbeafe">103</text>
<g fill="#d4af37"><rect x="26" y="76" width="8" height="18"/><rect x="46" y="76" width="8" height="18"/><rect x="66" y="76" width="8" height="18"/></g>
</svg>
'@

# Transformer
Save-Svg "transformer.svg" @'
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="110" viewBox="0 0 120 110">
<rect x="30" y="14" width="60" height="70" fill="#52525b" stroke="#3f3f46" stroke-width="3"/>
<rect x="42" y="26" width="36" height="46" fill="#a1a1aa" stroke="#52525b"/>
<g stroke="#ea580c" stroke-width="4" fill="none">
<rect x="20" y="30" width="18" height="38"/><rect x="82" y="30" width="18" height="38"/>
</g>
<g stroke="#f97316" stroke-width="1.5" opacity=".8">
<line x1="20" y1="38" x2="38" y2="38"/><line x1="20" y1="46" x2="38" y2="46"/><line x1="20" y1="54" x2="38" y2="54"/><line x1="20" y1="62" x2="38" y2="62"/>
<line x1="82" y1="38" x2="100" y2="38"/><line x1="82" y1="46" x2="100" y2="46"/><line x1="82" y1="54" x2="100" y2="54"/><line x1="82" y1="62" x2="100" y2="62"/>
</g>
<g stroke="#cbd5e1" stroke-width="3"><line x1="29" y1="68" x2="29" y2="96"/><line x1="91" y1="68" x2="91" y2="96"/></g>
</svg>
'@

# 4051 DIP-16
$pinsTop=""; $pinsBot=""
for($i=0;$i -lt 8;$i++){
  $px=22+$i*14
  $pinsTop+="<rect x='$px' y='4' width='7' height='9'/>"
  $pinsBot+="<rect x='$px' y='55' width='7' height='9'/>"
}
$dip=@'
<svg xmlns="http://www.w3.org/2000/svg" width="150" height="70" viewBox="0 0 150 70">
<rect x="15" y="12" width="120" height="44" rx="4" fill="#0b0f19" stroke="#374151" stroke-width="2"/>
<circle cx="24" cy="22" r="3" fill="#4b5563"/>
<text x="75" y="30" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#e5e7eb">CD4051</text>
<text x="75" y="44" text-anchor="middle" font-family="Arial" font-size="8" fill="#9ca3af">8-CH MULTIPLEXER</text>
<g fill="#d4af37">__PT __PB</g>
</svg>
'@
$dip=Rep $dip "__PT" $pinsTop; $dip=Rep $dip "__PB" $pinsBot
Save-Svg "mux4051.svg" $dip

# AA pack
$cells=""
for($i=0;$i -lt 4;$i++){
  $cx=16+$i*34
  $cells+="<rect x='$cx' y='22' width='28' height='36' rx='13' fill='#e2e8f0' stroke='#94a3b8'/><rect x='"+($cx+18)+"' y='24' width='8' height='32' rx='4' fill='#ef4444'/>"
}
$aap=@'
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="82" viewBox="0 0 160 82">
<rect x="8" y="14" width="144" height="52" rx="6" fill="#334155" stroke="#1e293b" stroke-width="2"/>
__CELLS
<text x="80" y="79" text-anchor="middle" font-family="Arial" font-size="9" fill="#94a3b8">6V AA x4 PACK</text>
</svg>
'@
Save-Svg "aa_pack.svg" (Rep $aap "__CELLS" $cells)

# LiIon 18650
Save-Svg "liion.svg" @'
<svg xmlns="http://www.w3.org/2000/svg" width="70" height="170" viewBox="0 0 70 170">
<rect x="16" y="14" width="38" height="142" rx="17" fill="#1d4ed8" stroke="#172554" stroke-width="2"/>
<rect x="20" y="18" width="12" height="134" rx="6" fill="#3b82f6" opacity=".55"/>
<rect x="16" y="60" width="38" height="34" fill="#f8fafc" opacity=".9"/>
<text x="35" y="76" text-anchor="middle" font-family="Arial" font-size="8" font-weight="bold" fill="#1e3a8a">18650</text>
<text x="35" y="86" text-anchor="middle" font-family="Arial" font-size="7" fill="#1e3a8a">3.7V</text>
<rect x="27" y="4" width="16" height="10" fill="#9ca3af"/><rect x="31" y="0" width="8" height="6" fill="#d4af37"/>
</svg>
'@

# Boost converter
$x6=@'
<rect x="46" y="24" width="48" height="30" rx="3" fill="#0b0f19" stroke="#64748b"/>
<text x="70" y="42" text-anchor="middle" font-size="7" fill="#93c5fd">LM2596</text>
<ellipse cx="30" cy="40" rx="11" ry="14" fill="#334155" stroke="#94a3b8" stroke-width="2"/>
<ellipse cx="30" cy="40" rx="6" ry="9" fill="#475569"/>
<rect x="104" y="30" width="26" height="18" fill="#9ca3af" stroke="#64748b"/>
<text x="117" y="43" text-anchor="middle" font-size="7" fill="#1f2937">OUT</text>
'@
Save-Svg "boost_conv.svg" (ModuleSvg "LM2596 BOOST" $x6)

# USB supply
Save-Svg "usb_supply.svg" @'
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">
<rect x="10" y="20" width="100" height="44" rx="5" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
<rect x="86" y="30" width="22" height="24" rx="2" fill="#9ca3af" stroke="#6b7280"/>
<rect x="90" y="35" width="14" height="4" fill="#f8fafc"/><rect x="90" y="45" width="14" height="4" fill="#f8fafc"/>
<text x="42" y="46" text-anchor="middle" font-family="Arial" font-size="10" font-weight="bold" fill="#fca5a5">5V/2A</text>
<g fill="#d4af37"><rect x="20" y="64" width="9" height="10"/><rect x="40" y="64" width="9" height="10"/></g>
</svg>
'@

# Ethernet module
Save-Svg "eth_mod.svg" @'
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="110" viewBox="0 0 160 110">
<rect x="4" y="6" width="152" height="88" rx="6" fill="#14532d" stroke="#052e16" stroke-width="2"/>
<rect x="88" y="18" width="60" height="46" rx="3" fill="#0b0f19" stroke="#64748b"/>
<rect x="96" y="26" width="44" height="30" fill="#334155"/>
<g fill="#facc15"><rect x="99" y="30" width="8" height="22"/><rect x="110" y="30" width="8" height="22"/><rect x="121" y="30" width="8" height="22"/><rect x="132" y="30" width="8" height="22"/></g>
<text x="118" y="74" text-anchor="middle" font-size="7" fill="#bbf7d0">RJ45 ETHERNET</text>
<text x="46" y="46" text-anchor="middle" font-family="Arial" font-size="10" font-weight="bold" fill="#dcfce7">W5500</text>
<g fill="#d4af37"><rect x="16" y="94" width="9" height="10"/><rect x="36" y="94" width="9" height="10"/><rect x="56" y="94" width="9" height="10"/><rect x="76" y="94" width="9" height="10"/></g>
</svg>
'@

# SIM800L
Save-Svg "sim800l.svg" @'
<svg xmlns="http://www.w3.org/2000/svg" width="140" height="112" viewBox="0 0 140 112">
<rect x="4" y="6" width="132" height="88" rx="6" fill="#7f1d1d" stroke="#450a0a" stroke-width="2"/>
<rect x="30" y="18" width="80" height="52" fill="#0b0f19" stroke="#64748b" stroke-width="2"/>
<text x="70" y="48" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#e5e7eb">SIM800L</text>
<circle cx="116" cy="24" r="9" fill="none" stroke="#facc15" stroke-width="3"/>
<line x1="116" y1="15" x2="116" y2="9" stroke="#facc15" stroke-width="3"/>
<text x="70" y="84" text-anchor="middle" font-size="8" fill="#fecaca">GSM/GPRS MODULE</text>
<g fill="#d4af37"><rect x="18" y="96" width="9" height="12"/><rect x="38" y="96" width="9" height="12"/><rect x="58" y="96" width="9" height="12"/><rect x="78" y="96" width="9" height="12"/></g>
</svg>
'@

# ---------- boards ----------
# Nano
$nanoPins=""
for($i=0;$i -lt 14;$i++){ $nx=44+$i*10; $nanoPins+="<rect x='$nx' y='178' width='5' height='10'/><rect x='$nx' y='218' width='5' height='10'/>" }
$nano=@'
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="260" viewBox="0 0 220 260">
<defs><linearGradient id="shn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient></defs>
<rect x="30" y="10" width="160" height="240" rx="8" fill="#166534" stroke="#14532d" stroke-width="3"/>
<rect x="30" y="10" width="160" height="240" rx="8" fill="url(#shn)" opacity=".07"/>
<rect x="86" y="14" width="48" height="30" rx="3" fill="#9ca3af" stroke="#6b7280"/>
<rect x="92" y="20" width="36" height="18" fill="#4b5563"/>
<rect x="70" y="96" width="80" height="66" fill="#0b0f19" stroke="#000"/>
<circle cx="78" cy="104" r="3" fill="#374151"/>
<text x="110" y="126" text-anchor="middle" font-family="Arial" font-size="10" font-weight="bold" fill="#e5e7eb">ATmega328P</text>
<text x="110" y="140" text-anchor="middle" font-family="Arial" font-size="8" fill="#9ca3af">NANO</text>
<rect x="40" y="176" width="140" height="14" fill="#111827"/>
<rect x="40" y="216" width="140" height="14" fill="#111827"/>
<g fill="#0f172a">__PINS</g>
<rect x="168" y="52" width="16" height="10" rx="2" fill="#d4af37"/>
<circle cx="52" cy="60" r="5" fill="#111827" stroke="#4b5563"/>
<circle cx="150" cy="60" r="4" fill="#365314"/>
<text x="110" y="250" text-anchor="middle" font-family="Arial" font-size="9" fill="#bbf7d0">ARDUINO NANO</text>
</svg>
'@
Save-Svg "ArduinoNano.svg" (Rep $nano "__PINS" $nanoPins)

# Mega
$mTop="";$mBot="";$mR=""
for($i=0;$i -lt 18;$i++){ $mx=30+$i*13; $mTop+="<rect x='$mx' y='230' width='7' height='26'/>"; $mBot+="<rect x='$mx' y='270' width='7' height='26'/>" }
for($i=0;$i -lt 10;$i++){ $rx=330+$i*13; $mR+="<rect x='$rx' y='230' width='7' height='26'/><rect x='$rx' y='270' width='7' height='26'/>" }
$mega=@'
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="310" viewBox="0 0 480 310">
<defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient></defs>
<rect x="8" y="8" width="464" height="294" rx="12" fill="#00695f" stroke="#004d46" stroke-width="4"/>
<rect x="8" y="8" width="464" height="294" rx="12" fill="url(#mg)" opacity=".06"/>
<rect x="30" y="24" width="70" height="46" fill="#0b0f19" stroke="#374151"/>
<text x="65" y="52" text-anchor="middle" font-size="9" fill="#9ca3af">USB-B</text>
<rect x="380" y="22" width="60" height="34" rx="4" fill="#1f2937" stroke="#111827"/>
<text x="410" y="44" text-anchor="middle" font-size="8" fill="#9ca3af">PWR JACK</text>
<rect x="180" y="112" width="120" height="86" fill="#0b0f19" stroke="#000"/>
<circle cx="192" cy="124" r="4" fill="#374151"/>
<text x="240" y="148" text-anchor="middle" font-family="Arial" font-size="13" font-weight="bold" fill="#e5e7eb">ATmega2560</text>
<text x="240" y="166" text-anchor="middle" font-family="Arial" font-size="9" fill="#9ca3af">MEGA 2560 R3</text>
<text x="240" y="90" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#ccfbf1">ARDUINO MEGA</text>
<g fill="#111827">__MT __MB __MR</g>
<circle cx="430" cy="80" r="5" fill="#052e16"/>
</svg>
'@
$mega=Rep $mega "__MT" $mTop; $mega=Rep $mega "__MB" $mBot; $mega=Rep $mega "__MR" $mR
Save-Svg "ArduinoMega.svg" $mega

# ESP32 DevKit
$espPins=""
for($i=0;$i -lt 15;$i++){ $py=96+$i*12; $espPins+="<rect x='18' y='$py' width='12' height='7'/><rect x='170' y='$py' width='12' height='7'/>" }
$esp=@'
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="290" viewBox="0 0 200 290">
<rect x="14" y="8" width="172" height="274" rx="8" fill="#14532d" stroke="#052e16" stroke-width="3"/>
<rect x="58" y="18" width="84" height="66" fill="#0b0f19" stroke="#374151" stroke-width="2"/>
<path d="M70 24 h60 M70 32 h60 M70 40 h60" stroke="#4b5563" stroke-width="2"/>
<text x="100" y="58" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#e5e7eb">ESP-WROOM-32</text>
<rect x="80" y="238" width="40" height="26" rx="3" fill="#9ca3af" stroke="#6b7280"/>
<rect x="86" y="244" width="28" height="14" fill="#4b5563"/>
<g fill="#111827">__PINS</g>
<rect x="24" y="212" width="18" height="14" rx="2" fill="#1f2937" stroke="#4b5563"/><text x="33" y="222" text-anchor="middle" font-size="6" fill="#9ca3af">EN</text>
<rect x="158" y="212" width="18" height="14" rx="2" fill="#1f2937" stroke="#4b5563"/><text x="167" y="222" text-anchor="middle" font-size="6" fill="#9ca3af">BOOT</text>
<text x="100" y="285" text-anchor="middle" font-family="Arial" font-size="9" fill="#bbf7d0">ESP32 DEVKIT</text>
</svg>
'@
Save-Svg "ESP32_DevKit.svg" (Rep $esp "__PINS" $espPins)

# NodeMCU
$nodPins=""
for($i=0;$i -lt 8;$i++){ $py=150+$i*13; $nodPins+="<rect x='20' y='$py' width='12' height='7'/><rect x='158' y='$py' width='12' height='7'/>" }
$nod=@'
<svg xmlns="http://www.w3.org/2000/svg" width="190" height="300" viewBox="0 0 190 300">
<rect x="14" y="8" width="162" height="284" rx="8" fill="#166534" stroke="#14532d" stroke-width="3"/>
<path d="M75 20 h40 v40 h-40 z M83 28 h24 v24 h-24 z" fill="none" stroke="#0b0f19" stroke-width="3"/>
<rect x="55" y="76" width="80" height="58" fill="#0b0f19" stroke="#374151"/>
<path d="M63 84 h64 M63 92 h64 M63 100 h64 M63 108 h64" stroke="#4b5563" stroke-width="2"/>
<text x="95" y="126" text-anchor="middle" font-family="Arial" font-size="9" font-weight="bold" fill="#e5e7eb">ESP-12E</text>
<rect x="72" y="256" width="46" height="26" rx="3" fill="#9ca3af" stroke="#6b7280"/>
<rect x="78" y="262" width="34" height="14" fill="#4b5563"/>
<g fill="#111827">__PINS</g>
<text x="95" y="296" text-anchor="middle" font-family="Arial" font-size="9" fill="#bbf7d0">NodeMCU 1.0</text>
</svg>
'@
Save-Svg "ESP8266_NodeMCU.svg" (Rep $nod "__PINS" $nodPins)

# Pico
$picL="";$picR=""
for($i=0;$i -lt 10;$i++){ $ly=30+$i*10; $picL+="<rect x='4' y='$ly' width='10' height='6'/>"; $ry=30+$i*10; $picR+="<rect x='116' y='$ry' width='10' height='6'/>" }
$pic=@'
<svg xmlns="http://www.w3.org/2000/svg" width="130" height="260" viewBox="0 0 130 260">
<rect x="8" y="8" width="114" height="244" rx="8" fill="#166534" stroke="#14532d" stroke-width="3"/>
<rect x="40" y="14" width="50" height="26" rx="3" fill="#9ca3af" stroke="#6b7280"/>
<rect x="46" y="20" width="38" height="14" fill="#4b5563"/>
<rect x="41" y="106" width="48" height="48" fill="#0b0f19" stroke="#000"/>
<g fill="#d4af37"><rect x="45" y="110" width="8" height="8"/><rect x="81" y="110" width="8" height="8"/><rect x="45" y="146" width="8" height="8"/><rect x="81" y="146" width="8" height="8"/></g>
<text x="65" y="134" text-anchor="middle" font-family="Arial" font-size="8" fill="#9ca3af">RP2040</text>
<g fill="#0f172a">__L __R</g>
<circle cx="65" cy="196" r="8" fill="#1f2937" stroke="#4b5563"/><text x="65" y="199" text-anchor="middle" font-size="6" fill="#9ca3af">BOOT</text>
<text x="65" y="248" text-anchor="middle" font-family="Arial" font-size="9" fill="#bbf7d0">Raspberry Pi Pico</text>
</svg>
'@
$pic=Rep $pic "__L" $picL; $pic=Rep $pic "__R" $picR
Save-Svg "RP2040_Pico.svg" $pic

# Pro Mini
$pmPins=""
for($i=0;$i -lt 12;$i++){ $px=16+$i*8; $pmPins+="<rect x='$px' y='150' width='5' height='16'/><rect x='$px' y='174' width='5' height='16'/>" }
$pm=@'
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="210" viewBox="0 0 120 210">
<rect x="10" y="8" width="100" height="194" rx="6" fill="#7f1d1d" stroke="#450a0a" stroke-width="3"/>
<rect x="38" y="14" width="44" height="24" rx="3" fill="#9ca3af" stroke="#6b7280"/>
<rect x="44" y="19" width="32" height="14" fill="#4b5563"/>
<rect x="34" y="88" width="52" height="46" fill="#0b0f19" stroke="#000"/>
<text x="60" y="114" text-anchor="middle" font-family="Arial" font-size="8" font-weight="bold" fill="#e5e7eb">ATmega328P</text>
<text x="60" y="127" text-anchor="middle" font-family="Arial" font-size="7" fill="#9ca3af">PRO MINI 5V</text>
<g fill="#111827">__PINS</g>
<circle cx="98" cy="60" r="4" fill="#111827" stroke="#4b5563"/>
</svg>
'@
Save-Svg "ArduinoProMini.svg" (Rep $pm "__PINS" $pmPins)

Write-Output "custom batch 1 done"

# Uno R4
$r4Top="";$r4Bot="";$r4Low=""
for($i=0;$i -lt 14;$i++){ $x=40+$i*20; $r4Top+="<rect x='$x' y='320' width='10' height='40'/>" }
for($i=0;$i -lt 14;$i++){ $x=330+$i*16; $r4Bot+="<rect x='$x' y='320' width='9' height='40'/>" }
for($i=0;$i -lt 8;$i++){ $x=60+$i*18; $r4Low+="<rect x='$x' y='370' width='9' height='36'/>" }
$r4=@'
<svg xmlns="http://www.w3.org/2000/svg" width="570" height="418" viewBox="0 0 570 418">
<rect x="6" y="6" width="558" height="406" rx="14" fill="#0f766e" stroke="#134e4a" stroke-width="5"/>
<rect x="30" y="30" width="86" height="52" fill="#0b0f19" stroke="#374151"/>
<text x="73" y="60" text-anchor="middle" font-size="10" fill="#9ca3af">USB-C</text>
<rect x="440" y="26" width="86" height="40" rx="5" fill="#1f2937" stroke="#111827"/>
<text x="483" y="51" text-anchor="middle" font-size="9" fill="#9ca3af">BARREL JACK</text>
<rect x="215" y="150" width="140" height="100" fill="#0b0f19" stroke="#000"/>
<text x="285" y="195" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#e5e7eb">RA4M1</text>
<text x="285" y="215" text-anchor="middle" font-family="Arial" font-size="10" fill="#9ca3af">ESP32-S3 WiFi</text>
<text x="285" y="80" text-anchor="middle" font-family="Arial" font-size="22" font-weight="bold" fill="#99f6e4">ARDUINO UNO R4 WiFi</text>
<g fill="#111827">__A __B __C</g>
<circle cx="520" cy="120" r="7" fill="#134e4a"/>
<rect x="60" y="120" width="60" height="90" fill="none" stroke="#99f6e4" stroke-width="2" stroke-dasharray="6 4"/>
<text x="90" y="230" text-anchor="middle" font-size="9" fill="#99f6e4">Qwiic</text>
</svg>
'@
$r4=Rep $r4 "__A" $r4Top; $r4=Rep $r4 "__B" $r4Bot; $r4=Rep $r4 "__C" $r4Low
Save-Svg "ArduinoUNOR4.svg" $r4

# Due
$dA="";$dB="";$dC=""
for($i=0;$i -lt 18;$i++){ $x=34+$i*15; $dA+="<rect x='$x' y='330' width='9' height='44'/>" }
for($i=0;$i -lt 18;$i++){ $x=330+$i*13; $dB+="<rect x='$x' y='330' width='8' height='44'/>" }
for($i=0;$i -lt 8;$i++){ $x=70+$i*18; $dC+="<rect x='$x' y='380' width='9' height='30'/>" }
$due=@'
<svg xmlns="http://www.w3.org/2000/svg" width="570" height="420" viewBox="0 0 570 420">
<rect x="6" y="6" width="558" height="408" rx="14" fill="#3f3f46" stroke="#27272a" stroke-width="5"/>
<rect x="30" y="28" width="80" height="56" fill="#0b0f19" stroke="#374151"/>
<text x="70" y="60" text-anchor="middle" font-size="10" fill="#9ca3af">USB-B</text>
<rect x="446" y="26" width="80" height="40" rx="5" fill="#1f2937" stroke="#111827"/>
<rect x="205" y="150" width="160" height="104" fill="#0b0f19" stroke="#000"/>
<text x="285" y="196" text-anchor="middle" font-family="Arial" font-size="15" font-weight="bold" fill="#e5e7eb">SAM3X8E</text>
<text x="285" y="218" text-anchor="middle" font-family="Arial" font-size="11" fill="#9ca3af">32-bit ARM Cortex-M3</text>
<text x="285" y="84" text-anchor="middle" font-family="Arial" font-size="24" font-weight="bold" fill="#e4e4e7">ARDUINO DUE</text>
<g fill="#18181b">__A __B __C</g>
<circle cx="520" cy="120" r="7" fill="#27272a"/>
</svg>
'@
$due=Rep $due "__A" $dA; $due=Rep $due "__B" $dB; $due=Rep $due "__C" $dC
Save-Svg "ArduinoDue.svg" $due

# S2/S3/C3 variants
$varTpl=@'
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">
<rect x="14" y="8" width="172" height="264" rx="8" fill="#14532d" stroke="#052e16" stroke-width="3"/>
<rect x="58" y="18" width="84" height="62" fill="#0b0f19" stroke="#374151"/>
<text x="100" y="54" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#e5e7eb">ESP32-__TAG</text>
<path d="M70 24 h60 M70 31 h60 M70 38 h60" stroke="#4b5563" stroke-width="2"/>
<rect x="82" y="232" width="36" height="24" rx="3" fill="#9ca3af" stroke="#6b7280"/>
<text x="100" y="270" text-anchor="middle" font-family="Arial" font-size="9" fill="#bbf7d0">__SUB</text>
</svg>
'@
Save-Svg "ESP32_S2.svg" (Rep (Rep $varTpl "__TAG" "S2") "__SUB" "Saola")
Save-Svg "ESP32_S3.svg" (Rep (Rep $varTpl "__TAG" "S3") "__SUB" "DevKitC-1")
Save-Svg "ESP32_C3.svg" (Rep (Rep $varTpl "__TAG" "C3") "__SUB" "Mini")

Write-Output ("DONE total svg files: "+((Get-ChildItem $dir -Filter *.svg).Count))