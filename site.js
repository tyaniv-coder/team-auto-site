// Team Auto Transports - shared script

// Footer year
document.querySelectorAll("[data-year]").forEach(el => { el.textContent = new Date().getFullYear(); });

// ---------- Forms (Netlify Forms, submitted in place so the visitor stays on the page) ----------
document.querySelectorAll("form[data-netlify]").forEach(form => {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const msg = form.querySelector(".form-msg");
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending...";
    msg.className = "form-msg";
    msg.textContent = "";
    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString()
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      msg.classList.add("ok");
      msg.textContent = form.dataset.success || "Sent. We will call or text you shortly.";
    } catch (err) {
      msg.classList.add("err");
      msg.textContent = "Message did not go through. Call or text (786) 417-0466 instead.";
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  });
});

// Buttons that preselect a request type on the sales form, e.g. data-request="Sell my car"
document.querySelectorAll("[data-request]").forEach(btn => {
  btn.addEventListener("click", () => {
    const radio = document.querySelector(`input[name="request"][value="${btn.dataset.request}"]`);
    if (radio) radio.checked = true;
  });
});

// ---------- Inventory ----------
const grid = document.getElementById("inventory");
if (grid) {
  const status = document.getElementById("inventory-status");
  const money = n => "$" + Number(n).toLocaleString("en-US");
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  fetch("inventory.json", { cache: "no-store" })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      const cars = (data.cars || []).filter(c => c.status !== "sold" && c.status !== "hidden");
      if (!cars.length) {
        status.textContent = "Inventory is being updated. Call or text for what just came in.";
        return;
      }
      status.textContent = "";
      grid.innerHTML = cars.map(c => {
        const title = `${c.year} ${c.make} ${c.model}${c.trim ? " " + c.trim : ""}`;
        const meta = [c.miles ? Number(c.miles).toLocaleString("en-US") + " miles" : "", c.transmission, c.color].filter(Boolean).join(", ");
        const photo = c.photos && c.photos.length
          ? `<img src="${esc(c.photos[0])}" alt="${esc(title)}" loading="lazy">`
          : `<svg viewBox="0 0 130 56" aria-hidden="true"><path d="M4 34q0-7 7-9l17-4 13-11h34l15 11 17 4q7 2 7 9v9H4z" fill="#56615b"/><circle cx="30" cy="43" r="8" fill="#56615b" stroke="#d9ddd8" stroke-width="4"/><circle cx="92" cy="43" r="8" fill="#56615b" stroke="#d9ddd8" stroke-width="4"/></svg>`;
        const count = c.photos && c.photos.length > 1 ? `<span class="photo-count">${c.photos.length} photos</span>` : "";
        const price = c.price ? money(c.price) : "Call for price";
        const sms = encodeURIComponent(`Hi - is the ${title} still available?`);
        return `
          <article class="car">
            <div class="car-photo">${photo}${count}</div>
            <div class="car-body">
              <h3>${esc(title)}</h3>
              ${meta ? `<p class="car-meta">${esc(meta)}</p>` : ""}
              <p class="car-price">${price}</p>
              ${c.vin ? `<p class="car-meta">VIN ${esc(c.vin)}</p>` : ""}
              ${c.notes ? `<p class="car-meta">${esc(c.notes)}</p>` : ""}
              <a class="btn btn-sign" href="sms:+17864170466?&body=${sms}">Text about this car</a>
            </div>
          </article>`;
      }).join("");
    })
    .catch(() => {
      status.textContent = "Inventory did not load. Call or text (786) 417-0466 for current cars.";
    });
}

// ---------- Chat widget (scripted, no AI cost). Messages land in Netlify Forms as "chat". ----------
(function () {
  const PHONE = "(786) 417-0466";
  const TURO = "https://turo.com/us/en/host/16990759";
  const page = document.body.dataset.page || "home";
  const topics = {
    transport: { label: "Ship a car", ask: "Where is it now, where is it going, and what car is it? ZIP codes are perfect." },
    buy: { label: "Buy a car", ask: "Which car are you interested in, or what are you looking for?" },
    sell: { label: "Sell my car", ask: "Year, make, model and miles? Any issues we should know about?" },
    auction: { label: "Car from auction", ask: "What car do you want and what is your budget?" },
    rental: { label: "Rent a car", ask: "Which dates and what kind of car? Bookings run through Turo, but ask anything here." },
    other: { label: "Something else", ask: "Go ahead, what is your question?" }
  };
  const order = {
    transport: ["transport", "other"],
    sales: ["buy", "sell", "auction", "other"],
    rentals: ["rental", "other"],
    home: ["transport", "buy", "sell", "auction", "rental"]
  }[page] || Object.keys(topics);

  const launch = document.createElement("button");
  launch.className = "chat-launch";
  launch.type = "button";
  launch.setAttribute("aria-expanded", "false");
  launch.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v12H8l-4 4z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>Chat with us';

  const panel = document.createElement("div");
  panel.className = "chat-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chat with Team Auto Transports");
  panel.innerHTML = `
    <div class="chat-head"><div><strong>Team Auto Transports</strong><small>Leave a message, we call or text back</small></div>
    <button class="chat-close" type="button" aria-label="Close chat">&times;</button></div>
    <div class="chat-log" aria-live="polite"></div>
    <form class="chat-input" autocomplete="on"><input type="text" aria-label="Type your message" placeholder="Type here" disabled>
    <button class="btn btn-sign" type="submit" disabled>Send</button></form>`;
  document.body.append(launch, panel);

  const log = panel.querySelector(".chat-log");
  const form = panel.querySelector(".chat-input");
  const input = form.querySelector("input");
  const sendBtn = form.querySelector("button");
  const data = { topic: "", details: "", name: "", phone: "", page: location.pathname };
  let step = "topic";
  let started = false;

  const bubble = (text, who = "bot", html = false) => {
    const b = document.createElement("div");
    b.className = "bubble " + who;
    html ? (b.innerHTML = text) : (b.textContent = text);
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
    return b;
  };
  const enableInput = (placeholder, type = "text") => {
    input.type = type;
    input.placeholder = placeholder;
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  };
  const disableInput = () => { input.disabled = true; sendBtn.disabled = true; input.value = ""; };

  function showTopics() {
    bubble("Hi, what can we help you with?");
    const wrap = document.createElement("div");
    wrap.className = "chat-choices";
    order.forEach(key => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = topics[key].label;
      b.onclick = () => {
        wrap.remove();
        data.topic = topics[key].label;
        bubble(topics[key].label, "me");
        if (key === "rental") bubble(`You can see live availability and book here: <a href="${TURO}" target="_blank" rel="noopener">our cars on Turo</a>.`, "bot", true);
        bubble(topics[key].ask);
        step = "details";
        enableInput("Type your message");
      };
      wrap.appendChild(b);
    });
    log.appendChild(wrap);
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const val = input.value.trim();
    if (!val) return;
    bubble(val, "me");
    disableInput();
    if (step === "details") {
      data.details = val;
      step = "name";
      bubble("Thanks. What is your name?");
      enableInput("Your name");
    } else if (step === "name") {
      data.name = val;
      step = "phone";
      bubble(`Nice to meet you, ${val}. Best number to call or text you?`);
      enableInput("Phone number", "tel");
    } else if (step === "phone") {
      if (val.replace(/\D/g, "").length < 10) {
        bubble("That number looks short. Please include the area code.");
        enableInput("Phone number", "tel");
        return;
      }
      data.phone = val;
      step = "done";
      const wait = bubble("Sending...");
      try {
        const res = await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ "form-name": "chat", ...data }).toString()
        });
        if (!res.ok) throw new Error(res.status);
        wait.textContent = `Got it. We will call or text you at ${data.phone} shortly. In a hurry? Call ${PHONE}.`;
      } catch {
        wait.innerHTML = `Message did not go through. Please <a href="tel:+17864170466">call</a> or <a href="sms:+17864170466">text</a> ${PHONE}.`;
      }
    }
  });

  const toggle = open => {
    panel.classList.toggle("open", open);
    launch.style.display = open ? "none" : "";
    launch.setAttribute("aria-expanded", String(open));
    if (open && !started) { started = true; showTopics(); }
  };
  launch.onclick = () => toggle(true);
  panel.querySelector(".chat-close").onclick = () => toggle(false);
  document.addEventListener("keydown", e => { if (e.key === "Escape") toggle(false); });
})();
