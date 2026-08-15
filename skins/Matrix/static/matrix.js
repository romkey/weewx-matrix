/*
 * matrix.js v1.1.1 — behavior for the WeeWX "Matrix" skin.
 * Theme state lives in theme-toggle.inc (inline); do not export MatrixTheme here.
 *   - Digital rain canvas backdrop
 *   - Live clock
 *   - Periodic refresh of current conditions from current.json
 *   - Shell block cursor (see shell.js)
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
  var prefersLightMq = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: light)")
    : null;
  var rainTimer = null;

  function getTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (t === "safe" || t === "matrix") {
        return t;
      }
    } catch (e) { /* ignore */ }
    var current = document.documentElement.getAttribute("data-theme");
    if (current === "safe" || current === "matrix") {
      return current;
    }
    var toggle = document.getElementById("theme-toggle");
    return (toggle && toggle.getAttribute("data-default-theme")) || "matrix";
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
    if (!prefersLightMq || !prefersLightMq.matches) {
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
      canvas.style.removeProperty("display");
    }
  }

  function startRain() {
    var canvas = document.getElementById("rain");
    if (!canvas || reduceMotion || getTheme() === "safe") {
      return;
    }
    canvas.style.removeProperty("display");
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
    applyThemeEffects(getTheme());
    window.addEventListener("matrix-theme-change", function (e) {
      applyThemeEffects((e.detail && e.detail.theme) || getTheme());
    });
    if (prefersLightMq) {
      var onSchemeChange = function () {
        applyThemeEffects(getTheme());
      };
      if (prefersLightMq.addEventListener) {
        prefersLightMq.addEventListener("change", onSchemeChange);
      } else if (prefersLightMq.addListener) {
        prefersLightMq.addListener(onSchemeChange);
      }
    }
  }

  function resolvePath(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc === null || acc === undefined ? undefined : acc[key];
    }, obj);
  }

  function applyLiveData(data) {
    document.querySelectorAll("[data-live]").forEach(function (el) {
      var value = resolvePath(data, el.getAttribute("data-live"));
      if (value === undefined || value === null) {
        return;
      }
      var text = String(value);
      if (el.textContent === text) {
        return;
      }
      el.textContent = text;
      el.classList.remove("live-flash");
      void el.offsetWidth;
      el.classList.add("live-flash");
    });
  }

  function initLiveUpdates() {
    var root = document.querySelector("[data-live-url]");
    if (!root || typeof window.fetch !== "function") {
      return;
    }
    var url = root.getAttribute("data-live-url");
    var seconds = parseInt(root.getAttribute("data-live-interval"), 10);
    if (!url || !seconds || seconds < 5) {
      return;
    }
    if (!document.querySelector("[data-live]")) {
      return;
    }

    var inFlight = false;

    function poll() {
      if (inFlight || document.hidden) {
        return;
      }
      inFlight = true;
      var bust = url + (url.indexOf("?") === -1 ? "?" : "&") + "t=" + Date.now();
      window.fetch(bust, { cache: "no-store" })
        .then(function (response) {
          return response.ok ? response.json() : null;
        })
        .then(function (data) {
          if (data) {
            applyLiveData(data);
          }
        })
        .catch(function () {
          // Leave the last known good values in place.
        })
        .then(function () {
          inFlight = false;
        });
    }

    setInterval(poll, seconds * 1000);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        poll();
      }
    });
  }

  window.gotoArchive = function (prefix, value) {
    if (!value) {
      return;
    }
    window.location.href = prefix + value + ".html";
  };

  function setup() {
    initThemeToggle();
    startClock();
    initTabs();
    initLiveUpdates();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();
