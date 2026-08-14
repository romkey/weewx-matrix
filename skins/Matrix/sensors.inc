## sensors.inc -- extended sensor telemetry (UV, solar radiation, air quality,
## lightning) for the Matrix skin. Every block is individually gated on
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
#set $has_extended = $has_uv or $has_radiation or $has_pm25 or $has_pm10 or $has_pm1 or $has_lightning

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
        <span class="badge level-$uv_level">$gettext("Threat Level"): $gettext($uv_key)</span>
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
