## theme-init.inc -- prevent flash of wrong theme before CSS loads
#errorCatcher Echo
#set $default_theme = $Extras.get('default_theme', 'matrix')
<script>
(function(){try{var k='matrix-theme',d='$default_theme',t=localStorage.getItem(k);var theme=(!t||t==='matrix'||t==='safe')?(t||d):d;document.documentElement.setAttribute('data-theme',theme);}catch(e){document.documentElement.setAttribute('data-theme','$default_theme');}}());
</script>
