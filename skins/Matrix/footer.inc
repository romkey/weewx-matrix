## footer.inc -- shared footer for the Matrix skin
##
## Expects $rel to be #set by the including template.
#errorCatcher Echo

<footer class="term_footer">
  <p>$gettext("This station is monitored by WeeWX, running the Matrix theme.")</p>
  <p class="mono-small">$SKIN_NAME v$SKIN_VERSION &middot; <a href="${rel}about.html">$gettext("System Info")</a></p>
</footer>
