/**
 * Tiny synthesized sounds for Giftaroo.
 * Every public method swallows errors so a tap never breaks
 * if Web Audio is missing, blocked, or mid-gesture rejected.
 */
(function (global) {
  "use strict";

  var KEY = "giftaroo.mute";
  var ctx = null;
  var muted = false;

  try {
    muted = global.localStorage.getItem(KEY) === "1";
  } catch (e) {
    muted = false;
  }

  function audioContext() {
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") {
      ctx.resume().catch(function () {});
    }
    return ctx;
  }

  function envGain(ac, t, dur, peak) {
    var g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + Math.min(0.03, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return g;
  }

  function tone(freq, dur, type, peak, delay, slide) {
    var ac = audioContext();
    if (!ac) return;
    var t = ac.currentTime + (delay || 0);
    var o = ac.createOscillator();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    var g = envGain(ac, t, dur, peak || 0.06);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function noise(dur, peak, delay, freq) {
    var ac = audioContext();
    if (!ac) return;
    var t = ac.currentTime + (delay || 0);
    var length = Math.max(1, Math.floor(ac.sampleRate * dur));
    var buf = ac.createBuffer(1, length, ac.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    var src = ac.createBufferSource();
    src.buffer = buf;
    var filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq || 1400, t);
    filter.Q.value = 0.7;
    var g = envGain(ac, t, dur, peak || 0.04);
    src.connect(filter);
    filter.connect(g);
    g.connect(ac.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  function safe(fn) {
    if (muted) return;
    try {
      fn();
    } catch (e) {
      /* sound is garnish — never block a tap */
    }
  }

  var api = {
    isMuted: function () {
      return muted;
    },
    setMuted: function (value) {
      muted = !!value;
      try {
        global.localStorage.setItem(KEY, muted ? "1" : "0");
      } catch (e) {}
      return muted;
    },
    toggle: function () {
      return api.setMuted(!muted);
    },
    tap: function () {
      safe(function () {
        tone(540, 0.07, "triangle", 0.05, 0, 720);
      });
    },
    select: function () {
      safe(function () {
        tone(620, 0.07, "sine", 0.05);
        tone(880, 0.09, "sine", 0.035, 0.045);
      });
    },
    suspense: function () {
      safe(function () {
        tone(196, 0.16, "sine", 0.045, 0);
        tone(196, 0.16, "sine", 0.05, 0.34);
        tone(247, 0.16, "sine", 0.05, 0.68);
        tone(294, 0.2, "triangle", 0.055, 1.02);
        noise(0.28, 0.035, 0.9, 900);
        noise(0.18, 0.05, 1.15, 1800);
      });
    },
    reveal: function () {
      safe(function () {
        noise(0.1, 0.06, 0, 2200);
        tone(523.25, 0.2, "triangle", 0.06, 0.02);
        tone(659.25, 0.22, "triangle", 0.06, 0.09);
        tone(783.99, 0.24, "triangle", 0.055, 0.16);
        tone(1046.5, 0.36, "sine", 0.05, 0.24);
      });
    },
    pop: function () {
      safe(function () {
        tone(240, 0.08, "sine", 0.04, 0, 90);
        tone(480, 0.1, "triangle", 0.045, 0.03);
      });
    }
  };

  global.GiftarooSound = api;
})(window);
