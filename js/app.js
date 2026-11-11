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
    recipient: null,
    vibe: null,
    catalog: [],
    current: null,
    shown: [],
    rerollUsed: false,
  };

  var els = {};

  function $(id) { return document.getElementById(id); }

  function applyBrand() {
    document.title = BRAND + " — mystery gifts";
    document.querySelectorAll("[data-brand]").forEach(function (n) {
      n.textContent = BRAND;
    });
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
    // de-dupe
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
        // Amazon sometimes returns a 1×1 pixel when a public thumbnail is missing.
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

  function matches(product, opts) {
    if (product.budget !== opts.budget) return false;
    if (opts.recipient && product.recipients.indexOf(opts.recipient) === -1) return false;
    if (opts.vibe && opts.vibe !== "surprise" && product.vibes.indexOf(opts.vibe) === -1) return false;
    if (opts.exclude && opts.exclude.indexOf(product.asin) !== -1) return false;
    return true;
  }

  function pickProduct() {
    var pools = [
      { budget: state.budget, recipient: state.recipient, vibe: state.vibe, exclude: state.shown },
      { budget: state.budget, recipient: state.recipient, vibe: "surprise", exclude: state.shown },
      { budget: state.budget, recipient: null, vibe: state.vibe, exclude: state.shown },
      { budget: state.budget, recipient: null, vibe: "surprise", exclude: state.shown },
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

  function renderChoices() {
    var step = state.step;
    var list = step === 1 ? BUDGETS : step === 2 ? RECIPIENTS : VIBES;
    var selected = step === 1 ? state.budget : step === 2 ? state.recipient : state.vibe;
    var title = step === 1 ? "What’s the budget?" : step === 2 ? "Who’s it for?" : "What vibe?";
    var sub =
      step === 1
        ? "Prices are approximate and can change."
        : step === 2
        ? "We’ll keep the pick appropriate for them."
        : "One vibe is plenty. Or let us surprise you.";
    $("stepKicker").textContent = "Step " + step + " of 3";
    $("stepTitle").textContent = title;
    $("stepSub").textContent = sub;
    $("choices").className = "choices" + (step !== 1 ? " cols-2" : "");
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
        if (step === 1) state.budget = item.id;
        if (step === 2) state.recipient = item.id;
        if (step === 3) state.vibe = item.id;
        renderChoices();
      });
      $("choices").appendChild(btn);
    });
    document.querySelectorAll("[data-step-dot]").forEach(function (dot) {
      dot.classList.toggle("is-on", Number(dot.getAttribute("data-step-dot")) <= step);
    });
    $("backStepBtn").hidden = false;
    $("nextStepBtn").disabled = !(step === 1 ? state.budget : step === 2 ? state.recipient : state.vibe);
    $("nextStepBtn").textContent = step === 3 ? "Wrap it up" : "Continue";
  }

  function wrapLabel() {
    var budget = BUDGETS.find(function (b) { return b.id === state.budget; });
    var who = RECIPIENTS.find(function (r) { return r.id === state.recipient; });
    var vibe = VIBES.find(function (v) { return v.id === state.vibe; });
    var whoText = state.recipient === "me" ? "you" : (who ? who.label.toLowerCase() : "someone");
    var vibeText = state.vibe === "surprise" ? "a surprise vibe" : (vibe ? "a " + vibe.label.toLowerCase() + " vibe" : "a surprise");
    return (budget ? budget.label : "") + " · for " + whoText + " · " + vibeText;
  }

  function resetGiftBox() {
    var gift = $("gift");
    gift.classList.remove("is-shaking", "is-open");
    $("unwrapHint").textContent = "Give the box a tap";
    $("giftHit").disabled = false;
  }

  function goWrap() {
    state.shown = [];
    state.rerollUsed = false;
    state.current = null;
    $("wrapMeta").textContent = wrapLabel();
    resetGiftBox();
    showView("view-wrap");
  }

  function showProduct(product) {
    state.current = product;
    state.shown.push(product.asin);
    $("productName").textContent = product.name;
    $("productPrice").textContent = "About $" + product.approxPrice;
    $("productWhy").textContent = product.why;
    $("productImage").alt = product.name;
    loadImage($("productImage"), product);
    var link = $("amazonBtn");
    link.href = amazonUrl(product.asin);
    link.setAttribute("aria-label", "Get " + product.name + " on Amazon");
    $("rerollBtn").hidden = state.rerollUsed;
    $("rerollBtn").disabled = false;
    $("rerollBtn").textContent = "Try one more (free reroll)";
  }

  function unwrap() {
    var gift = $("gift");
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("giftHit").disabled = true;
    $("unwrapHint").textContent = "Tearing the paper…";
    var product = pickProduct();
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
    if (state.rerollUsed) return;
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
    state.recipient = null;
    state.vibe = null;
    state.current = null;
    state.shown = [];
    state.rerollUsed = false;
    showView("view-home");
  }

  function bind() {
    $("startBtn").addEventListener("click", function () {
      state.step = 1;
      renderChoices();
      showView("view-quiz");
    });
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
      if (state.step < 3) {
        state.step += 1;
        renderChoices();
        return;
      }
      goWrap();
    });
    $("giftHit").addEventListener("click", unwrap);
    $("rerollBtn").addEventListener("click", reroll);
    $("againBtn").addEventListener("click", startOver);
  }

  function validateCatalog(data) {
    if (!Array.isArray(data) || !data.length) throw new Error("Catalog is empty");
    data.forEach(function (p, i) {
      if (!p.asin || !p.name || !p.budget || !p.why) {
        throw new Error("Bad product at " + i);
      }
    });
    return data;
  }

  applyBrand();
  bind();

  fetch("data/products.json")
    .then(function (res) {
      if (!res.ok) throw new Error("Could not load products.json (" + res.status + ")");
      return res.json();
    })
    .then(function (data) {
      state.catalog = validateCatalog(data);
    })
    .catch(function (err) {
      console.error(err);
      $("startBtn").disabled = true;
      $("startBtn").textContent = "Catalog failed to load";
    });

  // Expose a tiny hook for local tests.
  window.__WRAPT__ = {
    getState: function () { return state; },
    pickProduct: pickProduct,
    amazonUrl: amazonUrl,
  };
})();
