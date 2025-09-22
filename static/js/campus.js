// app.js — jedna scena SVG: PNG jako <image> + wektory z pliku SVG (1:1 do viewBox)

document.addEventListener("DOMContentLoaded", () => {
  // --- Konfiguracja pięter ---
  const FLOOR_OPTIONS = {
    "campus.png": ["powierzchnia", "podziemia"],
    "gok_floor1.svg": ["1 piętro", "2 piętro", "3 piętro", "4 piętro", "5 piętro", "6 piętro", "7 piętro", "8 piętro"],
    "ssw_floor1.svg": ["1 piętro", "2 piętro", "3 piętro"],
    "c3_1.svg": ["1 piętro"]
  };

  // Start: kampus
  loadSVGMap("campus.png");

  // --- Selekcje użytkownika ---
  const selected = {
    departments: new Set(),
    rooms: new Set()
  };

  // --- UI list ---

  function updateFloorSelectOptions(filename) {
    const select = document.getElementById("floor-select");
    if (!select) return;
    select.innerHTML = "";

    const options = FLOOR_OPTIONS[filename] || [];
    for (let value of options) {
      const label = isNaN(value) ? value.charAt(0).toUpperCase() + value.slice(1) : `${value} piętro`;
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      select.appendChild(opt);
    }
  }

  function updateHighlight(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll("label").forEach(label => {
      const checkbox = label.querySelector("input[type='checkbox']");
      if (checkbox && checkbox.checked) label.classList.add("active");
      else label.classList.remove("active");
    });
  }

  function renderList(items, containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    items.forEach(name => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = name;

      if (selected[type].has(name)) {
        checkbox.checked = true;
        label.classList.add("active");
      }

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selected[type].add(name);
        else selected[type].delete(name);
        updateHighlight(containerId);

        if (type === "departments") fetchRoomsForSelectedDepartments();
        if (type === "rooms") highlightSelectedRooms();
      });

      label.setAttribute("data-fulltext", name);
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(" " + name));
      container.appendChild(label);
    });

    updateHighlight(containerId);

    if (window.lucide?.createIcons) lucide.createIcons();
    const toggle = document.getElementById("toggle-theme");
    if (toggle && !toggle.dataset.bound) {
      toggle.dataset.bound = "1";
      toggle.addEventListener("click", () => {
        const html = document.documentElement;
        html.setAttribute("data-theme", html.getAttribute("data-theme") === "dark" ? "light" : "dark");
      });
    }
  }

  // --- Dane: działy i pokoje ---

  let departments = [];
  fetch("/api/departments")
    .then(res => res.json())
    .then(data => {
      departments = data || [];
      renderList(departments, "departments-list", "departments");
    });

  let rooms = [];
  fetch("/api/rooms")
    .then(res => res.json())
    .then(data => {
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
      rooms = (data || []).sort((a, b) => collator.compare(a, b));
      const term = (document.getElementById("search-rooms")?.value || "").toLowerCase();
      const filtered = rooms.filter(r => r.toLowerCase().includes(term));
      renderList(filtered, "rooms-list", "rooms");
    });

  document.getElementById("search-departments")?.addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
    const filtered = departments.filter(d => d.toLowerCase().includes(term));
    renderList(filtered, "departments-list", "departments");
  });

  document.getElementById("search-rooms")?.addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
    const filtered = rooms.filter(r => r.toLowerCase().includes(term));
    renderList(filtered, "rooms-list", "rooms");
  });

  document.getElementById("floor-select")?.addEventListener("change", (e) => {
    console.log("Wybrano piętro:", e.target.value);
  });

  // --- Zaznacz/odznacz wszystko ---

  window.selectAll = function(type) {
    const list = document.getElementById(`${type}-list`);
    if (!list) return;
    list.querySelectorAll("input[type='checkbox']").forEach(cb => {
      cb.checked = true;
      selected[type].add(cb.value);
    });
    updateHighlight(`${type}-list`);
    if (type === "departments") fetchRoomsForSelectedDepartments();
    if (type === "rooms") highlightSelectedRooms();
  };

  window.deselectAll = function(type) {
    const list = document.getElementById(`${type}-list`);
    if (!list) return;
    list.querySelectorAll("input[type='checkbox']").forEach(cb => {
      cb.checked = false;
      selected[type].delete(cb.value);
    });
    updateHighlight(`${type}-list`);
    if (type === "departments") fetchRoomsForSelectedDepartments();
    if (type === "rooms") highlightSelectedRooms();
  };

  function fetchRoomsForSelectedDepartments() {
    const params = Array.from(selected.departments)
      .map(dep => "departments=" + encodeURIComponent(dep))
      .join("&");

    fetch(`/api/rooms?${params}`)
      .then(res => res.json())
      .then(data => {
        rooms = data || [];
        const term = (document.getElementById("search-rooms")?.value || "").toLowerCase();
        const filtered = rooms.filter(r => r.toLowerCase().includes(term));
        renderList(filtered, "rooms-list", "rooms");
        highlightSelectedRooms();
      });
  }

  // --- Parsowanie ID pokoi ---

  function parseRoomId(id) {
    // nowy format: room_<building>_<floor>_<room>  (np. room_c3_1_01)
    let m = id?.match(/^room_([^_]+)_([^_]+)_([^_]+)$/i);
    if (m) return { building: m[1], floor: m[2], room: m[3].padStart(2,"0") };


    // fallback: stary format: <building>_room_<room>_floor<floor>
    m = id?.match(/^([a-z]+)_room_(\d+)_floor(\d+)$/i);
    if (m) return { building: m[1], floor: m[3], room: m[2].padStart(2, "0") };

    return null;
  }

  // pomocniczo: usunięcie polskich znaków i normalizacja
  function normalizeBasic(s) {
    return (s ?? "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/[._]/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  // wyciągnij liczby z fragmentu typu "PIETRO1" -> "1", "POKOJ07" -> "07"
  function extractNumber(part) {
    const m = String(part).match(/\d+/);
    return m ? m[0] : "";
  }

  // dwucyfrowe (01..99); jeżeli brak liczby, zwróć pusty string
  function to2(nStr) {
    if (!nStr) return "";
    const n = parseInt(nStr, 10);
    if (Number.isNaN(n)) return "";
    return String(n).padStart(2, "0");
  }

  function roomMatchesSelection(parsed, selectedRoomNames) {
    if (!parsed || !Array.isArray(selectedRoomNames)) return false;

    // znormalizuj wartości z 'parsed'
    const building = normalizeBasic(parsed.building);
    const floor    = extractNumber(normalizeBasic(parsed.floor));      // "1"
    const room     = to2(extractNumber(normalizeBasic(parsed.room)));  // "01"

    return selectedRoomNames.some(roomNameRaw => {
      const codeOnly = String(roomNameRaw).split(/\s+-\s+/)[0];
      const norm = normalizeBasic(codeOnly).replace(/\./g, "-");
      const parts = norm.split("-").filter(Boolean);
      if (parts.length !== 3) return false;

      const selBuilding = parts[0];                       // "C3"
      const selFloor    = extractNumber(parts[1]);        // "1"
      const selRoom     = to2(extractNumber(parts[2]));   // "01"

      return (
        selBuilding === building &&
        selFloor    === floor &&
        selRoom     === room
      );
    });
  }

  // --- Podświetlanie pokoi ---

  function highlightSelectedRooms() {
    const selectedRoomNames = Array.from(selected.rooms);
    const svg = document.getElementById("plan-svg");
    if (!svg) return;

    svg.querySelectorAll("rect[id], path[id], polygon[id]").forEach(el => {
      const parsed = parseRoomId(el.id);
      if (!parsed) return;

      const matched = roomMatchesSelection(parsed, selectedRoomNames);

      if (matched) {
        el.setAttribute("stroke", "#000");
        el.setAttribute("stroke-width", "1");
        el.setAttribute("fill-opacity", "0.25");
        el.setAttribute("fill", "#F07470");
      } else {
        el.setAttribute("stroke", "#ccc");
        el.setAttribute("stroke-width", "1.2");
        el.removeAttribute("fill-opacity");
        el.setAttribute("fill", "#fff0");
      }
    });
  }

  // --- Tooltipy SVG ---

  function initSVGRoomTooltips() {
    document.querySelectorAll(".svg-tooltip").forEach(t => t.remove());

    const tooltip = document.createElement("div");
    tooltip.className = "custom-tooltip svg-tooltip";
    document.body.appendChild(tooltip);
    let timeout;

    const svg = document.getElementById("plan-svg");
    if (!svg) return;

    svg.querySelectorAll("rect[id], path[id], polygon[id]").forEach(el => {
      const parsed = parseRoomId(el.id);
      if (!parsed) return;

      el.style.pointerEvents = "auto";

      el.addEventListener("mouseenter", () => {
        timeout = setTimeout(() => {
          const { building, floor, room } = parsed;

          fetch(`/api/room_info?number=${encodeURIComponent(room)}&floor=${encodeURIComponent(floor)}&building=${encodeURIComponent(String(building).toUpperCase())}`)
            .then(res => res.json())
            .then(data => {
              tooltip.innerHTML = `
                <strong>Numer pokoju:</strong> ${String(data.roomBuilding) + '.' + String(data.roomFloor) + '.' + String(data.roomNumber)|| ''}<br>
                <strong>Dział:</strong> ${data.department || ''}<br>
                <strong>Typ pokoju:</strong> ${data.roomType || ''}<br>
                <strong>Liczba stanowisk:</strong> ${data.numberOfSeats || ''}<br>
                <strong>Dla pacjentów:</strong> ${data.isForPatient || ''}<br>
                ${Array.isArray(data.workers) && data.workers.length > 0
                ? `<strong>Pracownicy:</strong>
                   <ul style="margin:0;">
                     ${data.workers.map(prac => `<li>${prac}</li>`).join("")}
                   </ul><br>`
                : ""
              }
              `;

              const b = el.getBoundingClientRect();
              const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
              const vw = window.innerWidth, vh = window.innerHeight;

              let top = b.top, left = b.right + 10;
              if (top + th > vh) top = Math.max(0, vh - th - 10);
              if (left + tw > vw) left = Math.max(0, b.left - tw - 10);

              tooltip.style.left = `${left}px`;
              tooltip.style.top = `${top}px`;
              tooltip.classList.add("visible");
            });
        }, 700);
      });

      el.addEventListener("mouseleave", () => {
        clearTimeout(timeout);
        tooltip.classList.remove("visible");
      });
    });
  }

  // --- Ładowanie mapy: JEDNO SVG zawiera PNG i wektory 1:1 ---

  function loadSVGMap(file) {
    const container = document.getElementById("svg-map-container");
    if (!container) return;

    // Widok kampusu — bez zmian
    if (file === "campus.png") {
      container.innerHTML = `
        <svg id="plan-svg" xmlns="http://www.w3.org/2000/svg"
             viewBox="0 0 6104 2000" preserveAspectRatio="xMidYMid meet"
             style="display:block;width:100%;height:auto;max-width:95vw;max-height:85vh;margin:0 auto;overflow:visible;">
        <style>
          .zone {
            fill: transparent;
            stroke: rgba(0,0,0,0);
            pointer-events: all;
            vector-effect: non-scaling-stroke;
            transition: fill 120ms ease, stroke 120ms ease, stroke-width 120ms ease;
            cursor: pointer;
          }
          .zone:hover {
            fill: rgba(255, 211, 77, 0.35);
            stroke: #FFC107;
            stroke-width: 2;
          }
        </style>
          <image href="/static/img/campus.png" x="0" y="0" width="6104" height="2000"/>

          <polygon class="zone" id="C1" data-file="c1_1.svg" points="2768,1636 3173,1409 3379,1473 3453,1434 3402,1416 3461,1383 3599,1430 3055,1735 2768,1636"/>
          <polygon class="zone" id="C2" data-file="c2_1.svg" points="2950,914 3072,847 3525,1003 3522,1348 3402,1415 3450,1433 3381,1474 2948,1333 2950,914"/>
          <polygon class="zone" id="C3" data-file="c3_1.svg" points="3526,1207 3659,1134 3951,1233 3602,1429 3461,1383 3522,1350 3526,1207"/>
          <polygon class="zone" id="DYREKCJA" data-file="dyr_floor1.svg" points="3461,830 3564,774 3820,860 3820,985 3718,1042 3461,962"/>
          <polygon class="zone" id="ZIOLOWA" data-file="ziolowa_floor.svg" points="5004,390 5306,221 5390,249 5089,418"/>
          <polygon class="zone" id="SZARY" data-file="szary_floor1.svg" points="738,1396 814,1356 1178,1482 1103,1523"/>
          <polygon class="zone" id="BIALY" data-file="bialy_floor1.svg" points="1168,1260 1249,1214 1326,1240 1246,1286"/>
          <polygon class="zone" id="JNIEBIESKI" data-file="bialy_floor1.svg" points="1405,1689 1571,1596 1706,1641 1537,1735"/>
          <polygon class="zone" id="CNIEBIESKI" data-file="bialy_floor1.svg" points="1373,1276 1454,1231 1789,1346 1709,1393"/>
          <polygon class="zone" id="CEGLA" data-file="bialy_floor1.svg" points="1774,1567 1821,1540 1924,1574 1873,1602"/>
          <polygon class="zone" id="ZIELONY" data-file="bialy_floor1.svg" points="1730,1143 1777,1119 1929,1171 1885,1198"/>
          <polygon class="zone" id="FIOLETOWY" data-file="bialy_floor1.svg" points="2070,1075 2118,1047 2253,1092 2205,1122"/>
          <polygon class="zone" id="POMARANCZOWY" data-file="bialy_floor1.svg" points="2049,877 2164,813 2213,830 2205,835 2289,863 2185,923"/>
          <polygon class="zone" id="ROZOWY" data-file="bialy_floor1.svg" points="2282,958 2389,899 2525,945 2421,1006"/>
          <polygon class="zone" id="ZOLTY" data-file="bialy_floor1.svg" points="2329,807 2411,762 2452,767 2457,748 2586,791 2890,628 3022,675 2646,886 2653,889 2633,901"/>
          <polygon class="zone" id="MBRAZOWY" data-file="bialy_floor1.svg" points="3013,618 3048,597 3116,621 3081,642"/>
          <polygon class="zone" id="DBRAZOWY" data-file="bialy_floor1.svg" points="3110,753 3176,717 3430,804 3365,842"/>
          <polygon class="zone" id="FIOLETOWY2" data-file="bialy_floor1.svg" points="2766,940 2879,878 2962,906 2949,914 2949,946 2965,951 2964,956 2949,965 2949,995 2941,1000"/>
          <polygon class="zone" id="SSW" data-file="ssw_floor1.svg" points="3500,373 3686,270 3706,275 3746,255 3805,274 3805,307 3839,318 3842,299 4294,49 4392,81 4389,467 4888,648 4460,873 4168,775 4437,628 4389,616 4391,648 3938,901 3839,868 3837,820 3803,833 3802,852 3561,772 3518,796 3500,794 3500,373"/>
        </svg>
      `;
      updateFloorSelectOptions(file);
      container.querySelectorAll("polygon[data-file]").forEach(p => {
        p.addEventListener("click", () => {
          const target = p.getAttribute("data-file");
          if (target) loadSVGMap(target);
        });
      });
      return;
    }

// --- Plany pięter: pobierz SVG, wstaw PNG i te same wektory do jednego <svg> ---
fetch(`/static/maps/${file}`)
  .then(res => {
    if (!res.ok) throw new Error(`Nie można załadować: ${file}`);
    return res.text();
  })
  .then(svgText => {
    const parser = new DOMParser();
    const srcDoc = parser.parseFromString(svgText, "image/svg+xml");
    const srcSvg = srcDoc.documentElement;

    // Wymiary z SVG defaultowe, jak nie ma w pliku svg
    let viewBox = srcSvg.getAttribute("viewBox") || "0 0 2907 1962";
    let [ , , vbW = 2907, vbH = 1962 ] = viewBox.trim().split(/\s+/).map(Number);

    const base = file.replace(/\.svg$/i, "");
    const pngUrl = `/static/maps/${base}.png`;

    // 1) Najpierw odczytaj oryginalne wymiary PNG.
    return new Promise(resolve => {
      const probe = new Image();
      probe.onload = () => resolve({
        srcSvg, pngUrl, vbW, vbH,
        pngW: probe.naturalWidth || vbW,
        pngH: probe.naturalHeight || vbH
      });
      probe.onerror = () => resolve({
        srcSvg, pngUrl, vbW, vbH,
        pngW: vbW, pngH: vbH // awaryjnie: jak SVG
      });
      probe.src = pngUrl;
    });
  })
  .then(({ srcSvg, pngUrl, vbW, vbH, pngW, pngH }) => {
    // 2) Budujemy wspólne <svg> w oryginalnych wymiarach PNG.
    const container = document.getElementById("svg-map-container");
    const NS = "http://www.w3.org/2000/svg";
    container.innerHTML = `
      <svg id="plan-svg" xmlns="${NS}"
           viewBox="0 0 ${pngW} ${pngH}"
           width="100%"
           preserveAspectRatio="xMidYMid meet"
           style="display:block;max-width:95vw;max-height:85vh;margin:0 auto;overflow:visible;">
      </svg>
    `;
    const svg = container.querySelector("#plan-svg");

    // PNG jako tło (w oryginalnych wymiarach)
    const img = document.createElementNS(NS, "image");
    img.setAttribute("href", pngUrl);
    img.setAttribute("x", 0);
    img.setAttribute("y", 0);
    img.setAttribute("width", pngW);
    img.setAttribute("height", pngH);
    img.setAttribute("preserveAspectRatio", "none");
    svg.appendChild(img);

    // Defs/gradient (gdyby kształty miały fill="url(#roomGradBabyBlue)")
    if (!svg.querySelector("#roomGradBabyBlue")) {
      const defs = document.createElementNS(NS, "defs");
      const grad = document.createElementNS(NS, "linearGradient");
      grad.setAttribute("id", "roomGradBabyBlue");
      grad.innerHTML = `<stop offset="0%" stop-color="#e7f3ff"/><stop offset="100%" stop-color="#cfe8ff"/>`;
      defs.appendChild(grad);
      svg.appendChild(defs);
    }

    // Warstwa pokoi: kopia elementów z pliku SVG (bez <image>)
    const roomsLayer = document.createElementNS(NS, "g");
    roomsLayer.setAttribute("id", "rooms-layer");
    svg.appendChild(roomsLayer);

    Array.from(srcSvg.children).forEach(node => {
      if (node.tagName?.toLowerCase() === "image") return;
      roomsLayer.appendChild(node.cloneNode(true));
    });

    // 3) Jeśli układ SVG ≠ wymiary PNG, przeskaluj warstwę z wektorami.
    //    Dzięki temu wektory siądą 1:1 na bitmapę z piętra.
    const scaleX = pngW / vbW;
    const scaleY = pngH / vbH;
    if (Number.isFinite(scaleX) && Number.isFinite(scaleY) && (Math.abs(scaleX - 1) > 1e-6 || Math.abs(scaleY - 1) > 1e-6)) {
      roomsLayer.setAttribute("transform", `scale(${scaleX} ${scaleY})`);
    }

    // Interakcje / style
    svg.querySelectorAll("text").forEach(t => { t.style.pointerEvents = "none"; });
    roomsLayer.querySelectorAll("rect, path, polygon, circle, ellipse, polyline, line").forEach(el => {
      el.style.pointerEvents = "auto";
      if (!el.getAttribute("fill")) el.setAttribute("fill", "url(#roomGradBabyBlue)");
      if (!el.getAttribute("stroke")) el.setAttribute("stroke", "#ccc");
      if (!el.getAttribute("stroke-width")) el.setAttribute("stroke-width", "1.2");
      el.setAttribute("vector-effect", "non-scaling-stroke");
    });

    // Klikalne polygony (nawigacja między planami)
    svg.querySelectorAll("polygon[data-file]").forEach(p => {
      p.style.pointerEvents = "auto";
      p.addEventListener("click", () => {
        const next = p.getAttribute("data-file");
        if (next) loadSVGMap(next);
      });
    });

    updateFloorSelectOptions(file);
    highlightSelectedRooms?.();
    initSVGRoomTooltips?.();
  })
  .catch(err => console.error("Błąd ładowania mapy:", err));

  }

  // --- Tooltips dla długich etykiet list ---

  function initCustomTooltips(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let tooltip = container._tooltip;
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "custom-tooltip";
      document.body.appendChild(tooltip);
      container._tooltip = tooltip;
    }
    let timeout;

    container.addEventListener("mouseover", (e) => {
      const label = e.target.closest("label");
      if (!label) return;

      const text = label.getAttribute("data-fulltext");
      if (!text) return;

      timeout = setTimeout(() => {
        tooltip.textContent = text;
        const rect = label.getBoundingClientRect();
        tooltip.style.left = rect.right + 12 + "px";
        tooltip.style.top = rect.top + "px";
        tooltip.classList.add("visible");
      }, 500);
    });

    container.addEventListener("mouseout", () => {
      clearTimeout(timeout);
      tooltip.classList.remove("visible");
    });
  }

  initCustomTooltips("departments-list");
  initCustomTooltips("rooms-list");

  // --- Eksport globalny ---
  window.loadSVGMap = loadSVGMap;
  window.highlightSelectedRooms = highlightSelectedRooms;
});

// --- Nawigacja między podstronami ---

function goToHospitalMap() {
  if (window.location.pathname === "/") window.location.reload();
  else window.location.href = "/";
}

function goToDataBases() {
  window.location.href = "/bazy_danych.html";
}

function goToDataCalendar() {
  window.location.href = "/harmonogram_pokoi.html";
}
