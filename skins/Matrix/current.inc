## current.inc -- "current conditions" readout for the Matrix skin dashboard
#errorCatcher Echo

#set $observations = $to_list($DisplayOptions.get('observations_current', ['outTemp', 'barometer']))

<section class="panel">
  <h2>$gettext("Current Conditions")</h2>
  <div class="grid">

#for $x in $observations
  #if $getVar('year.%s.has_data' % $x, False)
    #if $x == 'barometer'
      <div class="readout">
        <span class="label">$obs.label.barometer</span>
        <span class="value">$current.barometer<span class="sub">$gettext("Trend"): $trend.barometer.formatted</span></span>
      </div>
    #elif $x == 'windSpeed'
      <div class="readout">
        <span class="label">$gettext("Wind")</span>
        <span class="value">$current.windSpeed<span class="sub">$current.windDir.ordinal_compass ($current.windDir)</span></span>
      </div>
    #elif $x == 'windGust'
      <div class="readout">
        <span class="label">$obs.label.windGust</span>
        <span class="value">$current.windGust</span>
      </div>
    #elif $x == 'rain'
      <div class="readout">
        <span class="label">$gettext("Rain Today")</span>
        <span class="value">$day.rain.sum</span>
      </div>
    #elif $x == 'rainRate'
      <div class="readout">
        <span class="label">$obs.label.rainRate</span>
        <span class="value">$current.rainRate<span class="sub">$gettext("Max"): $day.rainRate.max</span></span>
      </div>
    #else
      <div class="readout">
        <span class="label">$obs.label[$x]</span>
        <span class="value">$getVar('current.' + $x)</span>
      </div>
    #end if
  #end if
#end for

  </div>
</section>
