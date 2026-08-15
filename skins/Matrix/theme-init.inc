## theme-init.inc -- prevent flash of wrong theme before CSS loads
#errorCatcher Echo
#set $default_theme = $Extras.get('default_theme', 'matrix')
<script>
(function(){try{var k='matrix-theme',d='$default_theme',t=localStorage.getItem(k);if(!t||t==='matrix'||t==='safe'){document.documentElement.dataset.theme=t||d;}else{document.documentElement.dataset.theme=d;}}catch(e){document.documentElement.dataset.theme='$default_theme';}}());
</script>
