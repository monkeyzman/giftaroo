(function () {
  "use strict";

  var CONFIG = window.WRAPT_CONFIG || { brandName: "Giftaroo", affiliateTag: "giftaroo-20" };
  var BRAND = CONFIG.brandName || "Giftaroo";
  var TAG = CONFIG.affiliateTag || "giftaroo-20";
  var SAVE_KEY = "giftaroo.saved";
  var HIST_KEY = "giftaroo.history";
  var VIEWS = ["view-home", "view-quiz", "view-present", "view-sack", "view-wrap", "view-reveal", "view-saved"];

  var OCCASIONS = [
    { id: "holiday", label: "Holiday", sub: "Christmas, Hanukkah, the whole season" },
    { id: "birthday", label: "Birthday", sub: "Their day, your move" },
    { id: "thanks", label: "Thank you", sub: "Warm, useful, not too much" },
    { id: "because", label: "Just because", sub: "No occasion required" },
    { id: "anniversary", label: "Anniversary", sub: "A little romantic" },
    { id: "house", label: "Housewarming", sub: "For a new place" },
    { id: "santa", label: "Secret Santa", sub: "Office-friendly and on a cap" },
  ];
  var GENDERS = [
    { id: "him", label: "For him", sub: "Skips women’s gifts" },
    { id: "her", label: "For her", sub: "Skips men’s gifts" },
    { id: "anyone", label: "Anyone", sub: "A little of everything" },
  ];
  var RECIPIENTS = [
    { id: "me", label: "Me", sub: "A treat for yourself" },
    { id: "partner", label: "A partner", sub: "Thoughtful, maybe romantic" },
    { id: "friend", label: "A friend", sub: "Fun and a little surprising" },
    { id: "kid", label: "A kid", sub: "Playful and appropriate" },
    { id: "parent", label: "A parent", sub: "Cozy, useful, or special" },
    { id: "sibling", label: "A sibling", sub: "The one who gets the joke" },
    { id: "grandparent", label: "A grandparent", sub: "Gentle and easy to love" },
    { id: "coworker", label: "A coworker", sub: "Office-friendly" },
    { id: "teacher", label: "A teacher", sub: "Kind, not too personal" },
    { id: "neighbor", label: "A neighbor", sub: "Friendly and low-stakes" },
    { id: "group", label: "A whole group", sub: "One sealed gift each" },
  ];
  var VIBES = [
    { id: "cozy", label: "Cozy" },
    { id: "gamer", label: "Gamer" },
    { id: "foodie", label: "Foodie" },
    { id: "tech", label: "Tech" },
    { id: "outdoors", label: "Outdoors" },
    { id: "beauty", label: "Beauty" },
    { id: "reader", label: "Reader" },
    { id: "fitness", label: "Fitness" },
    { id: "creative", label: "Creative" },
    { id: "collector", label: "Collector" },
    { id: "surprise", label: "Surprise me" },
  ];
  var SANTA_KINDS = [
    { id: "one", label: "Just one person", sub: "A single office-safe surprise" },
    { id: "group", label: "A whole group", sub: "Draw a different gift for each name" },
  ];
  var ALIAS = { sibling: "friend", grandparent: "parent", teacher: "coworker", neighbor: "friend" };
  var GENDER_LABEL = { anyone: "Anyone", him: "For him", her: "For her", kid: "A kid" };

  var state = {
    step: 1,
    occasion: null,
    priceMax: null,
    gender: null,
    recipient: null,
    vibe: null,
    fastSanta: false,
    santaKind: null,
    people: [],
    activePerson: null,
    premiere: false,
    fromShelf: false,
    browsing: false,
    shelfTab: "saved",
    catalog: [],
    current: null,
    shown: [],
    rerollsLeft: 3,
    shared: null,
    lockedProduct: null,
  };

  var unwrapGen = 0;
  var confettiPieces = [];
  var confettiRaf = null;

  function $(id) { return document.getElementById(id); }

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function haptic(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (e) { /* optional */ }
  }

  function sfx() {
    return window.GiftarooSound || {
      isMuted: function () { return true; },
      toggle: function () { return true; },
      tap: function () {},
      select: function () {},
      suspense: function () {},
      reveal: function () {},
      pop: function () {}
    };
  }

  function play(name) {
    try { sfx()[name](); } catch (e) {}
  }

  function syncMuteBtn() {
    var btn = $("muteBtn");
    if (!btn) return;
    var muted = false;
    try { muted = sfx().isMuted(); } catch (e) { muted = false; }
    btn.classList.toggle("is-muted", muted);
    btn.setAttribute("aria-pressed", muted ? "true" : "false");
    btn.setAttribute("aria-label", muted ? "Unmute sounds" : "Mute sounds");
  }

  function cancelUnwrap() { unwrapGen += 1; }

  function flashBurst() {
    if (reducedMotion()) return;
    var flash = $("flash");
    if (!flash) return;
    flash.classList.remove("is-on");
    void flash.offsetWidth;
    flash.classList.add("is-on");
  }

  function readStore(key) {
    try {
      var raw = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }

  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function christmasOn() {
    return CONFIG.christmasMode !== false && CONFIG.christmasMode !== "false";
  }

  function steps() {
    if (state.fastSanta) {
      var santa = ["santaKind"];
      if (state.santaKind === "group") santa.push("names", "budget");
      else if (state.santaKind === "one") santa.push("gender", "budget");
      return santa;
    }
    var list = ["occasion", "who"];
    if (state.recipient === "group") list.push("names");
    else list.push("gender");
    list.push("budget", "vibe");
    return list;
  }

  function stepId() { return steps()[state.step - 1]; }

  function applyBrand() {
    document.title = BRAND + " — mystery gifts";
    document.querySelectorAll("[data-brand]").forEach(function (n) { n.textContent = BRAND; });
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
    if (!snow || reducedMotion()) {
      if (snow) snow.hidden = true;
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

  function showView(id, dir) {
    document.body.dataset.dir = dir || "forward";
    VIEWS.forEach(function (vid) {
      var el = $(vid);
      if (!el) return;
      var on = vid === id;
      el.hidden = !on;
      el.classList.toggle("is-active", on);
    });
    if (id !== "view-reveal") clearConfetti();
    window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    var active = $(id);
    if (active) {
      if (!active.hasAttribute("tabindex")) active.setAttribute("tabindex", "-1");
      try { active.focus({ preventScroll: true }); } catch (e) { active.focus(); }
      var head = active.querySelector("h1, h2");
      var live = $("live");
      if (live && head) live.textContent = head.textContent;
    }
  }

  function clearConfetti() {
    if (confettiRaf) cancelAnimationFrame(confettiRaf);
    confettiRaf = null;
    confettiPieces = [];
    var canvas = $("confetti");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    if (fallback) fallback.hidden = true;
    img.style.display = "block";
    img.referrerPolicy = "no-referrer";
    function tryNext() {
      var my = ++token;
      if (i >= urls.length) {
        img.style.display = "none";
        if (fallback) fallback.hidden = false;
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
        if (fallback) fallback.hidden = true;
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

  function matchWho(recipient) {
    if (!recipient || recipient === "group") return null;
    return ALIAS[recipient] || recipient;
  }

  function scoreProduct(product, opts) {
    var price = Number(product.approxPrice);
    if (!isFinite(price)) return -1;
    if (opts.priceMax != null && price > Number(opts.priceMax)) return -1;
    if (!genderOk(product, opts.gender)) return -1;
    if (opts.exclude && opts.exclude.indexOf(product.asin) !== -1) return -1;
    var who = matchWho(opts.recipient);
    if (who === "kid" && (!product.recipients || product.recipients.indexOf("kid") === -1)) return -1;
    var score = 1;
    if (who && product.recipients && product.recipients.indexOf(who) !== -1) score += 5;
    if (opts.vibe && opts.vibe !== "surprise" && product.vibes && product.vibes.indexOf(opts.vibe) !== -1) score += 6;
    if (opts.occasion && product.occasions && product.occasions.indexOf(opts.occasion) !== -1) score += 3;
    if (opts.priceMax) {
      var ratio = price / Number(opts.priceMax);
      if (ratio >= 0.7) score += 8;
      else if (ratio >= 0.45) score += 5;
      else if (ratio >= 0.25) score += 2;
    }
    if (product.image && String(product.image).indexOf("assets/") === 0) score += 1;
    return score;
  }

  function pickOptions() {
    var gender = state.gender;
    var recipient = state.recipient;
    if (state.activePerson) {
      if (state.activePerson.gender === "kid") {
        gender = "anyone";
        recipient = "kid";
      } else {
        gender = state.activePerson.gender || "anyone";
        recipient = state.fastSanta || state.occasion === "santa" ? "coworker" : "friend";
      }
    }
    return {
      priceMax: state.priceMax,
      gender: gender,
      recipient: recipient,
      vibe: state.vibe || "surprise",
      occasion: state.occasion,
      exclude: state.shown.slice(),
    };
  }

  function pickProduct() {
    var opts = pickOptions();
    var best = [];
    var bestScore = 0;
    state.catalog.forEach(function (product) {
      var score = scoreProduct(product, opts);
      if (score > bestScore) {
        bestScore = score;
        best = [product];
      } else if (score === bestScore && score > 0) {
        best.push(product);
      }
    });
    if (!best.length) return null;
    return best[Math.floor(Math.random() * best.length)];
  }

  function findByAsin(asin) {
    return state.catalog.find(function (p) { return p.asin === asin || p.id === asin; }) || null;
  }

  function currentList() {
    var id = stepId();
    if (id === "occasion") return OCCASIONS;
    if (id === "who") return RECIPIENTS;
    if (id === "gender") return GENDERS;
    if (id === "vibe") return VIBES;
    if (id === "santaKind") return SANTA_KINDS;
    return [];
  }

  function currentSelected() {
    var id = stepId();
    if (id === "occasion") return state.occasion;
    if (id === "who") return state.recipient;
    if (id === "gender") return state.gender;
    if (id === "vibe") return state.vibe;
    if (id === "santaKind") return state.santaKind;
    return null;
  }

  function selectionReady() {
    var id = stepId();
    if (id === "budget") return state.priceMax != null;
    if (id === "names") return state.people.length >= 2;
    return !!currentSelected();
  }

  function copyFor(id) {
    if (id === "occasion") return ["What’s the occasion?", "We’ll lean toward gifts that fit the moment."];
    if (id === "who") return ["Who’s it for?", "One person, or a whole list."];
    if (id === "gender") return ["For him, for her, or anyone?", "For him skips women’s gifts. For her skips men’s gifts."];
    if (id === "budget") return ["What’s the ceiling?", "We’ll stay at or under this. Prices are approximate."];
    if (id === "vibe") return ["What vibe?", "One mood is plenty. Or let us surprise you."];
    if (id === "santaKind") return ["One coworker, or the whole draw?", "Everyone gets a different gift, under the same cap."];
    if (id === "names") return ["Who’s in the group?", "Add at least two names. Tap a name’s tag to switch him, her, or anyone."];
    return ["", ""];
  }

  function budgetBlurb(n) {
    if (state.fastSanta || state.occasion === "santa") {
      return "Secret Santa stays at or under $" + n + ". Modest usually lands better.";
    }
    if (n <= 15) return "Stocking-stuffer territory. Small and cheerful.";
    if (n <= 30) return "The sweet spot. Easy to love, easy to give.";
    if (n <= 60) return "Room for something they’ll actually keep.";
    return "A bigger swing, with a clear ceiling.";
  }

  function renderBudget(host) {
    if (state.priceMax == null) state.priceMax = state.fastSanta || state.occasion === "santa" ? 25 : 40;
    var wrap = document.createElement("div");
    wrap.className = "budget";
    wrap.innerHTML = '<p class="budget-value" id="budgetReadout"></p>' +
      '<input type="range" id="budgetSlider" min="10" max="100" step="5" aria-label="Maximum budget in dollars">' +
      '<div class="budget-scale"><span>$10</span><span>$100</span></div>' +
      '<p class="budget-note" id="budgetNote"></p>';
    host.appendChild(wrap);
    var slider = $("budgetSlider");
    slider.value = String(state.priceMax);
    function sync() {
      state.priceMax = Number(slider.value);
      $("budgetReadout").textContent = "Up to $" + state.priceMax;
      slider.setAttribute("aria-valuetext", "Up to $" + state.priceMax);
      $("budgetNote").textContent = budgetBlurb(state.priceMax);
    }
    slider.addEventListener("input", sync);
    slider.addEventListener("change", function () {
      haptic(10);
      play("select");
    });
    sync();
  }

  function renderNames(host) {
    var box = document.createElement("div");
    box.className = "name-builder";
    var list = document.createElement("ul");
    list.className = "people";
    state.people.forEach(function (person, index) {
      var li = document.createElement("li");
      li.className = "person";
      var name = document.createElement("span");
      name.className = "person-name";
      name.textContent = person.name;
      var gender = document.createElement("button");
      gender.type = "button";
      gender.className = "person-gender";
      gender.textContent = GENDER_LABEL[person.gender] || "Anyone";
      gender.setAttribute("aria-label", "Gift style for " + person.name + ", " + gender.textContent);
      gender.addEventListener("click", function () {
        var order = ["anyone", "him", "her", "kid"];
        var next = order[(Math.max(0, order.indexOf(person.gender)) + 1) % order.length];
        state.people[index].gender = next;
        play("select");
        renderChoices();
      });
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "person-remove";
      remove.setAttribute("aria-label", "Remove " + person.name);
      remove.textContent = "×";
      remove.addEventListener("click", function () {
        state.people.splice(index, 1);
        play("tap");
        renderChoices();
      });
      li.appendChild(name);
      li.appendChild(gender);
      li.appendChild(remove);
      list.appendChild(li);
    });
    var form = document.createElement("form");
    form.className = "name-form";
    var input = document.createElement("input");
    input.id = "personName";
    input.maxLength = 24;
    input.placeholder = "Add a name";
    input.setAttribute("aria-label", "Name");
    input.autocomplete = "off";
    var add = document.createElement("button");
    add.type = "submit";
    add.className = "btn btn-secondary";
    add.textContent = "Add";
    form.appendChild(input);
    form.appendChild(add);
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var value = input.value.replace(/\s+/g, " ").trim().slice(0, 24);
      if (!value || state.people.length >= 8) return;
      state.people.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: value,
        gender: "anyone",
        swaps: 1,
        product: null,
        opened: false,
      });
      play("select");
      haptic(10);
      renderChoices();
      var field = $("personName");
      if (field) field.focus();
    });
    var hint = document.createElement("p");
    hint.className = "budget-note";
    hint.textContent = state.people.length >= 8
      ? "Eight is the cozy maximum."
      : "Two names minimum, eight maximum.";
    box.appendChild(list);
    box.appendChild(form);
    box.appendChild(hint);
    host.appendChild(box);
  }

  function renderChoices() {
    var id = stepId();
    var copy = copyFor(id);
    $("stepKicker").textContent = "Step " + state.step + " of " + steps().length;
    $("stepTitle").textContent = copy[0];
    $("stepSub").textContent = copy[1];
    var host = $("choices");
    var wide = id === "who" || id === "vibe";
    host.className = "choices" + (wide ? " cols-2" : "");
    host.innerHTML = "";
    if (id === "budget") renderBudget(host);
    else if (id === "names") renderNames(host);
    else {
      var selected = currentSelected();
      currentList().forEach(function (item) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip" + (selected === item.id ? " is-selected" : "");
        btn.setAttribute("aria-pressed", selected === item.id ? "true" : "false");
        btn.dataset.id = item.id;
        btn.textContent = item.label;
        if (item.sub) {
          var small = document.createElement("small");
          small.textContent = item.sub;
          btn.appendChild(small);
        }
        btn.addEventListener("click", function () {
          haptic(10);
          play("select");
          applyChoice(item.id);
          renderChoices();
        });
        host.appendChild(btn);
      });
    }
    var progress = $("progress");
    progress.innerHTML = "";
    var total = steps().length;
    for (var d = 1; d <= total; d++) {
      var dot = document.createElement("span");
      dot.className = "dot" + (d <= state.step ? " is-on" : "");
      progress.appendChild(dot);
    }
    $("nextStepBtn").disabled = !selectionReady();
    $("nextStepBtn").textContent = state.step === total ? "Wrap it up" : "Continue";
  }

  function applyChoice(id) {
    var step = stepId();
    if (step === "occasion") state.occasion = id;
    else if (step === "who") {
      state.recipient = id;
      if (id !== "group") state.people = [];
    } else if (step === "gender") state.gender = id;
    else if (step === "vibe") state.vibe = id;
    else if (step === "santaKind") {
      state.santaKind = id;
      state.occasion = "santa";
      state.vibe = "surprise";
      if (id === "one") {
        state.recipient = "coworker";
        state.people = [];
      } else {
        state.recipient = "group";
      }
    }
  }

  function pulseQuiz(dir) {
    document.body.dataset.dir = dir || "forward";
    var view = $("view-quiz");
    if (!view) return;
    view.classList.remove("is-pulse");
    void view.offsetWidth;
    view.classList.add("is-pulse");
  }

  function genderPhrase(gender) {
    if (gender === "him") return "for him";
    if (gender === "her") return "for her";
    if (gender === "kid") return "for a kid";
    return "for anyone";
  }

  function labelOf(list, id) {
    var found = list.find(function (item) { return item.id === id; });
    return found ? found.label : "";
  }

  function wrapLabel() {
    if (state.premiere && state.shared) {
      return state.shared.from ? state.shared.from + " sent you a mystery gift" : "A mystery gift is waiting";
    }
    if (state.activePerson) {
      return state.activePerson.name + " · up to $" + state.priceMax + " · " + genderPhrase(state.activePerson.gender);
    }
    var who = state.recipient === "me" ? "you" : labelOf(RECIPIENTS, state.recipient).toLowerCase();
    var vibe = state.vibe === "surprise" ? "a surprise vibe" : ("a " + labelOf(VIBES, state.vibe).toLowerCase() + " vibe");
    return "Up to $" + state.priceMax + " · " + labelOf(OCCASIONS, state.occasion) + " · " + genderPhrase(state.gender) + " · " + who + " · " + vibe;
  }

  function resetGiftBox() {
    var gift = $("gift");
    gift.classList.remove("is-shaking", "is-open");
    $("unwrapHint").textContent = state.premiere ? "Tap the box. It’s yours." : "Give the box a tap";
    $("giftHit").disabled = false;
    $("giftHit").setAttribute("aria-label", state.activePerson ? "Unwrap " + state.activePerson.name + "’s gift" : "Unwrap your mystery gift");
  }

  function resetWrapCopy() {
    if (state.premiere) {
      $("wrapEyebrow").textContent = "A surprise for you";
      $("wrapTitle").textContent = "Tap to unwrap";
    } else if (state.activePerson) {
      $("wrapEyebrow").textContent = "Sealed for " + state.activePerson.name;
      $("wrapTitle").textContent = "Tap to unwrap";
    } else {
      $("wrapEyebrow").textContent = "Your mystery gift is ready";
      $("wrapTitle").textContent = "Tap to unwrap";
    }
    var note = $("wrapNote");
    if (state.premiere && state.shared && state.shared.note) {
      note.hidden = false;
      note.textContent = "“" + state.shared.note + "”";
    } else {
      note.hidden = true;
      note.textContent = "";
    }
  }

  function goWrap() {
    cancelUnwrap();
    if (!state.activePerson) {
      state.shown = [];
      state.rerollsLeft = 3;
      state.lockedProduct = state.premiere ? state.lockedProduct : null;
    }
    state.current = null;
    if (!state.premiere) state.shared = null;
    resetWrapCopy();
    $("wrapMeta").textContent = wrapLabel();
    resetGiftBox();
    showView("view-wrap", "forward");
  }

  function swapsLeft() {
    if (state.shared || state.fromShelf || state.browsing) return 0;
    if (state.activePerson) return state.activePerson.swaps == null ? 0 : state.activePerson.swaps;
    return state.rerollsLeft;
  }

  function rerollLabel(n) {
    if (n >= 3) return "Shake the box again · " + n + " left";
    if (n === 2) return "Shake it again · 2 left";
    if (n === 1) return "Last shake";
    return "The box is empty";
  }

  function updateRerollBtn() {
    var left = swapsLeft();
    var btn = $("rerollBtn");
    if (state.shared || state.fromShelf || state.browsing) {
      btn.hidden = true;
      return;
    }
    btn.hidden = false;
    btn.disabled = left <= 0;
    btn.textContent = rerollLabel(left);
  }

  function isSaved(asin) {
    return readStore(SAVE_KEY).some(function (item) { return item.asin === asin; });
  }

  function syncSavedBadge() {
    var count = readStore(SAVE_KEY).length;
    var badge = $("savedCount");
    if (!badge) return;
    badge.hidden = count === 0;
    badge.textContent = count > 9 ? "9+" : String(count);
  }

  function snapshot(product) {
    return {
      asin: product.asin,
      name: product.name,
      approxPrice: product.approxPrice,
      image: product.image || "",
      why: product.why || "",
      at: Date.now(),
    };
  }

  function remember(product) {
    if (!product || state.fromShelf) return;
    var history = readStore(HIST_KEY).filter(function (item) { return item.asin !== product.asin; });
    history.unshift(snapshot(product));
    writeStore(HIST_KEY, history.slice(0, 16));
    paintRecent();
  }

  function toggleSaved() {
    if (!state.current) return;
    var items = readStore(SAVE_KEY);
    var index = -1;
    items.forEach(function (item, i) { if (item.asin === state.current.asin) index = i; });
    if (index >= 0) items.splice(index, 1);
    else items.unshift(snapshot(state.current));
    writeStore(SAVE_KEY, items.slice(0, 40));
    paintHeart();
    syncSavedBadge();
    haptic(12);
    play(index >= 0 ? "tap" : "select");
  }

  function paintHeart() {
    var btn = $("favBtn");
    if (!btn || !state.current) return;
    var on = isSaved(state.current.asin);
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Remove from saved gifts" : "Save this gift");
  }

  function renderProduct(product) {
    state.current = product;
    if (state.shown.indexOf(product.asin) === -1) state.shown.push(product.asin);
    if (state.activePerson) {
      state.activePerson.product = product;
      state.activePerson.opened = true;
    }
    $("productName").textContent = product.name;
    $("productPrice").textContent = "About $" + product.approxPrice;
    $("productWhy").textContent = product.why || "";
    $("productImage").alt = product.name;
    loadImage($("productImage"), product);
    var link = $("amazonBtn");
    link.href = amazonUrl(product.asin);
    link.setAttribute("aria-label", "Get " + product.name + " on Amazon");
    var shared = !!state.shared;
    $("shareBtn").hidden = shared;
    $("shareCardBtn").hidden = false;
    $("shareSheet").hidden = true;
    $("shareStatus").textContent = "";
    $("cardStatus").textContent = "";
    $("shareUrl").hidden = true;
    $("againBtn").hidden = shared;
    $("againBtn").textContent = state.fromShelf ? "Back to your shelf" : "Start over";
    $("makeOwnBtn").hidden = !shared;
    $("backGroupBtn").hidden = !state.activePerson;
    updateRerollBtn();
    paintHeart();
    var note = $("revealNote");
    if (shared && (state.shared.from || state.shared.note)) {
      var bits = [];
      if (state.shared.from) bits.push("From " + state.shared.from);
      if (state.shared.note) bits.push("“" + state.shared.note + "”");
      note.hidden = false;
      note.textContent = bits.join(" — ");
      $("revealKicker").textContent = state.shared.from ? "A gift from " + state.shared.from : "You unwrapped…";
    } else if (state.activePerson) {
      note.hidden = false;
      note.textContent = "For " + state.activePerson.name;
      $("revealKicker").textContent = "You unwrapped…";
    } else {
      note.hidden = true;
      note.textContent = "";
      $("revealKicker").textContent = "You unwrapped…";
    }
  }

  function showProduct(product, opts) {
    renderProduct(product);
    if (!opts || !opts.silent) remember(product);
  }

  function unwrap() {
    if ($("giftHit").disabled) return;
    var gift = $("gift");
    var reduced = reducedMotion();
    var gen = ++unwrapGen;
    $("giftHit").disabled = true;
    var product = state.lockedProduct || (state.activePerson && state.activePerson.product) || pickProduct();
    if (!product) {
      $("unwrapHint").textContent = "Nothing in the catalog fits that. Try a wider budget.";
      $("giftHit").disabled = false;
      return;
    }
    haptic(reduced ? [12] : [16, 40, 16, 40, 24]);
    function reveal() {
      if (gen !== unwrapGen) return;
      gift.classList.remove("is-shaking");
      gift.classList.add("is-open");
      play("reveal");
      haptic([24, 36, 18, 70]);
      flashBurst();
      showProduct(product);
      burstConfetti();
      setTimeout(function () {
        if (gen !== unwrapGen) return;
        showView("view-reveal", "forward");
      }, reduced ? 40 : 700);
    }
    if (reduced) {
      $("unwrapHint").textContent = "Opening…";
      play("tap");
      reveal();
      return;
    }
    play(state.premiere ? "suspense" : "suspense");
    gift.classList.add("is-shaking");
    var beats = state.premiere
      ? ["This one has your name on it…", "The bow is coming loose…", "Don’t blink…"]
      : ["Something’s shifting…", "The ribbon’s slipping…", "Here it comes…"];
    var beat = 0;
    var wait = state.premiere ? 1800 : 1420;
    $("unwrapHint").textContent = beats[0];
    var timer = setInterval(function () {
      if (gen !== unwrapGen) { clearInterval(timer); return; }
      beat += 1;
      if (beat < beats.length) $("unwrapHint").textContent = beats[beat];
    }, Math.round(wait / beats.length));
    setTimeout(function () {
      clearInterval(timer);
      reveal();
    }, wait);
  }

  function reroll() {
    if (swapsLeft() <= 0 || state.shared || state.fromShelf) return;
    var product = pickProduct();
    if (!product) {
      if (state.activePerson) state.activePerson.swaps = 0;
      else state.rerollsLeft = 0;
      $("rerollBtn").disabled = true;
      $("rerollBtn").textContent = "That’s everything for this combo";
      return;
    }
    if (state.activePerson) state.activePerson.swaps -= 1;
    else state.rerollsLeft -= 1;
    var card = $("productCard");
    function apply() {
      showProduct(product);
      burstConfetti();
      play("pop");
      haptic([12, 30, 18]);
    }
    if (reducedMotion()) { apply(); return; }
    card.classList.remove("is-flip");
    void card.offsetWidth;
    card.classList.add("is-flip");
    setTimeout(apply, 200);
  }

  function renderSack() {
    var group = state.fastSanta || state.occasion === "santa";
    $("sackEyebrow").textContent = group ? "Secret Santa" : "The group";
    $("sackTitle").textContent = "A gift for each of them";
    $("sackSub").textContent = "Up to $" + state.priceMax + ". Tap a box — no repeats.";
    var list = $("sackList");
    list.innerHTML = "";
    state.people.forEach(function (person) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sack-card" + (person.opened ? " is-open" : "");
      var bow = document.createElement("span");
      bow.className = "mini-bow";
      bow.setAttribute("aria-hidden", "true");
      var title = document.createElement("span");
      title.textContent = person.name;
      var sub = document.createElement("small");
      sub.textContent = person.opened && person.product ? person.product.name : (GENDER_LABEL[person.gender] + " · sealed");
      btn.appendChild(bow);
      btn.appendChild(title);
      btn.appendChild(sub);
      btn.setAttribute("aria-label", (person.opened ? "See gift for " : "Unwrap gift for ") + person.name);
      btn.addEventListener("click", function () { openPerson(person); });
      list.appendChild(btn);
    });
  }

  function openPerson(person) {
    state.activePerson = person;
    state.fromShelf = false;
    state.browsing = false;
    state.shared = null;
    state.premiere = false;
    if (person.opened && person.product) {
      state.lockedProduct = person.product;
      showProduct(person.product, { silent: true });
      showView("view-reveal", "forward");
      return;
    }
    state.lockedProduct = null;
    goWrap();
  }

  function clip(value, max) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
  }

  function buildShareUrl(product, from, note) {
    var parts = ["gift=" + encodeURIComponent(product.asin || product.id)];
    if (from) parts.push("from=" + encodeURIComponent(from));
    if (note) parts.push("note=" + encodeURIComponent(note));
    return window.location.href.split("#")[0] + "#" + parts.join("&");
  }

  function parseShare(hash) {
    var raw = (hash == null ? window.location.hash : hash).replace(/^#/, "");
    if (!raw) return null;
    var params = new URLSearchParams(raw);
    var gift = params.get("gift");
    if (!gift) return null;
    return { gift: gift, from: clip(params.get("from"), 40), note: clip(params.get("note"), 140) };
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { return fallbackCopy(text); });
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
      try { document.execCommand("copy"); } catch (e) {}
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
    var text = from ? from + " wrapped you a mystery gift." : "A mystery gift is waiting for you.";
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
        copyText(url).then(function () { status.textContent = "Link copied. Send it whenever you’re ready."; });
      });
      return;
    }
    copyText(url).then(function () { status.textContent = "Link copied. Send it whenever you’re ready."; });
  }

  function sameOrigin(src) {
    try { return new URL(src, window.location.href).origin === window.location.origin; }
    catch (e) { return false; }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fillLines(ctx, text, x, y, maxW, lineH, maxLines) {
    var words = String(text || "").split(/\s+/);
    var line = "";
    var lines = [];
    words.forEach(function (word) {
      var test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else line = test;
    });
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach(function (ln, i) { ctx.fillText(ln, x, y + i * lineH); });
  }

  function drawShareCard(product) {
    return new Promise(function (resolve, reject) {
      var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      ready.then(function () {
        try {
          var canvas = document.createElement("canvas");
          canvas.width = 900;
          canvas.height = 1125;
          var ctx = canvas.getContext("2d");
          var bg = ctx.createLinearGradient(0, 0, 0, 1125);
          bg.addColorStop(0, "#245445");
          bg.addColorStop(1, "#12211c");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, 900, 1125);
          ctx.fillStyle = "#e0c57a";
          ctx.font = "600 28px Outfit, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(BRAND).toUpperCase(), 450, 88);
          ctx.fillStyle = "#fffaf3";
          ctx.font = "650 56px Fraunces, Georgia, serif";
          ctx.fillText("You unwrapped", 450, 168);
          roundRect(ctx, 150, 220, 600, 560, 36);
          ctx.save();
          ctx.clip();
          ctx.fillStyle = "#f4efe6";
          ctx.fillRect(150, 220, 600, 560);
          var img = $("productImage");
          var drew = false;
          if (img && img.complete && img.naturalWidth > 40 && sameOrigin(img.currentSrc || img.src)) {
            try {
              ctx.drawImage(img, 150, 220, 600, 560);
              drew = true;
            } catch (e) { drew = false; }
          }
          ctx.restore();
          if (!drew) {
            ctx.fillStyle = "#c4a15a";
            ctx.font = "650 72px Fraunces, Georgia, serif";
            ctx.fillText("✦", 450, 520);
          }
          ctx.fillStyle = "#e0c57a";
          ctx.font = "650 32px Outfit, sans-serif";
          ctx.fillText("About $" + product.approxPrice, 450, 860);
          ctx.fillStyle = "#fffaf3";
          ctx.font = "650 40px Fraunces, Georgia, serif";
          fillLines(ctx, product.name, 450, 920, 760, 50, 3);
          ctx.fillStyle = "rgba(255,250,243,0.72)";
          ctx.font = "500 22px Outfit, sans-serif";
          ctx.fillText("A mystery gift from " + BRAND, 450, 1075);
          canvas.toBlob(function (blob) {
            if (!blob) reject(new Error("empty card"));
            else resolve(blob);
          }, "image/png");
        } catch (e) { reject(e); }
      }).catch(reject);
    });
  }

  function downloadBlob(blob) {
    var link = document.createElement("a");
    var url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "giftaroo-gift.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function shareCard() {
    if (!state.current) return;
    var status = $("cardStatus");
    status.textContent = "Making your card…";
    haptic(12);
    play("tap");
    drawShareCard(state.current).then(function (blob) {
      try {
        var file = new File([blob], "giftaroo-gift.png", { type: "image/png" });
        var text = "Unwrapped on " + BRAND + ": " + state.current.name;
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: BRAND, text: text }).then(function () {
            status.textContent = "Card shared.";
          }).catch(function (err) {
            if (err && err.name === "AbortError") {
              status.textContent = "Card’s ready whenever you are.";
              return;
            }
            downloadBlob(blob);
            status.textContent = "Saved the card instead.";
          });
          return;
        }
      } catch (e) { /* fall through to download */ }
      downloadBlob(blob);
      status.textContent = "Card saved. Share it from your downloads.";
    }).catch(function () {
      status.textContent = "Couldn’t make a card just now. The Amazon link still works.";
    });
  }

  function openShared(share) {
    cancelUnwrap();
    var product = findByAsin(share.gift);
    if (!product) {
      $("shareMiss").hidden = false;
      showView("view-home", "forward");
      return;
    }
    $("shareMiss").hidden = true;
    state.shared = share;
    state.premiere = true;
    state.lockedProduct = product;
    state.fastSanta = false;
    state.activePerson = null;
    state.fromShelf = false;
    state.people = [];
    $("presentTitle").textContent = share.from ? share.from + " sent you a gift" : "A gift is waiting";
    $("presentFrom").textContent = share.from ? "From " + share.from : "No signature. Just a box.";
    var note = $("presentNote");
    if (share.note) {
      note.hidden = false;
      note.textContent = "“" + share.note + "”";
    } else {
      note.hidden = true;
      note.textContent = "";
    }
    showView("view-present", "forward");
  }

  function clearShareHash() {
    if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  function burstConfetti() {
    if (reducedMotion()) return;
    var canvas = $("confetti");
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var colors = ["#9c2f3b", "#c4a15a", "#2f5b49", "#fffaf3", "#e0c57a", "#7d2430", "#f2d48a"];
    var cx = window.innerWidth / 2;
    var cy = window.innerHeight * 0.36;
    confettiPieces = [];
    for (var i = 0; i < 120; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 2.5 + Math.random() * 9;
      var ribbon = i % 7 === 0;
      confettiPieces.push({
        x: cx + (Math.random() - 0.5) * 24,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        w: ribbon ? 4 + Math.random() * 3 : 5 + Math.random() * 7,
        h: ribbon ? 16 + Math.random() * 12 : 6 + Math.random() * 8,
        color: colors[i % colors.length],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        life: 0,
        shape: i % 5 === 0 ? "circle" : "rect",
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
        if (p.y < window.innerHeight + 20 && p.life < 160) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = Math.max(0, 1 - p.life / 160);
          ctx.fillStyle = p.color;
          if (p.shape === "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
            ctx.fill();
          } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });
      if (alive) confettiRaf = requestAnimationFrame(tick);
      else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        confettiRaf = null;
      }
    }
    confettiRaf = requestAnimationFrame(tick);
  }

  function paintRecent() {
    var block = $("recentBlock");
    var row = $("recentRow");
    if (!block || !row) return;
    var history = readStore(HIST_KEY);
    block.hidden = history.length === 0;
    row.innerHTML = "";
    history.slice(0, 8).forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "recent-chip";
      btn.textContent = item.name;
      btn.addEventListener("click", function () {
        openStored(item, false);
      });
      row.appendChild(btn);
    });
  }

  function openStored(entry, fromShelf) {
    var product = findByAsin(entry.asin) || {
      asin: entry.asin,
      id: entry.asin,
      name: entry.name,
      approxPrice: entry.approxPrice,
      why: entry.why || "From your shelf.",
      image: entry.image,
      gender: "unisex",
      vibes: [],
      recipients: [],
      budget: "25",
    };
    state.fromShelf = !!fromShelf;
    state.browsing = true;
    state.shared = null;
    state.activePerson = null;
    state.premiere = false;
    state.lockedProduct = product;
    showProduct(product, { silent: true });
    showView("view-reveal", "forward");
  }

  function paintShelf() {
    var items = state.shelfTab === "recent" ? readStore(HIST_KEY) : readStore(SAVE_KEY);
    var shelf = $("shelf");
    var empty = $("shelfEmpty");
    shelf.innerHTML = "";
    empty.hidden = items.length !== 0;
    empty.textContent = state.shelfTab === "recent" ? "Unwrap something and it’ll land here." : "Tap the heart on a gift to keep it.";
    $("tabSaved").classList.toggle("is-on", state.shelfTab === "saved");
    $("tabRecent").classList.toggle("is-on", state.shelfTab === "recent");
    $("tabSaved").setAttribute("aria-selected", state.shelfTab === "saved" ? "true" : "false");
    $("tabRecent").setAttribute("aria-selected", state.shelfTab === "recent" ? "true" : "false");
    items.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "shelf-item";
      var img = document.createElement("img");
      img.alt = "";
      img.src = item.image && item.image.indexOf("assets/") === 0 ? item.image : "";
      if (!img.src) img.hidden = true;
      var open = document.createElement("button");
      open.type = "button";
      open.style.cssText = "all:unset;cursor:pointer;display:block;min-width:0;";
      var title = document.createElement("span");
      title.textContent = item.name;
      var price = document.createElement("small");
      price.textContent = "About $" + item.approxPrice;
      title.appendChild(price);
      open.appendChild(title);
      open.addEventListener("click", function () { openStored(item, true); });
      row.appendChild(img);
      row.appendChild(open);
      if (state.shelfTab === "saved") {
        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "shelf-x";
        remove.setAttribute("aria-label", "Remove " + item.name);
        remove.textContent = "×";
        remove.addEventListener("click", function () {
          writeStore(SAVE_KEY, readStore(SAVE_KEY).filter(function (saved) { return saved.asin !== item.asin; }));
          syncSavedBadge();
          paintShelf();
        });
        row.appendChild(remove);
      }
      shelf.appendChild(row);
    });
  }

  function openShelf() {
    state.shelfTab = state.shelfTab || "saved";
    paintShelf();
    showView("view-saved", "forward");
  }

  function startOver() {
    cancelUnwrap();
    state.step = 1;
    state.occasion = null;
    state.priceMax = null;
    state.gender = null;
    state.recipient = null;
    state.vibe = null;
    state.fastSanta = false;
    state.santaKind = null;
    state.people = [];
    state.activePerson = null;
    state.premiere = false;
    state.fromShelf = false;
    state.browsing = false;
    state.current = null;
    state.shown = [];
    state.rerollsLeft = 3;
    state.shared = null;
    state.lockedProduct = null;
    $("shareMiss").hidden = true;
    clearShareHash();
    paintRecent();
    showView("view-home", "back");
  }

  function beginQuiz(fastSanta) {
    cancelUnwrap();
    state.fastSanta = !!fastSanta;
    state.step = 1;
    state.occasion = fastSanta ? "santa" : null;
    state.priceMax = null;
    state.gender = null;
    state.recipient = fastSanta ? null : null;
    state.vibe = fastSanta ? "surprise" : null;
    state.santaKind = null;
    state.people = [];
    state.activePerson = null;
    state.premiere = false;
    state.fromShelf = false;
    state.browsing = false;
    state.shared = null;
    state.lockedProduct = null;
    state.shown = [];
    state.rerollsLeft = 3;
    clearShareHash();
    $("shareMiss").hidden = true;
    renderChoices();
    showView("view-quiz", "forward");
  }

  function finishQuiz() {
    state.fromShelf = false;
    state.browsing = false;
    state.premiere = false;
    state.shared = null;
    state.activePerson = null;
    state.shown = [];
    if ((state.recipient === "group" || state.santaKind === "group") && state.people.length >= 2) {
      state.people.forEach(function (person) {
        person.product = null;
        person.opened = false;
        person.swaps = 1;
      });
      renderSack();
      showView("view-sack", "forward");
      return;
    }
    goWrap();
  }

  function bind() {
    syncMuteBtn();
    syncSavedBadge();
    paintRecent();
    $("muteBtn").addEventListener("click", function () {
      try {
        var muted = sfx().toggle();
        syncMuteBtn();
        if (!muted) play("tap");
      } catch (e) {}
    });
    $("savedBtn").addEventListener("click", function () {
      play("tap");
      openShelf();
    });
    $("startBtn").addEventListener("click", function () {
      haptic(12);
      play("tap");
      beginQuiz(false);
    });
    $("secretSantaBtn").addEventListener("click", function () {
      haptic(12);
      play("tap");
      beginQuiz(true);
    });
    $("brandBtn").addEventListener("click", startOver);
    $("backStepBtn").addEventListener("click", function () {
      play("tap");
      if (state.step === 1) {
        showView("view-home", "back");
        return;
      }
      state.step -= 1;
      renderChoices();
      pulseQuiz("back");
    });
    $("nextStepBtn").addEventListener("click", function () {
      if ($("nextStepBtn").disabled) return;
      haptic(12);
      play("tap");
      if (state.step < steps().length) {
        state.step += 1;
        renderChoices();
        pulseQuiz("forward");
        return;
      }
      finishQuiz();
    });
    $("openPresentBtn").addEventListener("click", function () {
      haptic(16);
      play("tap");
      goWrap();
    });
    $("giftHit").addEventListener("click", unwrap);
    $("rerollBtn").addEventListener("click", reroll);
    $("favBtn").addEventListener("click", toggleSaved);
    $("againBtn").addEventListener("click", function () {
      if (state.fromShelf) { openShelf(); return; }
      startOver();
    });
    $("makeOwnBtn").addEventListener("click", startOver);
    $("backGroupBtn").addEventListener("click", function () {
      state.activePerson = null;
      state.lockedProduct = null;
      renderSack();
      showView("view-sack", "back");
    });
    $("sackBack").addEventListener("click", function () {
      var idx = steps().indexOf("names");
      if (idx >= 0) state.step = idx + 1;
      renderChoices();
      showView("view-quiz", "back");
    });
    $("shareBtn").addEventListener("click", function () {
      $("shareSheet").hidden = false;
      $("shareFrom").focus();
    });
    $("shareGoBtn").addEventListener("click", function () {
      haptic(12);
      play("tap");
      sendShare();
    });
    $("shareCardBtn").addEventListener("click", shareCard);
    $("tabSaved").addEventListener("click", function () { state.shelfTab = "saved"; paintShelf(); });
    $("tabRecent").addEventListener("click", function () { state.shelfTab = "recent"; paintShelf(); });
    $("shelfBack").addEventListener("click", function () { showView("view-home", "back"); });
  }

  function validateCatalog(data) {
    if (!Array.isArray(data) || !data.length) throw new Error("Catalog is empty");
    data.forEach(function (p, i) {
      if (!p.asin || !p.name || !p.budget || !p.why) throw new Error("Bad product at " + i);
      if (p.approxPrice == null || Number(p.approxPrice) <= 0) throw new Error("Bad price at " + i);
      if (!p.gender) p.gender = "unisex";
      if (p.gender !== "him" && p.gender !== "her" && p.gender !== "unisex") throw new Error("Bad gender at " + i);
      if (!Array.isArray(p.vibes)) p.vibes = [];
      if (!Array.isArray(p.recipients)) p.recipients = [];
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
      $("startBtn").textContent = "Unwrap a gift";
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

  if ("serviceWorker" in navigator) {
    var registerSW = function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    };
    if (document.readyState === "complete") registerSW();
    else window.addEventListener("load", registerSW);
  }

  window.__WRAPT__ = {
    getState: function () { return state; },
    pickProduct: pickProduct,
    scoreProduct: scoreProduct,
    amazonUrl: amazonUrl,
    genderOk: genderOk,
    buildShareUrl: buildShareUrl,
    parseShare: parseShare,
    shipMessage: shipMessage,
    christmasOn: christmasOn,
    steps: steps,
  };
})();
