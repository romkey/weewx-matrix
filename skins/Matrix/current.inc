## current.inc -- "current conditions" readout for the Matrix skin dashboard
##
## Elements carrying data-live="<dotted path>" are refreshed in place from
## current.json by matrix.js; the path resolves against that document.
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
        <span class="value"><span data-live="current.observations.barometer">$current.barometer</span><span class="sub">$gettext("Trend"): <span data-live="trend.barometer">$trend.barometer.formatted</span></span></span>
      </div>
    #elif $x == 'windSpeed'
      <div class="readout">
        <span class="label">$gettext("Wind")</span>
        <span class="value"><span data-live="current.observations.windSpeed">$current.windSpeed</span><span class="sub" data-live="current.wind_dir_display">$current.windDir.ordinal_compass ($current.windDir)</span></span>
      </div>
    #elif $x == 'windGust'
      <div class="readout">
        <span class="label">$obs.label.windGust</span>
        <span class="value" data-live="current.observations.windGust">$current.windGust</span>
      </div>
    #elif $x == 'rain'
      <div class="readout">
        <span class="label">$gettext("Rain Today")</span>
        <span class="value" data-live="aggregates.day.rain_fmt">$day.rain.sum</span>
      </div>
    #elif $x == 'rainRate'
      <div class="readout">
        <span class="label">$obs.label.rainRate</span>
        <span class="value"><span data-live="current.observations.rainRate">$current.rainRate</span><span class="sub">$gettext("Max"): <span data-live="aggregates.day.rainRate_max_fmt">$day.rainRate.max</span></span></span>
      </div>
    #else
      <div class="readout">
        <span class="label">$obs.label[$x]</span>
        <span class="value" data-live="current.observations.${x}">$getVar('current.' + $x)</span>
      </div>
    #end if
  #end if
#end for

  </div>
</section>
