/*
 * matrix.js -- behavior for the WeeWX "Matrix" skin.
 *   - Digital rain canvas backdrop
 *   - Live clock with blinking cursor
 *   - Safe Mode / Matrix theme toggle
 *   - Light plot swap in Safe Mode on light systems
 *   - Day/Week/Month/Year plot tabs (history page)
 *   - Archive dropdown navigation
 */
(function () {
  "use strict";

  var THEME_KEY = "matrix-theme";
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var prefersLight = window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches;
  var rainTimer = null;

  function getTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (t === "safe" || t === "matrix") {
        return t;
      }
    } catch (e) { /* ignore */ }
    var toggle = document.getElementById("theme-toggle");
    return (toggle && toggle.getAttribute("data-default-theme")) || "matrix";
  }

  function setTheme(theme) {
    theme = theme === "safe" ? "safe" : "matrix";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) { /* ignore */ }
    updateToggle(theme);
    applyThemeEffects(theme);
  }

  function updateToggle(theme) {
    var btn = document.getElementById("theme-toggle");
    if (!btn) {
      return;
    }
    var isSafe = theme === "safe";
    btn.setAttribute("aria-pressed", isSafe ? "true" : "false");
    btn.textContent = isSafe ? btn.getAttribute("data-label-matrix") || "Matrix Mode" : btn.getAttribute("data-label-safe") || "Safe Mode";
  }

  function applyThemeEffects(theme) {
    if (theme === "safe") {
      stopRain();
      swapPlots(true);
    } else {
      startRain();
      swapPlots(false);
    }
  }

  function swapPlots(useLight) {
    if (!prefersLight.matches) {
      return;
    }
    document.querySelectorAll("img[data-plot-light]").forEach(function (img) {
      var dark = img.getAttribute("src");
      var light = img.getAttribute("data-plot-light");
      if (!light) {
        return;
      }
      if (useLight) {
        if (!img.getAttribute("data-plot-dark")) {
          img.setAttribute("data-plot-dark", dark);
        }
        img.src = light;
      } else {
        img.src = img.getAttribute("data-plot-dark") || dark;
      }
    });
  }

  function stopRain() {
    if (rainTimer !== null) {
      clearInterval(rainTimer);
      rainTimer = null;
    }
    var canvas = document.getElementById("rain");
    if (canvas) {
      var ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvas.style.display = "none";
    }
  }

  function startRain() {
    var canvas = document.getElementById("rain");
    if (!canvas || reduceMotion || getTheme() === "safe") {
      return;
    }
    canvas.style.display = "";
    if (rainTimer !== null) {
      return;
    }
    var ctx = canvas.getContext("2d");
    var glyphs = "アイウエオカキクケコサシスセソタチツテト0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var fontSize = 16;
    var columns, drops;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.ceil(canvas.width / fontSize);
      drops = new Array(columns).fill(0).map(function () {
        return Math.floor(Math.random() * -50);
      });
    }

    function draw() {
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = fontSize + "px monospace";

      for (var i = 0; i < columns; i++) {
        var text = glyphs[Math.floor(Math.random() * glyphs.length)];
        var x = i * fontSize;
        var y = drops[i] * fontSize;

        ctx.fillStyle = "#00ff41";
        ctx.shadowColor = "#00ff41";
        ctx.shadowBlur = 4;
        ctx.fillText(text, x, y);
        ctx.shadowBlur = 0;

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    resize();
    window.addEventListener("resize", resize);
    rainTimer = setInterval(draw, 45);
  }

  function startClock() {
    var el = document.querySelector("[data-clock]");
    if (!el) {
      return;
    }
    function tick() {
      var now = new Date();
      var pad = function (n) { return String(n).padStart(2, "0"); };
      var stamp = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) +
        " " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
      el.textContent = stamp;
    }
    tick();
    setInterval(tick, 1000);
  }

  function initTabs() {
    var tabButtons = document.querySelectorAll(".tab-btn");
    if (!tabButtons.length) {
      return;
    }
    tabButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = btn.getAttribute("data-tab-target");
        document.querySelectorAll(".tab-btn").forEach(function (b) {
          b.classList.remove("active");
        });
        document.querySelectorAll(".tab-panel").forEach(function (p) {
          p.classList.remove("active");
        });
        btn.classList.add("active");
        var panel = document.getElementById(target);
        if (panel) {
          panel.classList.add("active");
        }
      });
    });
  }

  function initThemeToggle() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) {
      return;
    }
    if (!btn.getAttribute("data-label-safe")) {
      btn.setAttribute("data-label-safe", btn.textContent.trim());
    }
    btn.setAttribute("data-label-matrix", "Matrix Mode");
    var theme = getTheme();
    setTheme(theme);
    btn.addEventListener("click", function () {
      setTheme(getTheme() === "safe" ? "matrix" : "safe");
    });
    if (prefersLight.addEventListener) {
      prefersLight.addEventListener("change", function () {
        applyThemeEffects(getTheme());
      });
    }
  }

  window.gotoArchive = function (prefix, value) {
    if (!value) {
      return;
    }
    window.location.href = prefix + value + ".html";
  };

  window.MatrixTheme = {
    get: getTheme,
    set: setTheme
  };

  function setup() {
    initThemeToggle();
    startClock();
    initTabs();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();
