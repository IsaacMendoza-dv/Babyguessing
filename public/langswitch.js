// Interruptor de idioma de tres opciones (EN · FIL · ES), accesible como grupo de radio.
// Uso: LangSwitch.init(contenedor, { names: {en:"English",...}, value: "en", onChange: (code) => {} })
window.LangSwitch = (() => {
  const ORDER = ["en", "fil", "es"];
  const SHORT = { en: "EN", fil: "FIL", es: "ES" };
  const FLAG = { en: "flags/us.svg", fil: "flags/ph.svg", es: "flags/mx.svg" };

  function init(root, { names, value, onChange }) {
    root.textContent = "";
    root.classList.add("lang-switch");

    const seg = document.createElement("div");
    seg.className = "seg";
    seg.setAttribute("role", "radiogroup");
    seg.setAttribute("aria-label", "Language / Idioma / Wika");

    const thumb = document.createElement("span");
    thumb.className = "thumb";
    thumb.setAttribute("aria-hidden", "true");
    seg.append(thumb);

    const codes = ORDER.filter((c) => names[c]);
    const buttons = codes.map((code) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("lang", code);
      b.setAttribute("aria-label", names[code]);
      b.title = names[code];
      b.dataset.code = code;
      const flag = document.createElement("img");
      flag.className = "flag";
      flag.src = FLAG[code];
      flag.alt = "";
      flag.width = 20;
      flag.height = 20;
      b.append(flag, document.createTextNode(SHORT[code]));
      seg.append(b);
      return b;
    });

    function set(code, notify) {
      const index = Math.max(0, codes.indexOf(code));
      seg.style.setProperty("--i", String(index));
      seg.style.setProperty("--n", String(codes.length));
      buttons.forEach((b, i) => {
        const on = i === index;
        b.setAttribute("aria-checked", String(on));
        b.tabIndex = on ? 0 : -1;
      });
      if (notify) onChange(codes[index]);
    }

    seg.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-code]");
      if (b) set(b.dataset.code, true);
    });

    seg.addEventListener("keydown", (e) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      const current = buttons.findIndex((b) => b.getAttribute("aria-checked") === "true");
      const next = (current + keys[e.key] + codes.length) % codes.length;
      set(codes[next], true);
      buttons[next].focus();
    });

    root.append(seg);
    set(value, false);
    return { set: (code) => set(code, false) };
  }

  return { init };
})();
