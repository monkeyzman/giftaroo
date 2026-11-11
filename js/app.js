(function () {
  "use strict";

  var CONFIG = window.WRAPT_CONFIG || { brandName: "Giftaroo", affiliateTag: "giftaroo-20" };
  var BRAND = CONFIG.brandName || "Giftaroo";
  var TAG = CONFIG.affiliateTag || "giftaroo-20";

  var BUDGETS = [
    { id: "15", label: "$15", sub: "Little treats & stocking stuffers" },
    { id: "25", label: "$25", sub: "The sweet spot for most people" },
    { id: "50", label: "$50", sub: "A gift that feels substantial" },
    { id: "100", label: "$100", sub: "Go-big, still under a hundred" },
  ];
  var LIMITS = [
    { id: "20", label: "$20", sub: "A small office-friendly gift" },
    { id: "25", label: "$25", sub: "A little more room to delight" },
  ];
  var GENDERS = [
    { id: "him", label: "For him", sub: "Skips women’s gifts" },
    { id: "her", label: "For her", sub: "Skips men’s gifts" },
    { id: "anyone", label: "Anyone", sub: "A little of everything" },
  ];
  var RECIPIENTS = [
    { id: "me", label: "Me", sub: "A treat for yourself" },
    { id: "friend", label: "A friend", sub: "Fun, easy, and a little surprising" },
    { id: "partner", label: "A partner", sub: "Thoughtful, maybe a bit romantic" },
    { id: "kid", label: "A kid", sub: "Playful and age-appropriate" },
    { id: "parent", label: "A parent", sub: "Useful, cozy, or quietly special" },
    { id: "coworker", label: "A coworker", sub: "Office-friendly and not too personal" },
  ];
  var VIBES = [
    { id: "gamer", label: "Gamer" },
    { id: "cozy", label: "Cozy" },
    { id: "foodie", label: "Foodie" },
    { id: "tech", label: "Tech" },
    { id: "outdoors", label: "Outdoors" },
    { id: "collector", label: "Collector" },
    { id: "beauty", label: "Beauty" },
    { id: "surprise", label: "Surprise me" },
  ];

  var state = {
    step: 1,
    budget: null,
    priceMax: null,
    gender: null,
    recipient: null,
    vibe: null,
    secretSanta: false,
    catalog: [],
    current: null,
    shown: [],
    rerollUsed: false,
    shared: null,
    lockedProduct: null,
  };

  function $(id) { return document.getElementById(id); }

  function christmasOn() {
    return CONFIG.christmasMode !== false && CONFIG.christmasMode !== "false";
  }

  function stepCount() {
    return state.secretSanta ? 2 : 4;
  }

  function applyBrand() {
    document.title = BRAND + " — mystery gifts";
    document.querySelectorAll("[data-brand]").forEach(function (n) {
      n.textContent = BRAND;
    });
  }

  function shipMessage(dateStr) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
    if (!match) return "Order soon so Amazon standard shipping arrives before Christmas.";
    var target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var diff = Math.round((target.getTime() - today.getTime()) / 86400000);
    var label = target.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (diff > 1) return diff + " days left to order for Amazon standard shipping before Christmas (" + label + ").";
    if (diff === 1) return "Tomorrow is the last day for Amazon standard shipping before Christmas (" + label + ").";
    if (diff === 0) return "Today is the last day for Amazon standard shipping before Christmas.";
    return "Amazon’s standard-shipping cutoff (" + label + ") has passed — check delivery dates on Amazon.";
  }

  function mountSnow() {
    var snow = $("snow");
    if (!snow) return;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      snow.hidden = true;
      return;
    }
    snow.hidden = false;
    if (snow.childElementCount) return;
    for (var i = 0; i < 22; i++) {
      var flake = document.createElement("span");
      flake.className = "flake";
      flake.textContent = i % 3 === 0 ? "❄" : "•";
      flake.style.left = Math.random() * 100 + "%";
      flake.style.animationDuration = 7 + Math.random() * 9 + "s";
      flake.style.animationDelay = -Math.random() * 12 + "s";
      flake.style.fontSize = 7 + Math.random() * 6 + "px";
      flake.style.opacity = String(0.28 + Math.random() * 0.28);
      snow.appendChild(flake);
    }
  }

  function applyChristmas() {
    var on = christmasOn();
    document.body.classList.toggle("is-christmas", on);
    var banner = $("shipBanner");
    var santa = $("secretSantaBtn");
    if (!on) {
      if (banner) banner.hidden = true;
      if (santa) santa.hidden = true;
      if ($("snow")) $("snow").hidden = true;
      return;
    }
    if (banner) {
      banner.hidden = false;
      banner.textContent = shipMessage(CONFIG.lastShipDate || "2026-12-18");
    }
    if (santa) santa.hidden = false;
    mountSnow();
  }

  function showView(id) {
    ["view-home", "view-quiz", "view-wrap", "view-reveal"].forEach(function (vid) {
      var el = $(vid);
      if (!el) return;
      var on = vid === id;
      el.hidden = !on;
      el.classList.toggle("is-active", on);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function amazonUrl(asin) {
    return "https://www.amazon.com/dp/" + encodeURIComponent(asin) + "?tag=" + encodeURIComponent(TAG);
  }

  function imageUrls(product) {
    var urls = [];
    if (product.image) urls.push(product.image);
    urls.push("https://m.media-amazon.com/images/P/" + product.asin + ".01._SCLZZZZZZZ_.jpg");
    urls.push("https://images-na.ssl-images-amazon.com/images/P/" + product.asin + ".01._SCLZZZZZZZ_.jpg");
    return urls.filter(function (u, i) { return urls.indexOf(u) === i; });
  }

  function loadImage(img, product) {
    var urls = imageUrls(product);
    var i = 0;
    var token = 0;
    var fallback = $("imageFallback");
    fallback.hidden = true;
    img.style.display = "block";
    img.referrerPolicy = "no-referrer";
    function tryNext() {
      var my = ++token;
      if (i >= urls.length) {
        img.style.display = "none";
        fallback.hidden = false;
        img.removeAttribute("src");
        return;
      }
      img.onload = function () {
        if (my !== token) return;
        if (img.naturalWidth < 40 || img.naturalHeight < 40) {
          i += 1;
          tryNext();
          return;
        }
        fallback.hidden = true;
        img.style.display = "block";
      };
      img.onerror = function () {
        if (my !== token) return;
        i += 1;
        tryNext();
      };
      img.src = urls[i];
    }
    tryNext();
  }

  function genderOk(product, gender) {
    if (!gender || gender === "anyone") return true;
    var g = product.gender || "unisex";
    if (gender === "him") return g === "him" || g === "unisex";
    if (gender === "her") return g === "her" || g === "unisex";
    return true;
  }

  function matches(product, opts) {
    if (opts.priceMax != null) {
      if (Number(product.approxPrice) > Number(opts.priceMax)) return false;
    } else if (opts.budget && product.budget !== opts.budget) {
      return false;
    }
    if (!genderOk(product, opts.gender)) return false;
    if (opts.recipient && product.recipients.indexOf(opts.recipient) === -1) return false;
    if (opts.vibe && opts.vibe !== "surprise" && product.vibes.indexOf(opts.vibe) === -1) return false;
    if (opts.exclude && opts.exclude.indexOf(product.asin) !== -1) return false;
    return true;
  }

  function pickProduct() {
    var base = {
      budget: state.secretSanta ? null : state.budget,
      priceMax: state.secretSanta ? state.priceMax : null,
      gender: state.gender,
      exclude: state.shown,
    };
    var pools = [
      Object.assign({ recipient: state.recipient, vibe: state.vibe }, base),
      Object.assign({ recipient: state.recipient, vibe: "surprise" }, base),
      Object.assign({ recipient: null, vibe: state.vibe }, base),
      Object.assign({ recipient: null, vibe: "surprise" }, base),
    ];
    for (var i = 0; i < pools.length; i++) {
      var found = state.catalog.filter(function (p) { return matches(p, pools[i]); });
      if (found.length) {
        var withImg = found.filter(function (p) {
          return p.image && p.image.indexOf("assets/") === 0;
        });
        if (withImg.length) found = withImg;
        return found[Math.floor(Math.random() * found.length)];
      }
    }
    return null;
  }

  function currentList() {
    if (state.secretSanta) return state.step === 1 ? LIMITS : GENDERS;
    if (state.step === 1) return BUDGETS;
    if (state.step === 2) return GENDERS;
    if (state.step === 3) return RECIPIENTS;
    return VIBES;
  }

  function currentSelected() {
    if (state.secretSanta) {
      return state.step === 1 ? (state.priceMax ? String(state.priceMax) : null) : state.gender;
    }
    if (state.step === 1) return state.budget;
    if (state.step === 2) return state.gender;
    if (state.step === 3) return state.recipient;
    return state.vibe;
  }

  function selectionReady() {
    return !!currentSelected();
  }

  function renderChoices() {
    var step = state.step;
    var list = currentList();
    var selected = currentSelected();
    var title = "What’s the budget?";
    var sub = "Prices are approximate and can change.";
    if (state.secretSanta && step === 1) {
      title = "What’s the Secret Santa limit?";
      sub = "We’ll stay at or under this, and keep it office-friendly.";
    } else if ((state.secretSanta && step === 2) || (!state.secretSanta && step === 2)) {
      title = "For him, for her, or anyone?";
      sub = "For him skips women’s gifts. For her skips men’s gifts.";
    } else if (!state.secretSanta && step === 3) {
      title = "Who’s it for?";
      sub = "We’ll keep the pick appropriate for them.";
    } else if (!state.secretSanta && step === 4) {
      title = "What vibe?";
      sub = "One vibe is plenty. Or let us surprise you.";
    }
    $("stepKicker").textContent = "Step " + step + " of " + stepCount();
    $("stepTitle").textContent = title;
    $("stepSub").textContent = sub;
    var cols = list === RECIPIENTS || list === VIBES;
    $("choices").className = "choices" + (cols ? " cols-2" : "");
    $("choices").innerHTML = "";
    list.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (selected === item.id ? " is-selected" : "");
      btn.setAttribute("aria-pressed", selected === item.id ? "true" : "false");
      btn.dataset.id = item.id;
      btn.innerHTML = item.sub
        ? item.label + "<small>" + item.sub + "</small>"
        : item.label;
      btn.addEventListener("click", function () {
        if (state.secretSanta) {
          if (step === 1) state.priceMax = Number(item.id);
          if (step === 2) state.gender = item.id;
        } else if (step === 1) state.budget = item.id;
        else if (step === 2) state.gender = item.id;
        else if (step === 3) state.recipient = item.id;
        else state.vibe = item.id;
        renderChoices();
      });
      $("choices").appendChild(btn);
    });
    var progress = $("progress");
    progress.innerHTML = "";
    for (var d = 1; d <= stepCount(); d++) {
      var dot = document.createElement("span");
      dot.className = "dot" + (d <= step ? " is-on" : "");
      dot.setAttribute("data-step-dot", String(d));
      progress.appendChild(dot);
    }
    $("backStepBtn").hidden = false;
    $("nextStepBtn").disabled = !selectionReady();
    $("nextStepBtn").textContent = step === stepCount() ? "Wrap it up" : "Continue";
  }

  function genderPhrase() {
    if (state.gender === "him") return "for him";
    if (state.gender === "her") return "for her";
    return "for anyone";
  }

  function wrapLabel() {
    if (state.secretSanta) {
      return "Secret Santa · under $" + state.priceMax + " · " + genderPhrase();
    }
    var budget = BUDGETS.find(function (b) { return b.id === state.budget; });
    var who = RECIPIENTS.find(function (r) { return r.id === state.recipient; });
    var vibe = VIBES.find(function (v) { return v.id === state.vibe; });
    var whoText = state.recipient === "me" ? "you" : (who ? who.label.toLowerCase() : "someone");
    var vibeText = state.vibe === "surprise" ? "a surprise vibe" : (vibe ? "a " + vibe.label.toLowerCase() + " vibe" : "a surprise");
    return (budget ? budget.label : "") + " · " + genderPhrase() + " · for " + whoText + " · " + vibeText;
  }

  function resetGiftBox() {
    var gift = $("gift");
    gift.classList.remove("is-shaking", "is-open");
    $("unwrapHint").textContent = "Give the box a tap";
    $("giftHit").disabled = false;
  }

  function resetWrapCopy() {
    $("wrapEyebrow").textContent = "Your mystery gift is ready";
    $("wrapTitle").textContent = "Tap to unwrap";
    $("wrapNote").hidden = true;
    $("wrapNote").textContent = "";
  }

  function goWrap() {
    state.shown = [];
    state.rerollUsed = false;
    state.current = null;
    state.shared = null;
    state.lockedProduct = null;
    resetWrapCopy();
    $("wrapMeta").textContent = wrapLabel();
    resetGiftBox();
    showView("view-wrap");
  }

  function showProduct(product) {
    state.current = product;
    if (state.shown.indexOf(product.asin) === -1) state.shown.push(product.asin);
    $("productName").textContent = product.name;
    $("productPrice").textContent = "About $" + product.approxPrice;
    $("productWhy").textContent = product.why;
    $("productImage").alt = product.name;
    loadImage($("productImage"), product);
    var link = $("amazonBtn");
    link.href = amazonUrl(product.asin);
    link.setAttribute("aria-label", "Get " + product.name + " on Amazon");
    var shared = !!state.shared;
    $("rerollBtn").hidden = shared || state.rerollUsed;
    $("rerollBtn").disabled = false;
    $("rerollBtn").textContent = "Try one more (free reroll)";
    $("shareBtn").hidden = shared;
    $("shareSheet").hidden = true;
    $("shareStatus").textContent = "";
    $("shareUrl").hidden = true;
    $("againBtn").hidden = shared;
    $("makeOwnBtn").hidden = !shared;
    var note = $("revealNote");
    if (shared && (state.shared.from || state.shared.note)) {
      var bits = [];
      if (state.shared.from) bits.push("From " + state.shared.from);
      if (state.shared.note) bits.push("“" + state.shared.note + "”");
      note.hidden = false;
      note.textContent = bits.join(" — ");
      $("revealKicker").textContent = state.shared.from ? "A gift from " + state.shared.from : "You unwrapped…";
    } else {
      note.hidden = true;
      note.textContent = "";
      $("revealKicker").textContent = "You unwrapped…";
    }
  }

  function unwrap() {
    var gift = $("gift");
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("giftHit").disabled = true;
    $("unwrapHint").textContent = "Tearing the paper…";
    var product = state.lockedProduct || pickProduct();
    if (!product) {
      $("unwrapHint").textContent = "We couldn’t find a match. Try different picks.";
      $("giftHit").disabled = false;
      return;
    }
    function reveal() {
      gift.classList.remove("is-shaking");
      gift.classList.add("is-open");
      showProduct(product);
      burstConfetti();
      setTimeout(function () { showView("view-reveal"); }, reduced ? 50 : 550);
    }
    if (reduced) {
      reveal();
      return;
    }
    gift.classList.add("is-shaking");
    setTimeout(reveal, 720);
  }

  function reroll() {
    if (state.rerollUsed || state.shared) return;
    var product = pickProduct();
    if (!product) {
      $("rerollBtn").textContent = "That’s all for this combo";
      $("rerollBtn").disabled = true;
      state.rerollUsed = true;
      return;
    }
    state.rerollUsed = true;
    showProduct(product);
    burstConfetti();
    $("rerollBtn").hidden = true;
  }

  function clip(value, max) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
  }

  function buildShareUrl(product, from, note) {
    var parts = ["gift=" + encodeURIComponent(product.asin || product.id)];
    if (from) parts.push("from=" + encodeURIComponent(from));
    if (note) parts.push("note=" + encodeURIComponent(note));
    var base = window.location.href.split("#")[0];
    return base + "#" + parts.join("&");
  }

  function parseShare(hash) {
    var raw = (hash == null ? window.location.hash : hash).replace(/^#/, "");
    if (!raw) return null;
    var params = new URLSearchParams(raw);
    var gift = params.get("gift");
    if (!gift) return null;
    return {
      gift: gift,
      from: clip(params.get("from"), 40),
      note: clip(params.get("note"), 140),
    };
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopy(text);
      });
    }
    return fallbackCopy(text);
  }

  function fallbackCopy(text) {
    return new Promise(function (resolve) {
      var field = $("shareUrl");
      field.hidden = false;
      field.value = text;
      field.focus();
      field.select();
      try { document.execCommand("copy"); } catch (e) { /* still show the link */ }
      resolve();
    });
  }

  function sendShare() {
    if (!state.current) return;
    var from = clip($("shareFrom").value, 40);
    var note = clip($("shareNote").value, 140);
    var url = buildShareUrl(state.current, from, note);
    var field = $("shareUrl");
    field.hidden = false;
    field.value = url;
    var text = (from ? from + " wrapped you a mystery gift." : "A mystery gift is waiting for you.");
    if (note) text += " “" + note + "”";
    var status = $("shareStatus");
    if (navigator.share) {
      navigator.share({ title: BRAND + " mystery gift", text: text, url: url }).then(function () {
        status.textContent = "Shared. They’ll unwrap this exact gift.";
      }).catch(function (err) {
        if (err && err.name === "AbortError") {
          status.textContent = "Link ready whenever you want to send it.";
          return;
        }
        copyText(url).then(function () {
          status.textContent = "Link copied. Send it whenever you’re ready.";
        });
      });
      return;
    }
    copyText(url).then(function () {
      status.textContent = "Link copied. Send it whenever you’re ready.";
    });
  }

  function openShared(share) {
    state.shared = share;
    state.secretSanta = false;
    state.lockedProduct = null;
    var product = state.catalog.find(function (p) {
      return p.asin === share.gift || p.id === share.gift;
    });
    if (!product) {
      $("shareMiss").hidden = false;
      showView("view-home");
      return;
    }
    $("shareMiss").hidden = true;
    state.lockedProduct = product;
    resetGiftBox();
    $("wrapEyebrow").textContent = "A surprise for you";
    $("wrapTitle").textContent = "Tap to unwrap";
    $("wrapMeta").textContent = share.from ? share.from + " sent you a mystery gift" : "A mystery gift is waiting";
    var note = $("wrapNote");
    if (share.note) {
      note.hidden = false;
      note.textContent = "“" + share.note + "”";
    } else {
      note.hidden = true;
      note.textContent = "";
    }
    showView("view-wrap");
  }

  function clearShareHash() {
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }

  /* --- confetti --- */
  var confettiPieces = [];
  var confettiRaf = null;

  function burstConfetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var canvas = $("confetti");
    var ctx = canvas.getContext("2d");
    var dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var colors = ["#9c2f3b", "#c4a15a", "#2f5b49", "#fffaf3", "#e0c57a", "#7d2430"];
    var cx = window.innerWidth / 2;
    var cy = window.innerHeight * 0.38;
    confettiPieces = [];
    for (var i = 0; i < 90; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 3 + Math.random() * 8;
      confettiPieces.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        w: 6 + Math.random() * 7,
        h: 8 + Math.random() * 8,
        color: colors[i % colors.length],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 0,
      });
    }
    if (confettiRaf) cancelAnimationFrame(confettiRaf);
    function tick() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      var alive = false;
      confettiPieces.forEach(function (p) {
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18;
        p.vx *= 0.99;
        p.rot += p.vr;
        if (p.y < window.innerHeight + 20 && p.life < 180) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = Math.max(0, 1 - p.life / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });
      if (alive) {
        confettiRaf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        confettiRaf = null;
      }
    }
    confettiRaf = requestAnimationFrame(tick);
  }

  function startOver() {
    state.step = 1;
    state.budget = null;
    state.priceMax = null;
    state.gender = null;
    state.recipient = null;
    state.vibe = null;
    state.secretSanta = false;
    state.current = null;
    state.shown = [];
    state.rerollUsed = false;
    state.shared = null;
    state.lockedProduct = null;
    $("shareMiss").hidden = true;
    resetWrapCopy();
    clearShareHash();
    showView("view-home");
  }

  function beginQuiz(secretSanta) {
    state.secretSanta = !!secretSanta;
    state.step = 1;
    state.budget = null;
    state.priceMax = null;
    state.gender = null;
    state.shared = null;
    state.lockedProduct = null;
    state.shown = [];
    state.rerollUsed = false;
    if (secretSanta) {
      state.recipient = "coworker";
      state.vibe = "surprise";
    } else {
      state.recipient = null;
      state.vibe = null;
    }
    clearShareHash();
    renderChoices();
    showView("view-quiz");
  }

  function bind() {
    $("startBtn").addEventListener("click", function () { beginQuiz(false); });
    $("secretSantaBtn").addEventListener("click", function () { beginQuiz(true); });
    $("brandBtn").addEventListener("click", startOver);
    $("backStepBtn").addEventListener("click", function () {
      if (state.step === 1) {
        showView("view-home");
        return;
      }
      state.step -= 1;
      renderChoices();
    });
    $("nextStepBtn").addEventListener("click", function () {
      if (state.step < stepCount()) {
        state.step += 1;
        renderChoices();
        return;
      }
      goWrap();
    });
    $("giftHit").addEventListener("click", unwrap);
    $("rerollBtn").addEventListener("click", reroll);
    $("againBtn").addEventListener("click", startOver);
    $("makeOwnBtn").addEventListener("click", startOver);
    $("shareBtn").addEventListener("click", function () {
      $("shareSheet").hidden = false;
      $("shareFrom").focus();
    });
    $("shareGoBtn").addEventListener("click", sendShare);
  }

  function validateCatalog(data) {
    if (!Array.isArray(data) || !data.length) throw new Error("Catalog is empty");
    data.forEach(function (p, i) {
      if (!p.asin || !p.name || !p.budget || !p.why) {
        throw new Error("Bad product at " + i);
      }
      if (!p.gender) p.gender = "unisex";
      if (p.gender !== "him" && p.gender !== "her" && p.gender !== "unisex") {
        throw new Error("Bad gender at " + i);
      }
    });
    return data;
  }

  applyBrand();
  applyChristmas();
  bind();
  $("startBtn").disabled = true;
  $("secretSantaBtn").disabled = true;

  window.addEventListener("hashchange", function () {
    if (!state.catalog.length) return;
    var share = parseShare();
    if (share) openShared(share);
  });

  fetch("data/products.json")
    .then(function (res) {
      if (!res.ok) throw new Error("Could not load products.json (" + res.status + ")");
      return res.json();
    })
    .then(function (data) {
      state.catalog = validateCatalog(data);
      $("startBtn").disabled = false;
      $("secretSantaBtn").disabled = false;
      var share = parseShare();
      if (share) openShared(share);
    })
    .catch(function (err) {
      console.error(err);
      $("startBtn").disabled = true;
      $("startBtn").textContent = "Catalog failed to load";
      if ($("secretSantaBtn")) $("secretSantaBtn").disabled = true;
    });

  window.__WRAPT__ = {
    getState: function () { return state; },
    pickProduct: pickProduct,
    amazonUrl: amazonUrl,
    genderOk: genderOk,
    buildShareUrl: buildShareUrl,
    parseShare: parseShare,
    shipMessage: shipMessage,
    christmasOn: christmasOn,
  };
})();
