## sensors.inc -- extended sensor telemetry (UV, solar radiation, particulates,
## AQI, ozone, nitrogen dioxide, sulfur dioxide, carbon monoxide, tree and
## grass pollen, sound level, lightning). Every block is individually gated on
## has_data, so the panel degrades gracefully on stations that don't have
## these sensors, and simply doesn't render at all if none are present.
##
## The "Air Quality" card below estimates a category straight from PM2.5
## (EPA breakpoints), which works out of the box with the wview_extended
## schema. If you use a dedicated AQI add-on such as weewx-aqi with its own
## data binding, you can pull its pre-computed values instead, e.g.:
##
##   #if $getVar('current(data_binding=\'aqi_binding\').aqi_pm2_5', None) is not None
##     $current(data_binding='aqi_binding').aqi_pm2_5
##   #end if
##
## wrapped in a #try/#except block so the page still renders if that
## binding isn't configured.
#errorCatcher Echo

#set $has_uv = $getVar('year.UV.has_data', False)
#set $has_radiation = $getVar('year.radiation.has_data', False)
#set $has_pm25 = $getVar('year.pm2_5.has_data', False)
#set $has_pm10 = $getVar('year.pm10_0.has_data', False)
#set $has_pm1 = $getVar('year.pm1_0.has_data', False)
#set $has_lightning = $getVar('year.lightning_strike_count.has_data', False)
##
## Banded sensors. Each entry is (observation, caption, upper bounds, category
## keys, sub-caption, format). The level is the number of bounds the reading
## exceeds, which indexes both the category key and the badge colour
## (level-0..level-5), so a bounds list of length N needs N+1 keys.
##
## An explicit format is needed because WeeWX's default for ppm rounds to whole
## numbers, which would render every ozone and SO2 reading as 0, and because
## aqi and pollen_* belong to no unit group and would otherwise print as raw
## floats such as 165.000000.
##
## Thresholds are US EPA AQI breakpoints, expressed in the units WeeWX stores
## for each observation: co/so2/o3 are group_fraction (ppm), no2 is
## group_concentration (ug/m^3), noise is group_db (dB). The EPA publishes
## so2/no2/o3 breakpoints in ppb, so they are scaled here -- for no2 using the
## standard 1 ppb = 1.88 ug/m^3 at 25 C. Pollen bands follow the National
## Allergy Bureau categories, which differ per pollen type.
#set $aq_keys = ['AQ_GOOD', 'AQ_MODERATE', 'AQ_USG', 'AQ_UNHEALTHY', 'AQ_VERY_UNHEALTHY', 'AQ_HAZARDOUS']
#set $pollen_keys = ['POLLEN_NONE', 'POLLEN_LOW', 'POLLEN_MODERATE', 'POLLEN_HIGH', 'POLLEN_VERY_HIGH']
#set $noise_keys = ['NOISE_QUIET', 'NOISE_MODERATE', 'NOISE_LOUD', 'NOISE_VERY_LOUD', 'NOISE_DANGEROUS', 'NOISE_PAINFUL']
#set $banded = []
#set $void = $banded.append(('aqi', $gettext('Air Quality Index'), [50, 100, 150, 200, 300], $aq_keys, $gettext('AQI Scale'), '%.0f'))
#set $void = $banded.append(('o3', $gettext('Ozone'), [0.054, 0.070, 0.085, 0.105, 0.200], $aq_keys, 'O3', '%.3f'))
#set $void = $banded.append(('no2', $gettext('Nitrogen Dioxide'), [100, 188, 677, 1221, 2349], $aq_keys, 'NO2', '%.0f'))
#set $void = $banded.append(('so2', $gettext('Sulfur Dioxide'), [0.035, 0.075, 0.185, 0.304, 0.604], $aq_keys, 'SO2', '%.3f'))
#set $void = $banded.append(('co', $gettext('Carbon Monoxide'), [4.4, 9.4, 12.4, 15.4, 30.4], $aq_keys, 'CO', '%.1f'))
#set $void = $banded.append(('pollen_tree', $gettext('Tree Pollen'), [0, 14, 89, 1499], $pollen_keys, $gettext('Grains per cubic meter'), '%.0f'))
#set $void = $banded.append(('pollen_grass', $gettext('Grass Pollen'), [0, 4, 19, 199], $pollen_keys, $gettext('Grains per cubic meter'), '%.0f'))
#set $void = $banded.append(('noise', $gettext('Sound Level'), [54, 69, 84, 99, 119], $noise_keys, $gettext('Sound Level Note'), '%.0f'))
#set $banded_present = [card for card in $banded if $getVar('year.%s.has_data' % card[0], False)]
#set $has_extended = $has_uv or $has_radiation or $has_pm25 or $has_pm10 or $has_pm1 or $has_lightning or len($banded_present) > 0

#if $has_extended
<section class="panel">
  <h2>$gettext("Extended Sensor Array")</h2>
  <div class="grid">

    #if $has_uv
    <div class="sensor-card">
      <div class="caption">$gettext("UV Index")</div>
      #if $current.UV.raw is not None
        #set $uv = $current.UV.raw
        #if $uv <= 2.4
          #set $uv_level, $uv_key = 0, 'UV_LOW'
        #elif $uv <= 5.4
          #set $uv_level, $uv_key = 1, 'UV_MODERATE'
        #elif $uv <= 7.4
          #set $uv_level, $uv_key = 2, 'UV_HIGH'
        #elif $uv <= 10.4
          #set $uv_level, $uv_key = 3, 'UV_VERY_HIGH'
        #else
          #set $uv_level, $uv_key = 4, 'UV_EXTREME'
        #end if
        <div class="metric">$current.UV</div>
        <span class="badge level-$uv_level">$gettext($uv_key)</span>
      #else
        <div class="metric">--</div>
      #end if
      <div class="mono-small">$gettext("Max") $gettext("Day"): $day.UV.max</div>
    </div>
    #end if

    #if $has_radiation
    <div class="sensor-card">
      <div class="caption">$gettext("Solar Radiation")</div>
      <div class="metric">$current.radiation</div>
      <div class="mono-small">$gettext("Max") $gettext("Day"): $day.radiation.max</div>
    </div>
    #end if

    #if $has_pm25 or $has_pm10 or $has_pm1
    <div class="sensor-card">
      <div class="caption">$gettext("Air Quality")</div>
      #if $has_pm25 and $current.pm2_5.raw is not None
        #set $pm = $current.pm2_5.raw
        #if $pm <= 12.0
          #set $aq_level, $aq_key = 0, 'AQ_GOOD'
        #elif $pm <= 35.4
          #set $aq_level, $aq_key = 1, 'AQ_MODERATE'
        #elif $pm <= 55.4
          #set $aq_level, $aq_key = 2, 'AQ_USG'
        #elif $pm <= 150.4
          #set $aq_level, $aq_key = 3, 'AQ_UNHEALTHY'
        #elif $pm <= 250.4
          #set $aq_level, $aq_key = 4, 'AQ_VERY_UNHEALTHY'
        #else
          #set $aq_level, $aq_key = 5, 'AQ_HAZARDOUS'
        #end if
        <div class="metric">$current.pm2_5</div>
        <span class="badge level-$aq_level">$gettext($aq_key)</span>
        <div class="mono-small">$gettext("AQI Estimate")</div>
      #else
        <div class="metric">--</div>
      #end if
      #if $has_pm10
      <div class="mono-small">PM10: $current.pm10_0</div>
      #end if
      #if $has_pm1
      <div class="mono-small">PM1.0: $current.pm1_0</div>
      #end if
    </div>
    #end if

    #for $obs, $caption, $bounds, $keys, $note, $fmt in $banded_present
    <div class="sensor-card">
      <div class="caption">$caption</div>
      #set $reading = $getVar('current.%s.raw' % $obs, None)
      #if $reading is not None
        #set $level = len([bound for bound in $bounds if $reading > bound])
        <div class="metric">$getVar('current.%s' % $obs).format($fmt)</div>
        <span class="badge level-$level">$gettext($keys[$level])</span>
      #else
        <div class="metric">--</div>
      #end if
      <div class="mono-small">$note</div>
      <div class="mono-small">$gettext("Max") $gettext("Day"): $getVar('day.%s.max' % $obs).format($fmt)</div>
    </div>
    #end for

    #if $has_lightning
    <div class="sensor-card">
      <div class="caption">$gettext("Lightning")</div>
      <div class="metric">$day.lightning_strike_count.sum</div>
      <div class="mono-small">$gettext("Strikes") ($gettext("Day"))</div>
      #if $getVar('year.lightning_distance.has_data', False)
      <div class="mono-small">$gettext("Distance"): $current.lightning_distance</div>
      #end if
    </div>
    #end if

  </div>
</section>
#end if
