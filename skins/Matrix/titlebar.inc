## titlebar.inc -- shared terminal-window header + navigation for the Matrix skin
##
## Expects the including template to have #set the following before including:
##   $rel         -- relative path prefix back to HTML_ROOT ("" or "../")
##   $nav_current -- one of "index", "history", "archive", "about" (or "" for none)
#errorCatcher Echo

#set $host_slug = $station.location.lower().replace(' ', '-').replace('/', '-')
#set $enable_shell = $to_bool($Extras.get('enable_shell', True))
#set $default_theme = $Extras.get('default_theme', 'matrix')
#set $hardware_display = $Extras.get('hardware_name', '') or $station.hardware
#set $atproto_url = $Extras.get('atproto', '')
#if $current.outTemp.raw is not None
#set $cur_outtemp = $current.outTemp.raw
#else
#set $cur_outtemp = ''
#end if
#if $current.outHumidity.raw is not None
#set $cur_humidity = $current.outHumidity.raw
#else
#set $cur_humidity = ''
#end if
#if $current.barometer.raw is not None
#set $cur_barometer = $current.barometer.raw
#else
#set $cur_barometer = ''
#end if
#if $current.windSpeed.raw is not None
#set $cur_windspeed = $current.windSpeed.raw
#else
#set $cur_windspeed = ''
#end if
#if $current.windDir.raw is not None
#set $cur_winddir = $current.windDir.raw
#else
#set $cur_winddir = ''
#end if
#if $current.rainRate.raw is not None
#set $cur_rainrate = $current.rainRate.raw
#else
#set $cur_rainrate = ''
#end if
#if $current.UV.raw is not None
#set $cur_uv = $current.UV.raw
#else
#set $cur_uv = ''
#end if
#if $current.pm2_5.raw is not None
#set $cur_pm25 = $current.pm2_5.raw
#else
#set $cur_pm25 = ''
#end if
#if $day.rain.sum.raw is not None
#set $day_rain = $day.rain.sum.raw
#else
#set $day_rain = ''
#end if
#if $day.outTemp.max.raw is not None
#set $day_outtemp_max = $day.outTemp.max.raw
#else
#set $day_outtemp_max = ''
#end if
#if $day.outTemp.min.raw is not None
#set $day_outtemp_min = $day.outTemp.min.raw
#else
#set $day_outtemp_min = ''
#end if

<div id="title_bar">
  <div class="term_chrome">
    <span class="term_dot red"></span>
    <span class="term_dot amber"></span>
    <span class="term_dot green"></span>
  </div>
  <div class="term_body">

#if $enable_shell
    <div id="shell" class="shell" data-shell
         data-data-url="${rel}shell-data.json"
         data-host="$host_slug"
         data-nav="$nav_current"
         data-default-theme="$default_theme"
         data-station-location="$station.location"
         data-station-hardware="$hardware_display"
         data-station-version="$station.version"
         data-station-os-uptime="$station.os_uptime.long_form"
         data-station-weewx-uptime="$station.uptime.long_form"
         data-station-skin="$SKIN_NAME $SKIN_VERSION"
         data-current-datetime="$current.dateTime"
         data-current-outtemp="$cur_outtemp"
         data-current-outtemp-fmt="$current.outTemp"
         data-current-dewpoint-fmt="$current.dewpoint"
         data-current-humidity="$cur_humidity"
         data-current-humidity-fmt="$current.outHumidity"
         data-current-barometer="$cur_barometer"
         data-current-barometer-fmt="$current.barometer"
         data-current-windspeed="$cur_windspeed"
         data-current-windspeed-fmt="$current.windSpeed"
         data-current-windgust-fmt="$current.windGust"
         data-current-winddir="$cur_winddir"
         data-current-winddir-compass="$current.windDir.ordinal_compass"
         data-current-rainrate="$cur_rainrate"
         data-current-rainrate-fmt="$current.rainRate"
         data-current-uv="$cur_uv"
         data-current-pm25="$cur_pm25"
         data-trend-barometer="$trend.barometer.formatted"
         data-day-rain="$day_rain"
         data-day-rain-fmt="$day.rain.sum"
         data-day-outtemp-max="$day_outtemp_max"
         data-day-outtemp-min="$day_outtemp_min"
         data-rainyear-rain-fmt="$rainyear.rain.sum">
      <div class="shell_output" id="shell-output" aria-live="polite" aria-label="Shell output"></div>
      <form class="shell_input_row" id="shell-form" autocomplete="off" spellcheck="false">
        <label class="shell_prompt" for="shell-input">
          <span class="user">guest</span><span class="at">@</span><span class="host">$host_slug</span><span class="path" id="shell-prompt-path">:~$</span>
        </label>
        <span class="shell_input_wrap">
          <input type="text" id="shell-input" class="shell_input" aria-label="Shell command input" autocapitalize="off" autocorrect="off">
          <span class="cursor shell_cursor" id="shell-cursor" aria-hidden="true">&nbsp;</span>
        </span>
      </form>
    </div>
#else
    <p class="prompt">
      <span class="user">guest</span><span class="at">@</span><span class="host">weewx-matrix</span><span class="path">:~$</span>
      cat /var/status/uplink
    </p>
#end if

    <h1 class="page_title">$station.location</h1>
    <p class="lastupdate">
      $gettext("Last Update"): $current.dateTime &nbsp;|&nbsp;
      <span class="clock" data-clock>&nbsp;</span>
    </p>

    #set $cls_index = ' class="current"' if $nav_current == 'index' else ''
    #set $cls_history = ' class="current"' if $nav_current == 'history' else ''
    #set $cls_archive = ' class="current"' if $nav_current == 'archive' else ''
    #set $cls_about = ' class="current"' if $nav_current == 'about' else ''
    <nav class="mainnav">
      <a href="${rel}index.html"$cls_index>$gettext("Home")</a>
      <a href="${rel}history.html"$cls_history>$gettext("History")</a>
      <a href="${rel}archive.html"$cls_archive>$gettext("Archive")</a>
      <a href="${rel}about.html"$cls_about>$gettext("About")</a>
      #if $atproto_url
      <a href="$atproto_url">$gettext("ATPROTO")</a>
      #end if
      <a href="${rel}current.json">$gettext("JSON")</a>
      #if $to_bool($DisplayOptions.get('show_rss', True))
      <a href="${rel}rss.xml">$gettext("RSS")</a>
      #end if
      <button type="button" id="theme-toggle" class="theme-toggle" aria-pressed="false" data-default-theme="$default_theme" data-label-safe="$gettext('Safe Mode')" data-label-matrix="$gettext('Matrix Mode')">
        $gettext("Safe Mode")
      </button>
    </nav>
    #include "theme-toggle.inc"
  </div>
</div>
