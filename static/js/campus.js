document.addEventListener("DOMContentLoaded", () => {
  loadSVGMap("campus.png");

  const selected = {
    departments: new Set(),
    rooms: new Set()
  };
  function updateHighlight(containerId) {
    const container = document.getElementById(containerId);
    container.querySelectorAll("label").forEach(label => {
      const checkbox = label.querySelector("input[type='checkbox']");
      if (checkbox.checked) {
        label.classList.add("active");
      } else {
        label.classList.remove("active");
      }
    });
  }

  function renderList(items, containerId, type) {
    const container = document.getElementById(containerId);
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
        if (checkbox.checked) {
          selected[type].add(name);
        } else {
          selected[type].delete(name);
        }
        updateHighlight(containerId);

        if (type === "departments") fetchRoomsForSelectedDepartments();
        if (type === "rooms") highlightSelectedRooms(); // kluczowe
      });

      label.setAttribute("data-fulltext", name);
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(" " + name));
      container.appendChild(label);
    });

    updateHighlight(containerId);
  }

  let departments = [];
  fetch("/api/departments")
    .then(res => res.json())
    .then(data => {
      departments = data;
      renderList(departments, "departments-list", "departments");
    });

  let rooms = [];
  fetch("/api/rooms")
    .then(res => res.json())
    .then(data => {
      rooms = data;
      const term = document.getElementById("search-rooms").value.toLowerCase();
      const filtered = rooms.filter(r => r.toLowerCase().includes(term));
      renderList(filtered, "rooms-list", "rooms");
    });

  document.getElementById("search-departments").addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
    const filtered = departments.filter(d => d.toLowerCase().includes(term));
    renderList(filtered, "departments-list", "departments");
  });

  document.getElementById("search-rooms").addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
    const filtered = rooms.filter(r => r.toLowerCase().includes(term));
    renderList(filtered, "rooms-list", "rooms");
  });

  document.getElementById("floor-select").addEventListener("change", (e) => {
    console.log("Wybrano piętro:", e.target.value);
  });

  lucide.createIcons();
  document.getElementById('toggle-theme').addEventListener('click', () => {
    const html = document.documentElement;
    html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  window.selectAll = function(type) {
    const list = document.getElementById(`${type}-list`);
    list.querySelectorAll("input[type='checkbox']").forEach(cb => {
      cb.checked = true;
      selected[type].add(cb.value);
    });
    updateHighlight(`${type}-list`);
    if (type === "departments") {
    fetchRoomsForSelectedDepartments();
    }
    if (type === "rooms") {
    highlightSelectedRooms();
    }
  };

  window.deselectAll = function(type) {
    const list = document.getElementById(`${type}-list`);
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
        rooms = data;
        const term = document.getElementById("search-rooms").value.toLowerCase();
        const filtered = rooms.filter(r => r.toLowerCase().includes(term));
        renderList(filtered, "rooms-list", "rooms");
        highlightSelectedRooms(); // odśwież po renderze
      });
  }

  function highlightSelectedRooms() {
    const selectedRoomNames = Array.from(selected.rooms); // np. ["GOK-PIĘTRO2-POKÓJ34", ...]

    document.querySelectorAll("rect[id^='gok_room_'], rect[id^='ssw_room_']").forEach(rect => {
      const rectId = rect.id; // np. gok_room_34_floor2

      // Wyciągnij dane z rectId np. gok_room_34_floor2 → building=gok, room=34, floor=2
      const match = rectId.match(/^([a-z]+)_room_(\d+)_floor(\d+)$/);
      if (!match) return;

      const [_, building, room, floor] = match;

      const matched = selectedRoomNames.some(roomName => {
        const parts = roomName.toUpperCase().split("-");
        if (parts.length !== 3) return false;

        const [selBuilding, selFloor, selRoom] = parts;

        return (
          selBuilding.toLowerCase() === building &&
          selFloor.toLowerCase() === `piętro${floor}` &&
          selRoom.toLowerCase() === `pokój${room}`
        );
      });

      if (matched) {
        rect.setAttribute("fill", "#f44336");
        rect.setAttribute("stroke", "#000");
        rect.setAttribute("stroke-width", "2");
        rect.setAttribute("fill-opacity", "0.3");
      } else {
        rect.setAttribute("fill", "url(#roomGradBabyBlue)");
        rect.setAttribute("stroke", "#ccc");
        rect.setAttribute("stroke-width", "1.2");
      }
    });
  }

  function loadSVGMap(file) {
    const container = document.getElementById("svg-map-container");

    if (file === "campus.png") {
      container.innerHTML = `
        <svg id="svg-map" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1450 850" preserveAspectRatio="none">
          <image href="/static/img/campus.png" x="0" y="0" width="1450" height="850"/>
          <polygon id="ssw" data-file="ssw_floor1.svg" points="152,175 210,134 284,160 230,200" fill="transparent" stroke="black"/>
          <polygon id="gok" data-file="gok_floor1.svg" points="388,216 553,277 524,300 358,240" fill="transparent" stroke="black"/>
        </svg>
      `;
      container.querySelectorAll("polygon").forEach(polygon => {
        polygon.addEventListener("click", () => {
          const target = polygon.getAttribute("data-file");
          if (target) loadSVGMap(target);
        });
      });
    } else {
      fetch(`/static/maps/${file}`)
        .then(res => {
          if (!res.ok) throw new Error(`Nie można załadować: ${file}`);
          return res.text();
        })
        .then(svgContent => {
          container.innerHTML = svgContent;

          container.querySelectorAll("polygon").forEach(polygon => {
            polygon.addEventListener("click", () => {
              const next = polygon.getAttribute("data-file");
              if (next) loadSVGMap(next);
            });
          });

          highlightSelectedRooms(); // bardzo ważne
        })
        .catch(err => {
          console.error("Błąd ładowania mapy:", err);
        });
    }
  }

  function initCustomTooltips(containerId) {
    const container = document.getElementById(containerId);
    let tooltip = document.createElement("div");
    tooltip.className = "custom-tooltip";
    document.body.appendChild(tooltip);
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
});

  function goToHospitalMap() {
    if (window.location.pathname === "/") {
      window.location.reload(); // jesteśmy na campus → po prostu reload
    } else {
      window.location.href = "/"; // w innych przypadkach przejdź
    }
  }

  function goToStatistics() {
      window.location.href = '/statystyki.html';
  }
