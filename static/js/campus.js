document.addEventListener("DOMContentLoaded", () => {
  const selected = {
    departments: new Set(),
    rooms: new Set()
  };

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
        // Jeśli zmieniany jest dział → przeładuj pokoje
        if (type === "departments") {
          fetchRoomsForSelectedDepartments();
          }
      });

      label.setAttribute("data-fulltext", name);
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(" " + name));
      container.appendChild(label);
    });

    updateHighlight(containerId); // <- kluczowy krok!
  }

  // API - pobieranie
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

  // Filtrowanie działów
  document.getElementById("search-departments").addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
    const filtered = departments.filter(d => d.toLowerCase().includes(term));
    renderList(filtered, "departments-list", "departments");
  });

  // Filtrowanie pokoi
  document.getElementById("search-rooms").addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
    const filtered = rooms.filter(r => r.toLowerCase().includes(term));
    renderList(filtered, "rooms-list", "rooms");
  });

  // Zmiana piętra
  document.getElementById("floor-select").addEventListener("change", (e) => {
    console.log("Wybrano piętro:", e.target.value);
  });

  // Zmiana motywu
  lucide.createIcons();
  document.getElementById('toggle-theme').addEventListener('click', () => {
    const html = document.documentElement;
    html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  // Kliknięcie na obszar mapy
  document.querySelectorAll("#svg-map polygon").forEach(polygon => {
    polygon.addEventListener("click", () => {
      const file = polygon.getAttribute("data-file");
      if (file) {
        window.location.href = `/plan_szpitala/${file}`;
      }
    });
  });

  // Publiczne funkcje
  window.selectAll = function(type) {
    const list = document.getElementById(`${type}-list`);
    list.querySelectorAll("input[type='checkbox']").forEach(cb => {
      cb.checked = true;
      selected[type].add(cb.value);
    });
    updateHighlight(`${type}-list`);
    if (type === "departments") fetchRoomsForSelectedDepartments();
  };

  window.deselectAll = function(type) {
    const list = document.getElementById(`${type}-list`);
    list.querySelectorAll("input[type='checkbox']").forEach(cb => {
      cb.checked = false;
      selected[type].delete(cb.value);
    });
    updateHighlight(`${type}-list`);
    if (type === "departments") fetchRoomsForSelectedDepartments();
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
      });
  }

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
      }, 1000);
    });

    container.addEventListener("mouseout", () => {
      clearTimeout(timeout);
      tooltip.classList.remove("visible");
    });
  }

  // Włącz tooltipy dla działów i pokoi
  initCustomTooltips("departments-list");
//  initCustomTooltips("rooms-list");
});
