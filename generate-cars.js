#!/usr/bin/env node
/**
 * Generates one static page per car from inventory.json into /cars/.
 * Runs on every Netlify build, so pages appear and disappear as Pages CMS
 * edits inventory.json. Nothing here is edited by hand.
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SITE = "https://teamautotransports.net";
const PHONE_HREF = "tel:+17864170466";
const PHONE_TEXT = "(786) 417-0466";
const OUT_DIR = path.join(ROOT, "cars");

const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const money = n => "$" + Number(n).toLocaleString("en-US");

// Must stay identical to the slug() in site.js.
function slug(car) {
  if (car.__slug) return car.__slug;
  return [car.year, car.make, car.model, car.trim]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const title = c => `${c.year} ${c.make} ${c.model}${c.trim ? " " + c.trim : ""}`;

const PLACEHOLDER = `<svg viewBox="0 0 130 56" aria-hidden="true"><path d="M4 34q0-7 7-9l17-4 13-11h34l15 11 17 4q7 2 7 9v9H4z" fill="#56615b"/><circle cx="30" cy="43" r="8" fill="#56615b" stroke="#d9ddd8" stroke-width="4"/><circle cx="92" cy="43" r="8" fill="#56615b" stroke="#d9ddd8" stroke-width="4"/></svg>`;

function vehicleSchema(car, url, photos) {
  const s = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: title(car),
    url,
    vehicleModelDate: String(car.year),
    brand: { "@type": "Brand", name: car.make },
    model: car.model,
    itemCondition: "https://schema.org/UsedCondition"
  };
  if (car.trim) s.vehicleConfiguration = car.trim;
  if (car.vin) s.vehicleIdentificationNumber = car.vin;
  if (car.color) s.color = car.color;
  if (car.transmission) s.vehicleTransmission = car.transmission;
  if (car.miles) {
    s.mileageFromOdometer = { "@type": "QuantitativeValue", value: car.miles, unitCode: "SMI" };
  }
  if (photos.length) s.image = photos.map(p => `${SITE}/${p}`);
  s.offers = {
    "@type": "Offer",
    url,
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/UsedCondition",
    seller: { "@type": "AutoDealer", name: "Team Auto Transports", telephone: "+1-786-417-0466" }
  };
  if (car.price) {
    s.offers.price = car.price;
    s.offers.priceCurrency = "USD";
  }
  return JSON.stringify(s, null, 2);
}

function page(car) {
  const t = title(car);
  const url = `${SITE}/cars/${slug(car)}`;
  const photos = Array.isArray(car.photos) ? car.photos.filter(Boolean) : [];
  const priceLabel = car.price ? money(car.price) : "Call for price";
  const specs = [
    ["Year", String(car.year)],
    ["Make", car.make],
    ["Model", car.model],
    ["Trim", car.trim],
    ["Miles", car.miles ? Number(car.miles).toLocaleString("en-US") : ""],
    ["Transmission", car.transmission],
    ["Color", car.color],
    ["VIN", car.vin]
  ].filter(([, v]) => v);

  const smsBody = encodeURIComponent(`Hi - is the ${t} still available?`);
  const metaBits = [
    car.miles ? Number(car.miles).toLocaleString("en-US") + " miles" : "",
    car.transmission,
    car.color
  ].filter(Boolean).join(", ");
  const desc = `${t} for sale at Team Auto Transports in Hallandale Beach, FL. ${priceLabel}${metaBits ? ". " + metaBits : ""}. Call or text ${PHONE_TEXT}.`;
  const ogImage = photos.length ? `${SITE}/${photos[0]}` : `${SITE}/images/og-cover.jpg`;

  const main = photos.length
    ? `<img id="car-main" src="../${esc(photos[0])}" alt="${esc(t)}" width="1200" height="800">`
    : PLACEHOLDER;

  const strip = photos.length > 1
    ? `<div class="car-thumbs">${photos.map((p, i) =>
        `<button type="button" class="car-thumb${i === 0 ? " on" : ""}" data-src="../${esc(p)}" aria-label="Photo ${i + 1} of ${photos.length}"><img src="../${esc(p)}" alt="${esc(t)} photo ${i + 1}" loading="lazy"></button>`
      ).join("")}</div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(t)} for sale | Team Auto Transports</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="canonical" href="${url}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="theme-color" content="#0b5d3b">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Team Auto Transports">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${esc(t)} for sale | Team Auto Transports">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${esc(ogImage)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(t)} for sale | Team Auto Transports">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${esc(ogImage)}">
  <link rel="stylesheet" href="../styles.css">
  <script type="application/ld+json">
${vehicleSchema(car, url, photos)}
</script>
</head>
<body data-page="car">

<header class="site-header">
  <div class="wrap">
    <span class="bh" lang="he" dir="rtl">ב"ה</span>
    <a class="brand" href="../index.html">Team Auto Transports<small>Hallandale Beach, FL</small></a>
    <nav class="nav" aria-label="Main">
      <a href="../index.html">Home</a>
      <a href="../transport.html">Transport</a>
      <a href="../sales.html" aria-current="page">Car sales</a>
      <a href="../rentals.html">Rentals</a>
    </nav>
    <a class="header-call" href="${PHONE_HREF}">${PHONE_TEXT}</a>
  </div>
</header>

<main>
  <section class="section section-white">
    <div class="wrap">
      <p class="crumb"><a href="../sales.html">&larr; All cars for sale</a></p>
      <div class="car-detail">
        <div class="car-gallery">
          <div class="car-stage">${main}</div>
          ${strip}
        </div>
        <div class="car-info">
          <h1>${esc(t)}</h1>
          <p class="car-price-lg">${esc(priceLabel)}</p>
          ${car.notes ? `<p class="lead">${esc(car.notes)}</p>` : ""}
          <dl class="car-specs">
${specs.map(([k, v]) => `            <div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("\n")}
          </dl>
          <p class="car-cta">
            <a class="btn btn-sign" href="sms:+17864170466?&body=${smsBody}">Text about this car</a>
            <a class="btn btn-ghost" href="${PHONE_HREF}">Call ${PHONE_TEXT}</a>
          </p>
          <p class="car-note">Located in Hallandale Beach, FL. We also ship nationwide, so ask us about delivery to your door.</p>
        </div>
      </div>
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="wrap">
    <div>
      <strong>Team Auto Transports</strong>
      <p>Based in Hallandale Beach, Florida. Serving customers nationwide.</p>
      <address class="footer-nap"><a href="https://www.google.com/maps/search/?api=1&amp;query=Team+Auto+US+3107+W+Hallandale+Beach+Blvd+Hallandale+Beach+FL+33009" target="_blank" rel="noopener">3107 W Hallandale Beach Blvd<br>Hallandale Beach, FL 33009</a></address>
      <p class="footer-hours">Mon-Thu 9 am to 4 pm, Fri 9 am to 3 pm. Closed Sat and Sun.</p>
    </div>
    <div>
      <p><a href="${PHONE_HREF}">${PHONE_TEXT}</a><br>Call or text</p>
      <p>&copy; <span data-year></span> Team Auto Transports</p>
    </div>
  </div>
</footer>

<div class="call-bar">
  <a class="btn btn-paint" href="${PHONE_HREF}">Call</a>
  <a class="btn btn-ghost" style="color:#fff;border-color:#fff" href="sms:+17864170466">Text</a>
</div>

<script>
(function () {
  var main = document.getElementById("car-main");
  if (!main) return;
  document.querySelectorAll(".car-thumb").forEach(function (b) {
    b.addEventListener("click", function () {
      main.src = b.dataset.src;
      document.querySelectorAll(".car-thumb").forEach(function (o) { o.classList.remove("on"); });
      b.classList.add("on");
    });
  });
})();
</script>
<script src="../site.js"></script>
</body>
</html>
`;
}

// ---------- sitemap ----------
const START = "  <!-- cars:start -->";
const END = "  <!-- cars:end -->";

function updateSitemap(cars) {
  const file = path.join(ROOT, "sitemap.xml");
  if (!fs.existsSync(file)) return;
  let xml = fs.readFileSync(file, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  const block = [START]
    .concat(cars.map(c =>
      `  <url><loc>${SITE}/cars/${slug(c)}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`))
    .concat([END])
    .join("\n");

  if (xml.includes(START) && xml.includes(END)) {
    xml = xml.replace(new RegExp(START + "[\\s\\S]*?" + END), block);
  } else {
    xml = xml.replace("</urlset>", block + "\n</urlset>");
  }
  fs.writeFileSync(file, xml, "utf8");
}

// ---------- run ----------
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "inventory.json"), "utf8"));
const cars = (data.cars || []).filter(c => c.status !== "sold" && c.status !== "hidden");

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const seen = new Set();
for (const car of cars) {
  let s = slug(car);
  if (seen.has(s)) {
    let n = 2;
    while (seen.has(`${s}-${n}`)) n++;
    s = `${s}-${n}`;
  }
  car.__slug = s;
  seen.add(s);
  fs.writeFileSync(path.join(OUT_DIR, s + ".html"), page(car), "utf8");
  console.log("wrote cars/" + s + ".html");
}

updateSitemap(cars);
console.log(`generated ${cars.length} car page(s)`);
