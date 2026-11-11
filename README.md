# Giftaroo — mystery gift website (v1)

A mobile-first static site for a holiday mystery-gift idea: pick a budget, who it’s for, and a vibe, then tap to unwrap a random Amazon product that matches. A **Get it on Amazon** button opens the real product page with your Associates tag.

This is a website first (easy to share on TikTok). A later iOS/Android app can reuse the same flow.

## Quick start

No build step. From this folder:

```bash
# any static server works, for example:
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080) on your phone or in a phone-sized browser window.

## Swap the brand name and affiliate tag

Both live in **one config file**: [`js/config.js`](js/config.js).

```js
window.WRAPT_CONFIG = {
  brandName: "Giftaroo",       // change this to your name
  affiliateTag: "giftaroo-20", // replace with your Amazon Associates tag
};
```

That’s it. The logo, page title, and every Amazon link (`https://www.amazon.com/dp/ASIN?tag=YOURTAG`) read from those two constants. After Amazon approves your Associates account, paste your tag (it usually looks like `yourstore-20`) and redeploy.

Until you change it, links use the placeholder tag `giftaroo-20` and will not earn commission.

## Product catalog

Curated products live in [`data/products.json`](data/products.json). Each item has:

- `asin` — a real Amazon ASIN (not invented)
- `name`, `approxPrice`, `budget` (`15` / `25` / `50` / `100`)
- `vibes` and `recipients` used for matching
- `why` — a short “why it’s fun” line
- `image` — an Amazon product-image URL (the site also tries a backup image URL)

Prices are **approximate**. Amazon prices change; the site always labels them as “About $X”.

To add or remove gifts, edit the JSON (or the generator at [`scripts/build_catalog.py`](scripts/build_catalog.py) and re-run it). Only include ASINs you have actually found on Amazon or a reputable source.

## Deploy for free

The site is plain HTML, CSS, and JS. Any static host works.

### Netlify

1. Push this folder to a GitHub repo, or zip it.
2. In [Netlify](https://www.netlify.com/), click **Add new site** → **Deploy manually** (drag this folder) or connect the repo.
3. Leave the build command empty and set the publish directory to the folder that contains `index.html`.
4. You’ll get a `*.netlify.app` URL. Add a custom domain later if you want.

### Vercel

1. Install the [Vercel CLI](https://vercel.com/docs/cli) or use the dashboard.
2. In this folder: `npx vercel`.
3. Confirm it’s a static site (no framework, no build). The folder with `index.html` is the output.

### GitHub Pages

Pushes to `main` deploy the repository root with [`.github/workflows/pages.yml`](.github/workflows/pages.yml) (`actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`). A [`.nojekyll`](.nojekyll) file keeps Pages from running the site through Jekyll.

The live site is [https://monkeyzman.github.io/giftaroo/](https://monkeyzman.github.io/giftaroo/).

In the repo, **Settings → Pages** must use source **GitHub Actions** (not “Deploy from a branch”). All assets use relative paths, so the site works from the `/giftaroo/` subpath.

## Amazon Associates notes

- The required disclosure — *As an Amazon Associate I earn from qualifying purchases.* — is in the footer on every screen.
- You need an approved [Amazon Associates](https://affiliate-program.amazon.com/) account before you can earn.
- Amazon only opens its Product Advertising API after your links make a few sales. This v1 site does **not** need that API; it uses a hand-picked catalog.
- Checkout always happens on Amazon. This site never takes payment or ships anything.

## What’s in this version

- Budgets: $15 / $25 / $50 / $100
- Recipients: me, friend, partner, kid, parent, coworker
- Vibes: gamer, cozy, foodie, tech, outdoors, collector, beauty, surprise me
- Gift-box unwrap (shake + lid + confetti)
- One free reroll per round
- Mobile-first layout that also looks good centered on a desktop

## Project layout

```
index.html
css/styles.css
js/config.js          ← brand name + affiliate tag
js/app.js
data/products.json
assets/products/      ← cached product photos used in the reveal
scripts/build_catalog.py
screenshots/          ← home and reveal, captured on a phone-sized viewport
README.md
```

## Limitations

- The affiliate tag is a placeholder until you add your own.
- Prices are snapshots from public gift guides and Amazon listings (mostly November 2026) and will drift.
- Most product photos are cached locally in `assets/products/` (sourced from Amazon’s public image CDN or the gift guides used to verify each item). A few items don’t have a cached photo and show a fallback graphic instead.
- Matching relaxes recipient, then vibe, if a tight combo doesn’t have a leftover product (so a reroll still works).
- This is not an official Amazon app and does not add items to a user’s cart automatically — Amazon doesn’t allow that. The button opens the product page, and they check out there.
