/*
 * shell.js -- interactive weather-station shell for the Matrix WeeWX skin.
 * Simulated Unix shell backed by cached JSON data. No server round-trips.
 */
(function () {
  "use strict";

  var THEME_KEY = "matrix-theme";
  var SPARK = " .:-=+*#%@";

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function lines() {
    return Array.prototype.slice.call(arguments).flat().filter(function (l) {
      return l !== undefined && l !== null;
    }).map(String);
  }

  function parseNum(v) {
    if (v === null || v === undefined || v === "") {
      return null;
    }
    if (typeof v === "number") {
      return v;
    }
    var n = parseFloat(String(v).replace(/[^0-9.+-]/g, ""));
    return isNaN(n) ? null : n;
  }

  function fmtTemp(n) {
    return n === null ? "N/A" : n.toFixed(1) + "°";
  }

  function Shell(rootEl) {
    this.root = rootEl;
    this.outputEl = document.getElementById("shell-output");
    this.inputEl = document.getElementById("shell-input");
    this.formEl = document.getElementById("shell-form");
    this.promptPathEl = document.getElementById("shell-prompt-path");
    this.cursorEl = document.getElementById("shell-cursor");
    this.dataUrl = rootEl.getAttribute("data-data-url") || "shell-data.json";
    this.seed = this.readSeedFromDom(rootEl);
    this.data = null;
    this.dataReady = false;
    this.dataLoading = false;
    this.cwd = "/";
    this.history = [];
    this.histIdx = -1;
    this.aliases = { ll: "ls -la", forecast: "oracle" };
    this.vfs = null;
    this.host = "weewx-matrix";

    this.buildVfsFrom(this.seed);
    this.host = this.seed.station.host_slug || this.host;
  }

  Shell.prototype.num = function (v) {
    if (v === null || v === undefined || v === "") {
      return null;
    }
    var n = Number(v);
    return isNaN(n) ? null : n;
  };

  Shell.prototype.readSeedFromDom = function (el) {
    var d = el.dataset;
    return {
      station: {
        location: d.stationLocation || "",
        hardware: d.stationHardware || "",
        version: d.stationVersion || "",
        os_uptime: d.stationOsUptime || "",
        weewx_uptime: d.stationWeewxUptime || "",
        skin: d.stationSkin || "",
        host_slug: d.host || "weewx-matrix"
      },
      current: {
        dateTime: d.currentDatetime || "",
        outTemp: this.num(d.currentOuttemp),
        outTemp_fmt: d.currentOuttempFmt || "",
        dewpoint_fmt: d.currentDewpointFmt || "",
        outHumidity: this.num(d.currentHumidity),
        outHumidity_fmt: d.currentHumidityFmt || "",
        barometer: this.num(d.currentBarometer),
        barometer_fmt: d.currentBarometerFmt || "",
        windSpeed: this.num(d.currentWindspeed),
        windSpeed_fmt: d.currentWindspeedFmt || "",
        windGust_fmt: d.currentWindgustFmt || "",
        windDir: this.num(d.currentWinddir),
        windDir_compass: d.currentWinddirCompass || "",
        rainRate: this.num(d.currentRainrate),
        rainRate_fmt: d.currentRainrateFmt || "",
        UV: this.num(d.currentUv),
        pm2_5: this.num(d.currentPm25)
      },
      trend: { barometer: d.trendBarometer || "" },
      aggregates: {
        day: {
          rain: this.num(d.dayRain),
          rain_fmt: d.dayRainFmt || "",
          outTemp_max: this.num(d.dayOuttempMax),
          outTemp_min: this.num(d.dayOuttempMin)
        },
        rainyear: { rain_fmt: d.rainyearRainFmt || "" }
      },
      nav_current: d.nav || "",
      default_theme: d.defaultTheme || "matrix"
    };
  };

  Shell.prototype.ensureData = function () {
    var self = this;
    if (this.dataReady) {
      return Promise.resolve(this.data);
    }
    if (this.dataLoading) {
      return new Promise(function (resolve) {
        var t = setInterval(function () {
          if (self.dataReady) {
            clearInterval(t);
            resolve(self.data);
          }
        }, 50);
      });
    }
    this.dataLoading = true;
    return fetch(this.dataUrl)
      .then(function (r) {
        if (!r.ok) {
          throw new Error("HTTP " + r.status);
        }
        return r.json();
      })
      .then(function (json) {
        self.data = json;
        self.dataReady = true;
        self.buildVfsFrom(json);
        return json;
      })
      .catch(function () {
        self.data = self.seed;
        self.dataReady = true;
        return self.seed;
      });
  };

  Shell.prototype.cur = function () {
    return (this.data || this.seed || {}).current || {};
  };

  Shell.prototype.station = function () {
    return (this.data || this.seed || {}).station || {};
  };

  Shell.prototype.agg = function (period) {
    var a = (this.data || this.seed || {}).aggregates || {};
    return a[period] || {};
  };

  Shell.prototype.isRaining = function () {
    var c = this.cur();
    return (c.rainRate !== null && c.rainRate > 0) || (this.agg("day").rain > 0 && c.rainRate > 0);
  };

  Shell.prototype.isCold = function () {
    var t = this.cur().outTemp;
    return t !== null && t < 5;
  };

  Shell.prototype.buildVfsFrom = function (src) {
    var days = (src.days || []).slice().reverse();
    var months = ((src.archive && src.archive.months) || []).slice();
    var years = ((src.archive && src.archive.years) || []).slice();
    var sensors = src.sensors || [];
    var self = this;

    function dir(name, children) {
      return { type: "dir", name: name, children: children || {} };
    }
    function file(name, content, meta) {
      return { type: "file", name: name, content: content, meta: meta || {} };
    }

    var dayFiles = {};
    days.forEach(function (d) {
      var body = [
        "# Daily log " + d.date,
        "temp_avg=" + (d.outTemp_avg_fmt || d.outTemp_avg),
        "temp_max=" + (d.outTemp_max_fmt || d.outTemp_max),
        "temp_min=" + (d.outTemp_min_fmt || d.outTemp_min),
        "rain=" + (d.rain_fmt || d.rain),
        "wind_avg=" + (d.wind_avg_fmt || d.wind_avg),
        "wind_max=" + (d.wind_max_fmt || d.wind_max),
        "humidity_avg=" + (d.humidity_avg_fmt || d.humidity_avg),
        "barometer_avg=" + (d.barometer_avg_fmt || d.barometer_avg)
      ].join("\n");
      dayFiles[d.date + ".log"] = file(d.date + ".log", body, { date: d.date, row: d });
    });

    var monthFiles = {};
    months.forEach(function (m) {
      monthFiles[m + ".log"] = file(m + ".log", "monthly archive index entry for " + m, { month: m });
    });

    var yearFiles = {};
    years.forEach(function (y) {
      yearFiles[y + ".log"] = file(y + ".log", "yearly archive index entry for " + y, { year: y });
    });

    var sensorFiles = {};
    sensors.forEach(function (s) {
      sensorFiles[s] = file(s, "sensor channel: " + s + " [online]");
    });

    var st = src.station || {};
    var cur = src.current || {};
    var records = src.records || {};

    this.vfs = {
      type: "dir",
      name: "/",
      children: {
        README: file("README", [
          "WeeWX Matrix Shell — read-only weather filesystem",
          "Station: " + (st.location || "unknown"),
          "Try: ls, cat current, wx, stats day, plot outTemp, help"
        ].join("\n")),
        current: file("current", this.formatCurrentText(cur, src.trend)),
        "station.conf": file("station.conf", [
          "location=" + (st.location || ""),
          "hardware=" + (st.hardware || ""),
          "latitude=" + (st.latitude || ""),
          "longitude=" + (st.longitude || ""),
          "altitude=" + (st.altitude || ""),
          "weewx_version=" + (st.version || "")
        ].join("\n")),
        days: dir("days", dayFiles),
        months: dir("months", monthFiles),
        years: dir("years", yearFiles),
        sensors: dir("sensors", sensorFiles),
        records: dir("records", {
          "outTemp.max": file("outTemp.max", records.outTemp_max ? JSON.stringify(records.outTemp_max, null, 2) : "no record"),
          "outTemp.min": file("outTemp.min", records.outTemp_min ? JSON.stringify(records.outTemp_min, null, 2) : "no record"),
          "rain.max": file("rain.max", records.rain_day ? JSON.stringify(records.rain_day, null, 2) : "no record"),
          "wind.max": file("wind.max", records.wind_max ? JSON.stringify(records.wind_max, null, 2) : "no record")
        }),
        dev: dir("dev", {
          rain0: file("rain0", "rain gauge device node"),
          temp0: file("temp0", "thermometer device node"),
          wind0: file("wind0", "anemometer device node"),
          null: file("null", "")
        }),
        proc: dir("proc", {
          uptime: file("uptime", (st.weewx_uptime || "unknown") + " weewx uptime"),
          version: file("version", st.version || ""),
          meminfo: file("meminfo", "MemTotal: 64000 kB\nMemFree: 42000 kB\nBuffers: archive.db")
        })
      }
    };
  };

  Shell.prototype.formatCurrentText = function (cur, trend) {
    trend = trend || {};
    return [
      "timestamp=" + (cur.dateTime || ""),
      "outTemp=" + (cur.outTemp_fmt || cur.outTemp),
      "dewpoint=" + (cur.dewpoint_fmt || ""),
      "humidity=" + (cur.outHumidity_fmt || cur.outHumidity),
      "barometer=" + (cur.barometer_fmt || cur.barometer),
      "wind=" + (cur.windSpeed_fmt || cur.windSpeed) + " @ " + (cur.windDir_compass || cur.windDir),
      "rainRate=" + (cur.rainRate_fmt || cur.rainRate),
      "trend=" + (trend.barometer || "")
    ].join("\n");
  };

  Shell.prototype.resolve = function (path) {
    var parts = path === "/" ? [] : path.replace(/\/+$/, "").split("/").filter(Boolean);
    var node = this.vfs;
    for (var i = 0; i < parts.length; i++) {
      if (!node || node.type !== "dir") {
        return null;
      }
      node = node.children[parts[i]];
    }
    return node;
  };

  Shell.prototype.resolvePath = function (base, target) {
    if (!target) {
      return base;
    }
    if (target.startsWith("/")) {
      return target.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
    }
    var stack = base === "/" ? [] : base.split("/").filter(Boolean);
    target.split("/").forEach(function (p) {
      if (p === "" || p === ".") {
        return;
      }
      if (p === "..") {
        stack.pop();
      } else {
        stack.push(p);
      }
    });
    return "/" + stack.join("/");
  };

  Shell.prototype.listDir = function (node, longForm) {
    if (!node || node.type !== "dir") {
      return lines("ls: not a directory");
    }
    var names = Object.keys(node.children).sort();
    if (!longForm) {
      return names;
    }
    var out = ["total " + names.length];
    names.forEach(function (n) {
      var child = node.children[n];
      var typ = child.type === "dir" ? "d" : "-";
      var size = child.type === "file" ? (child.content || "").length : 4096;
      out.push(typ + "rwxr-xr-x 1 guest guest " + String(size).padStart(6) + " Jan  1 00:00 " + n);
    });
    return out;
  };

  Shell.prototype.expandGlobs = function (pattern, cwd) {
    if (pattern.indexOf("*") === -1 && pattern.indexOf("?") === -1) {
      return [pattern];
    }
    var dirPart = pattern.includes("/") ? pattern.slice(0, pattern.lastIndexOf("/") + 1) : "";
    var base = pattern.slice(dirPart.length);
    var dirPath = this.resolvePath(cwd, dirPart || ".");
    var dirNode = this.resolve(dirPath);
    if (!dirNode || dirNode.type !== "dir") {
      return [pattern];
    }
    var rx = new RegExp("^" + base.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
    return Object.keys(dirNode.children).filter(function (n) {
      return rx.test(n);
    }).map(function (n) {
      return (dirPath === "/" ? "" : dirPath) + "/" + n;
    });
  };

  Shell.prototype.tokenize = function (input) {
    var tokens = [];
    var cur = "";
    var quote = null;
    for (var i = 0; i < input.length; i++) {
      var ch = input[i];
      if (quote) {
        if (ch === quote) {
          quote = null;
        } else {
          cur += ch;
        }
        continue;
      }
      if (ch === "'" || ch === '"') {
        quote = ch;
        continue;
      }
      if (/\s/.test(ch)) {
        if (cur) {
          tokens.push(cur);
          cur = "";
        }
        continue;
      }
      if (ch === "|") {
        if (cur) {
          tokens.push(cur);
          cur = "";
        }
        tokens.push("|");
        continue;
      }
      cur += ch;
    }
    if (cur) {
      tokens.push(cur);
    }
    return tokens;
  };

  Shell.prototype.parsePipeline = function (input) {
    var tokens = this.tokenize(input.trim());
    var stages = [];
    var cur = [];
    tokens.forEach(function (t) {
      if (t === "|") {
        stages.push(cur);
        cur = [];
      } else {
        cur.push(t);
      }
    });
    if (cur.length) {
      stages.push(cur);
    }
    return stages.map(function (stage) {
      var args = stage.slice();
      var cmd = args.shift() || "";
      var flags = {};
      var positional = [];
      args.forEach(function (a) {
        if (a.startsWith("-") && a.length > 1) {
          for (var j = 1; j < a.length; j++) {
            flags[a[j]] = true;
          }
        } else {
          positional.push(a);
        }
      });
      return { cmd: cmd, flags: flags, args: positional };
    });
  };

  Shell.prototype.print = function (textLines) {
    var self = this;
    textLines.forEach(function (line) {
      var div = document.createElement("div");
      div.className = "shell_line";
      div.textContent = line;
      self.outputEl.appendChild(div);
    });
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  };

  Shell.prototype.updateCursor = function () {
    if (!this.inputEl || !this.cursorEl) {
      return;
    }
    var input = this.inputEl;
    var pos = input.selectionStart;
    if (pos === null || pos === undefined) {
      pos = input.value.length;
    }
    var style = window.getComputedStyle(input);
    if (!this._cursorMeasure) {
      this._cursorMeasure = document.createElement("span");
      this._cursorMeasure.className = "shell_cursor_measure";
      this._cursorMeasure.setAttribute("aria-hidden", "true");
      input.parentNode.appendChild(this._cursorMeasure);
    }
    var measure = this._cursorMeasure;
    measure.style.font = style.font;
    measure.style.letterSpacing = style.letterSpacing;
    measure.textContent = input.value.substring(0, pos) || "\u200b";
    this.cursorEl.style.left = measure.offsetWidth + "px";
  };

  Shell.prototype.bindCursor = function () {
    var self = this;
    if (!this.inputEl || !this.cursorEl) {
      return;
    }
    var sync = function () {
      self.updateCursor();
    };
    ["input", "keydown", "keyup", "click", "focus", "blur", "select"].forEach(function (evt) {
      self.inputEl.addEventListener(evt, sync);
    });
    window.addEventListener("resize", sync);
    sync();
  };

  Shell.prototype.updatePrompt = function () {
    var display = this.cwd === "/" ? "/$" : this.cwd + "$";
    if (this.promptPathEl) {
      this.promptPathEl.textContent = display;
    }
  };

  Shell.prototype.zambretti = function () {
    var c = this.cur();
    var baro = c.barometer;
    var trend = ((this.data || this.seed).trend || {}).barometer || "";
    var wind = c.windDir || 0;
    if (baro === null) {
      return "oracle: insufficient barometer data";
    }
    var rising = /rising/i.test(trend);
    var falling = /falling/i.test(trend);
    var forecast = "Settled fine";
    if (baro < 980) {
      forecast = rising ? "Showers, then improving" : "Stormy, much rain";
    } else if (baro < 1000) {
      forecast = rising ? "Fine, becoming less settled" : "Rain at times";
    } else if (baro < 1020) {
      forecast = rising ? "Fine, possible showers" : "Mainly fine, some rain";
    } else {
      forecast = rising ? "Fine weather" : "Fine, likely dry";
    }
    if (wind >= 315 || wind < 45) {
      forecast += " (N wind)";
    } else if (wind < 135) {
      forecast += " (E wind)";
    } else if (wind < 225) {
      forecast += " (S wind)";
    } else {
      forecast += " (W wind)";
    }
    return forecast;
  };

  Shell.prototype.sparkline = function (obs, count) {
    var days = ((this.data || this.seed).days || []).slice(-(count || 14));
    var key = obs.indexOf("_fmt") >= 0 ? obs : obs + "_fmt";
    var vals = days.map(function (d) {
      return parseNum(d[key] !== undefined ? d[key] : d[obs]);
    }).filter(function (v) {
      return v !== null && v !== undefined;
    });
    if (!vals.length) {
      return "plot: no data for " + obs;
    }
    var min = Math.min.apply(null, vals);
    var max = Math.max.apply(null, vals);
    var range = max - min || 1;
    var bars = vals.map(function (v) {
      var idx = Math.round(((v - min) / range) * (SPARK.length - 1));
      return SPARK[idx];
    }).join("");
    return obs + " [" + min.toFixed(1) + ".." + max.toFixed(1) + "] " + bars;
  };

  Shell.prototype.runStage = function (stage, stdinLines) {
    var cmd = stage.cmd;
    var args = stage.args;
    var flags = stage.flags;
    var self = this;

    if (this.aliases[cmd]) {
      return this.run(this.aliases[cmd], stdinLines);
    }

    if (cmd === "sudo") {
      if (args.join(" ") === "make me a sandwich") {
        return lines("Okay.");
      }
      return lines("guest is not in the sudoers file. This incident will be reported.");
    }

    if (cmd === "rm" && args.join(" ") === "-rf /") {
      return this.rmrf();
    }

    if (cmd === "help") {
      return lines(
        "Weather: wx temp wind rain baro hum uv aqi stats records sensors plot oracle sun",
        "Files: ls cd pwd cat head tail grep sort wc find du file stat",
        "Shell: clear history man echo env whoami date uname which alias exit",
        "Try: cat days/*.log | grep rain | sort -n | head -5"
      );
    }

    if (cmd === "man") {
      var topic = args[0] || "help";
      return lines(topic + "(1)", "  Simulated weather shell command. No manual entry for mortals.");
    }

    if (cmd === "clear") {
      this.outputEl.innerHTML = "";
      return [];
    }

    if (cmd === "history") {
      return this.history.slice();
    }

    if (cmd === "echo") {
      return lines(args.join(" "));
    }

    if (cmd === "whoami") {
      return lines("guest");
    }

    if (cmd === "date") {
      return lines(this.cur().dateTime || new Date().toString());
    }

    if (cmd === "uname") {
      return lines("Matrix-OS weewx-matrix " + (this.station().version || "5.x") + " station-node");
    }

    if (cmd === "env") {
      return lines(
        "SHELL=/bin/matrixsh",
        "USER=guest",
        "HOME=/",
        "STATION=" + (this.station().location || ""),
        "PWD=" + this.cwd
      );
    }

    if (cmd === "which") {
      return lines("/bin/" + (args[0] || ""));
    }

    if (cmd === "alias") {
      var out = [];
      Object.keys(this.aliases).forEach(function (k) {
        out.push("alias " + k + "='" + self.aliases[k] + "'");
      });
      return out;
    }

    if (cmd === "exit") {
      this.print(["logout (not really — this is a weather page)"]);
      return [];
    }

    if (cmd === "pwd") {
      return lines(this.cwd);
    }

    if (cmd === "cd") {
      var target = args[0] || "/";
      var newPath = this.resolvePath(this.cwd, target);
      var node = this.resolve(newPath);
      if (!node) {
        return lines("cd: " + target + ": No such file or directory");
      }
      if (node.type !== "dir") {
        return lines("cd: not a directory");
      }
      this.cwd = newPath === "/" ? "/" : newPath.replace(/\/$/, "");
      this.updatePrompt();
      return [];
    }

    if (cmd === "ls") {
      var longForm = flags.l || flags.a;
      var path = args[0] || this.cwd;
      var abs = this.resolvePath(this.cwd, path);
      var node = this.resolve(abs);
      if (!node) {
        return lines("ls: cannot access '" + path + "': No such file or directory");
      }
      if (node.type === "file") {
        return lines(path.split("/").pop());
      }
      return this.listDir(node, longForm);
    }

    if (cmd === "cat") {
      if (!args.length && stdinLines.length) {
        return stdinLines;
      }
      var out = [];
      args.forEach(function (pat) {
        self.expandGlobs(pat, self.cwd).forEach(function (p) {
          var abs = self.resolvePath(self.cwd, p);
          var node = self.resolve(abs);
          if (!node) {
            out.push("cat: " + pat + ": No such file");
          } else if (node.type === "dir") {
            out.push("cat: " + pat + ": Is a directory");
          } else {
            out = out.concat((node.content || "").split("\n"));
          }
        });
      });
      return out;
    }

    if (cmd === "head") {
      var n = flags.n ? parseInt(args.shift(), 10) : 10;
      var src = stdinLines.length ? stdinLines : this.runStage({ cmd: "cat", args: args, flags: {} }, []);
      return src.slice(0, n);
    }

    if (cmd === "tail") {
      var tn = flags.n ? parseInt(args.shift(), 10) : 10;
      var srcT = stdinLines.length ? stdinLines : this.runStage({ cmd: "cat", args: args, flags: {} }, []);
      return srcT.slice(-tn);
    }

    if (cmd === "grep") {
      var srcG = stdinLines.length ? stdinLines : this.runStage({ cmd: "cat", args: args, flags: {} }, []);
      var pattern = args[0];
      if (!stdinLines.length) {
        args.shift();
      }
      if (!pattern && stdinLines.length) {
        pattern = args[0] || "";
      }
      var rxG = new RegExp(pattern, flags.i ? "i" : "");
      var filtered = srcG.filter(function (l) {
        var match = rxG.test(l);
        return flags.v ? !match : match;
      });
      if (flags.c) {
        return lines(String(filtered.length));
      }
      return filtered;
    }

    if (cmd === "sort") {
      var srcS = stdinLines.slice();
      srcS.sort(function (a, b) {
        if (flags.n) {
          return parseFloat(a) - parseFloat(b);
        }
        return a.localeCompare(b);
      });
      if (flags.r) {
        srcS.reverse();
      }
      return srcS;
    }

    if (cmd === "wc") {
      var srcW = stdinLines.length ? stdinLines : this.runStage({ cmd: "cat", args: args, flags: {} }, []);
      if (flags.l) {
        return lines(String(srcW.length));
      }
      return lines(String(srcW.length) + " lines");
    }

    if (cmd === "uniq") {
      var seen = {};
      return stdinLines.filter(function (l) {
        if (seen[l]) {
          return false;
        }
        seen[l] = true;
        return true;
      });
    }

    if (cmd === "cut") {
      var delim = "-";
      var field = 1;
      args.forEach(function (a, i) {
        if (a === "-d" && args[i + 1]) {
          delim = args[i + 1];
        }
        if (a === "-f" && args[i + 1]) {
          field = parseInt(args[i + 1], 10);
        }
      });
      return stdinLines.map(function (l) {
        var parts = l.split(delim);
        return parts[field - 1] || l;
      });
    }

    if (cmd === "find") {
      var nameArg = args[1] || args[0] || "*";
      var rootPath = args[0] && args[0].startsWith("-") ? this.cwd : (args[0] || this.cwd);
      var nodeF = this.resolve(this.resolvePath(this.cwd, rootPath));
      var hits = [];
      function walk(n, p) {
        if (!n) {
          return;
        }
        if (n.type === "file") {
          if (nameArg === "*" || n.name.indexOf(nameArg.replace(/\*/g, "")) >= 0) {
            hits.push(p);
          }
          return;
        }
        Object.keys(n.children).forEach(function (k) {
          walk(n.children[k], p + (p === "/" ? "" : "/") + k);
        });
      }
      walk(nodeF, this.resolvePath(this.cwd, rootPath));
      return hits;
    }

    if (cmd === "du") {
      return lines("4096\t/");
    }

    if (cmd === "file") {
      return args.map(function (a) {
        var n = self.resolve(self.resolvePath(self.cwd, a));
        if (!n) {
          return a + ": cannot open";
        }
        return a + ": " + (n.type === "dir" ? "directory" : "ASCII text");
      });
    }

    if (cmd === "stat") {
      return args.map(function (a) {
        return "  File: " + a + "\n  Size: " + ((self.resolve(self.resolvePath(self.cwd, a)) || {}).content || "").length;
      });
    }

    if (cmd === "wx") {
      var c = this.cur();
      if (flags["1"]) {
        return lines((c.outTemp_fmt || c.outTemp) + " " + (c.windSpeed_fmt || c.windSpeed));
      }
      return lines(
        "Station: " + (this.station().location || ""),
        "Time:    " + (c.dateTime || ""),
        "Temp:    " + (c.outTemp_fmt || c.outTemp),
        "Hum:     " + (c.outHumidity_fmt || c.outHumidity),
        "Baro:    " + (c.barometer_fmt || c.barometer) + " (" + ((this.data || this.seed).trend || {}).barometer + ")",
        "Wind:    " + (c.windSpeed_fmt || c.windSpeed) + " " + (c.windDir_compass || "")
      );
    }

    if (cmd === "temp") {
      return lines(this.cur().outTemp_fmt || this.cur().outTemp || "N/A");
    }
    if (cmd === "wind") {
      var cw = this.cur();
      return lines((cw.windSpeed_fmt || cw.windSpeed) + " @ " + (cw.windDir_compass || cw.windDir));
    }
    if (cmd === "rain") {
      return lines("rate=" + (this.cur().rainRate_fmt || this.cur().rainRate) + " today=" + (this.agg("day").rain_fmt || this.agg("day").rain));
    }
    if (cmd === "baro") {
      return lines((this.cur().barometer_fmt || this.cur().barometer) + " trend=" + ((this.data || this.seed).trend || {}).barometer);
    }
    if (cmd === "hum") {
      return lines(this.cur().outHumidity_fmt || this.cur().outHumidity || "N/A");
    }
    if (cmd === "uv") {
      return lines(this.cur().UV !== null ? String(this.cur().UV) : "N/A");
    }
    if (cmd === "aqi") {
      var pm = this.cur().pm2_5;
      if (pm === null) {
        return lines("no PM2.5 sensor");
      }
      return lines("PM2.5=" + pm + " (estimate only)");
    }

    if (cmd === "stats") {
      var period = args[0] || "day";
      var a = this.agg(period);
      return lines(
        "period=" + period,
        "rain=" + (a.rain_fmt || a.rain),
        "temp_max=" + a.outTemp_max,
        "temp_min=" + a.outTemp_min,
        "temp_avg=" + a.outTemp_avg
      );
    }

    if (cmd === "records") {
      var rec = (this.data || this.seed).records || {};
      return Object.keys(rec).map(function (k) {
        var r = rec[k];
        return r ? k + ": " + r.value + " @ " + r.time : k + ": (none)";
      });
    }

    if (cmd === "sensors") {
      return ((this.data || this.seed).sensors || []).map(function (s) {
        return "[online] " + s;
      });
    }

    if (cmd === "plot") {
      return lines(this.sparkline(args[0] || "outTemp_avg", parseInt(args[1], 10) || 14));
    }

    if (cmd === "oracle" || cmd === "forecast") {
      return lines(this.zambretti());
    }

    if (cmd === "dmesg") {
      var sens = (this.data || this.seed).sensors || ["outTemp", "barometer"];
      var boot = ["[0.000000] Matrix-OS boot: uplink nominal"];
      sens.forEach(function (s, i) {
        boot.push("[" + (i + 1) + ".000000] probe " + s + " registered");
      });
      return boot;
    }

    if (cmd === "df") {
      var dayCount = ((this.data || this.seed).days || []).length;
      return lines("Filesystem     1K-blocks  Used Available Use% Mounted on",
        "/dev/archive   " + (dayCount * 4) + "K  " + (dayCount * 3) + "K  " + dayCount + "K  75% /");
    }

    if (cmd === "traceroute") {
      var ws = this.cur().windSpeed || 5;
      return lines(
        "traceroute to troposphere (10.0.0.1), 5 hops max",
        " 1  anemometer.local (" + ws.toFixed(1) + "ms)",
        " 2  rain-gauge.local (" + (ws * 2).toFixed(1) + "ms)",
        " 3  jet-stream.local (" + (ws * 5).toFixed(1) + "ms)",
        " 4  troposphere.local (" + (ws * 10).toFixed(1) + "ms)",
        " 5  * * *"
      );
    }

    if (cmd === "sun" || cmd === "moon" || cmd === "almanac") {
      return lines(cmd + ": almanac module not installed on this node (check weewx.conf [Almanac])");
    }

    if (cmd === "ps") {
      var ps = ["  PID TTY          TIME CMD", "    1 ?        00:00:01 weewx", "    2 ?        00:00:00 matrixsh"];
      if (this.isRaining()) {
        ps.push("  133 ?        00:00:42 rain.js");
      }
      if (this.isCold()) {
        ps.push("  451 ?        00:00:12 heater");
      }
      return ps;
    }

    if (cmd === "top") {
      return lines("Tasks: 3 total, 1 running, 2 sleeping", "  PID USER  %CPU COMMAND", "    1 guest  0.1 weewx", "    2 guest  0.0 matrixsh");
    }

    if (cmd === "kill") {
      if (args[0] === "rain") {
        return this.isRaining()
          ? lines("kill: rain: Operation not permitted (kernel weather subsystem)")
          : lines("kill: rain: no such process");
      }
      return lines("kill: " + (args[0] || "") + ": no such process");
    }

    if (cmd === "apt" && args[0] === "install") {
      var pkg = args[1] || "";
      if (pkg === "rain") {
        return this.isRaining()
          ? lines("rain is already the newest version.")
          : lines("E: Unable to locate package rain");
      }
      return lines("E: Unable to locate package " + pkg);
    }

    if (cmd === "fortune") {
      var fortunes = [
        "Red sky at night, sailor's delight.",
        "The matrix has you.",
        "There is no spoon — only barometric pressure.",
        "Follow the white rabbit to the history page."
      ];
      if (this.isRaining()) {
        fortunes.unshift("Into each life a little rain must fall.");
      }
      if (this.isCold()) {
        fortunes.unshift("Cold hands, warm barometer.");
      }
      return lines(fortunes[Math.floor(Math.random() * fortunes.length)]);
    }

    if (cmd === "cowsay") {
      var msg = args.join(" ") || "moo";
      return lines(
        " " + "_".repeat(msg.length + 2),
        "< " + msg + " >",
        " " + "-".repeat(msg.length + 2),
        "        \\   ^__^",
        "         \\  (oo)\\_______",
        "            (__)\\       )\\/\\",
        "                ||----w |",
        "                ||     ||"
      );
    }

    if (cmd === "sl") {
      return lines("    (  )____(  )", "   (  )    (  )   CHOO CHOO", "  (  )________(  )");
    }

    if (cmd === "yes") {
      return lines("yes");
    }

    if (cmd === "vim" || cmd === "vi" || cmd === "emacs" || cmd === "nano") {
      return lines(cmd + ": weather data is read-only. Try :wq anyway?");
    }

    if (cmd === ":wq" || cmd === ":q!" || cmd === ":q") {
      return lines("There is nothing to write. Weather persists.");
    }

    if (cmd === "xyzzy") {
      return lines("Nothing happens. (Try 'plugh')");
    }

    if (cmd === "42") {
      return lines("The Answer to the Ultimate Question of Life, the Universe, and Weather.");
    }

    if (cmd === "tea" || cmd === "coffee") {
      return lines("418 I'm a teapot — but the barometer is fine.");
    }

    if (cmd === "hack" && args[0] === "the" && args[1] === "planet") {
      return lines("Access granted to /weather. Just kidding. Read-only.");
    }

    if (cmd === "chmod") {
      return lines("chmod: /weather: Operation not permitted");
    }

    if (cmd === ":(){ :|:& };:") {
      return lines("nice try. fork bomb defused by the Oracle.");
    }

    if (cmd === "star" && args[0] === "wars") {
      return lines("Episode IV: A New Hope... for clear skies.");
    }

    if (cmd === "wake" && args[0] === "up") {
      return lines("The Matrix has you... check the barometer.");
    }
    if (cmd === "follow" && args[0] === "the" && args[1] === "white" && args[2] === "rabbit") {
      return lines("Knock knock, Neo. Try: cd archive");
    }
    if (cmd === "there" && args[0] === "is" && args[1] === "no" && args[2] === "spoon") {
      return lines("Exactly. There is only data.");
    }
    if (cmd === "red" && args[0] === "pill") {
      window.MatrixTheme && window.MatrixTheme.set("matrix");
      return lines("Welcome to the real world. Digital rain enabled.");
    }
    if (cmd === "blue" && args[0] === "pill") {
      window.MatrixTheme && window.MatrixTheme.set("safe");
      return lines("Ignorance is bliss. Safe Mode enabled.");
    }
    if (cmd === "neo" || cmd === "morpheus" || cmd === "trinity" || cmd === "smith" || cmd === "zion") {
      return lines(cmd + ": the One is busy decoding METAR.");
    }
    if (cmd === "glitch") {
      document.body.classList.add("shell-glitch");
      setTimeout(function () { document.body.classList.remove("shell-glitch"); }, 600);
      return lines("... reality buffer flushed ...");
    }
    if (cmd === "dodge") {
      return lines("There is no bullet. Only precipitation.");
    }

    if (cmd.startsWith(">") || args.some(function (a) { return a.startsWith(">"); })) {
      return lines("shell: read-only filesystem");
    }

    if (!cmd) {
      return stdinLines;
    }

    return lines(cmd + ": command not found (try 'help')");
  };

  Shell.prototype.rmrf = function () {
    var self = this;
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      return lines("rm: it is dangerous to perform operations on '/' while the weather is watching.");
    }
    this.print(["rm: removing / ...", "rm: removing /days ...", "rm: removing /current ..."]);
    document.documentElement.classList.add("rmrf-active");
    setTimeout(function () {
      self.print(["kernel panic - not syncing: weather subsystem destroyed"]);
    }, 1200);
    setTimeout(function () {
      document.documentElement.classList.remove("rmrf-active");
      document.documentElement.classList.add("rmrf-reboot");
      self.print(["INIT: rebooting MATRIX_OS ...", "INIT: restoring weather from archive ...", "OK: uplink restored."]);
    }, 2800);
    setTimeout(function () {
      document.documentElement.classList.remove("rmrf-reboot");
    }, 4200);
    return [];
  };

  Shell.prototype.run = function (input, stdinLines) {
    stdinLines = stdinLines || [];
    var stages = this.parsePipeline(input);
    var out = stdinLines;
    for (var i = 0; i < stages.length; i++) {
      out = this.runStage(stages[i], out);
    }
    return out;
  };

  Shell.prototype.onSubmit = function (input) {
    var trimmed = input.trim();
    if (!trimmed) {
      return;
    }
    this.history.push(trimmed);
    this.histIdx = this.history.length;
    this.print(["guest@" + this.host + ":" + (this.cwd === "/" ? "/$" : this.cwd + "$") + " " + trimmed]);
    var self = this;
    this.ensureData().then(function () {
      var result = self.run(trimmed);
      if (result.length) {
        self.print(result);
      }
    });
  };

  Shell.prototype.bind = function () {
    var self = this;
    this.updatePrompt();
    this.bindCursor();

    this.formEl.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = self.inputEl.value;
      self.inputEl.value = "";
      self.updateCursor();
      self.onSubmit(val);
    });

    this.inputEl.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (self.histIdx > 0) {
          self.histIdx--;
          self.inputEl.value = self.history[self.histIdx] || "";
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (self.histIdx < self.history.length - 1) {
          self.histIdx++;
          self.inputEl.value = self.history[self.histIdx] || "";
        } else {
          self.histIdx = self.history.length;
          self.inputEl.value = "";
        }
      } else if (e.key === "l" && e.ctrlKey) {
        e.preventDefault();
        self.outputEl.innerHTML = "";
      } else if (e.key === "c" && e.ctrlKey) {
        e.preventDefault();
        self.print(["^C"]);
        self.inputEl.value = "";
      } else if (e.key === "u" && e.ctrlKey) {
        e.preventDefault();
        self.inputEl.value = "";
      } else if (e.key === "Tab") {
        e.preventDefault();
        var val = self.inputEl.value;
        var parts = val.split(/\s+/);
        var partial = parts[parts.length - 1] || "";
        var cmds = ["help","ls","cd","cat","wx","temp","wind","rain","grep","plot","oracle","clear","history","man","sudo","rm"];
        var matches = cmds.filter(function (c) { return c.indexOf(partial) === 0; });
        if (matches.length === 1) {
          parts[parts.length - 1] = matches[0];
          self.inputEl.value = parts.join(" ") + (parts.length === 1 ? " " : "");
        }
      }
    });
  };

  function initShell() {
    var el = document.querySelector("[data-shell]");
    if (!el || document.documentElement.dataset.theme === "safe") {
      return;
    }
    var shell = new Shell(el);
    shell.bind();
    window.MatrixShell = shell;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initShell, { once: true });
  } else {
    initShell();
  }
})();
