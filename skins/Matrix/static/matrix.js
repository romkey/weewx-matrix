/*
 * matrix.js -- behavior for the WeeWX "Matrix" skin.
 *   - Digital rain canvas backdrop
 *   - Live clock with blinking cursor
 *   - Day/Week/Month/Year plot tabs (history page)
 *   - Archive dropdown navigation
 *   - Small glitch/typewriter flourishes
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ *
   * Digital rain
   * ------------------------------------------------------------------ */
  function startRain() {
    var canvas = document.getElementById("rain");
    if (!canvas || reduceMotion) {
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
    setInterval(draw, 45);
  }

  /* ------------------------------------------------------------------ *
   * Live clock
   * ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------ *
   * History page: period tabs (day / week / month / year)
   * ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------ *
   * Archive dropdown navigation
   * ------------------------------------------------------------------ */
  window.gotoArchive = function (prefix, value) {
    if (!value) {
      return;
    }
    window.location.href = prefix + value + ".html";
  };

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  function setup() {
    startRain();
    startClock();
    initTabs();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();
