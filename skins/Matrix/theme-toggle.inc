## theme-toggle.inc -- inline Safe Mode toggle (ships with every report; not copy_once static)
#errorCatcher Echo
<script>
(function () {
  "use strict";
  var KEY = "matrix-theme";

  function getTheme() {
    try {
      var stored = localStorage.getItem(KEY);
      if (stored === "safe" || stored === "matrix") {
        return stored;
      }
    } catch (e) { /* ignore */ }
    var btn = document.getElementById("theme-toggle");
    return (btn && btn.getAttribute("data-default-theme")) || "matrix";
  }

  function updateToggle(theme) {
    var btn = document.getElementById("theme-toggle");
    if (!btn) {
      return;
    }
    var isSafe = theme === "safe";
    btn.setAttribute("aria-pressed", isSafe ? "true" : "false");
    btn.textContent = isSafe
      ? (btn.getAttribute("data-label-matrix") || "Matrix Mode")
      : (btn.getAttribute("data-label-safe") || "Safe Mode");
  }

  function setTheme(theme) {
    theme = theme === "safe" ? "safe" : "matrix";
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch (e) { /* ignore */ }
    updateToggle(theme);
    window.dispatchEvent(new CustomEvent("matrix-theme-change", { detail: { theme: theme } }));
  }

  var themeApi = { get: getTheme, set: setTheme };
  try {
    Object.defineProperty(window, "MatrixTheme", {
      value: themeApi,
      writable: false,
      configurable: true
    });
  } catch (e) {
    window.MatrixTheme = themeApi;
  }

  function initToggle() {
    var btn = document.getElementById("theme-toggle");
    if (!btn || btn.dataset.themeBound === "1") {
      return;
    }
    btn.dataset.themeBound = "1";
    setTheme(getTheme());
    btn.addEventListener("click", function () {
      setTheme(getTheme() === "safe" ? "matrix" : "safe");
    });
  }

  initToggle();
})();
</script>
