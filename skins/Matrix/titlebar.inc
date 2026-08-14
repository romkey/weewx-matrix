## titlebar.inc -- shared terminal-window header + navigation for the Matrix skin
##
## Expects the including template to have #set the following before including:
##   $rel         -- relative path prefix back to HTML_ROOT ("" or "../")
##   $nav_current -- one of "index", "history", "archive", "about" (or "" for none)
#errorCatcher Echo

#set $host_slug = $station.location.lower().replace(' ', '-').replace('/', '-')

<div id="title_bar">
  <div class="term_chrome">
    <span class="term_dot red"></span>
    <span class="term_dot amber"></span>
    <span class="term_dot green"></span>
    <span class="term_path">root@${host_slug}:~$${nav_current}#</span>
  </div>
  <div class="term_body">
    <p class="prompt">
      <span class="user">guest</span><span class="at">@</span><span class="host">weewx-matrix</span><span class="path">:~$</span>
      cat /var/status/uplink
    </p>
    <h1 class="page_title">$station.location</h1>
    <p class="lastupdate">
      $gettext("Last Update"): $current.dateTime &nbsp;|&nbsp;
      <span class="clock" data-clock>&nbsp;</span><span class="cursor">&nbsp;</span>
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
      #if $to_bool($DisplayOptions.get('show_rss', True))
      <a href="${rel}rss.xml">$gettext("RSS")</a>
      #end if
    </nav>
  </div>
</div>
