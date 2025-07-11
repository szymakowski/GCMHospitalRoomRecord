document.addEventListener("DOMContentLoaded", () => {
  const rooms = ["101", "102", "103"];

  function renderList(items, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    items.forEach(name => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = name;
      label.appendChild(checkbox);
      label.setAttribute("data-fulltext", name);
      label.appendChild(document.createTextNode(" " + name));
      container.appendChild(label);
    });
  }

  // Pobierz działy z API
  let departments = [];
  fetch("/api/departments")
    .then(res => res.json())
    .then(data => {
      departments = data;
      renderList(departments, "departments-list");
    })
    .catch(err => console.error("Błąd ładowania działów:", err));

  document.getElementById("search-departments").addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
    const filtered = departments.filter(d => d.toLowerCase().includes(term));
    renderList(filtered, "departments-list");
  });

  renderList(rooms, "rooms-list");
  document.getElementById("search-rooms").addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
    const filtered = rooms.filter(r => r.toLowerCase().includes(term));
    renderList(filtered, "rooms-list");
  });

  // Kliknięcie na hotspot
  document.querySelectorAll("#svg-map polygon").forEach(polygon => {
    polygon.addEventListener("click", () => {
      const file = polygon.getAttribute("data-file");
      if (file) {
        window.location.href = `/plan_szpitala/${file}`;
      }
    });
  });

  // Zmiana piętra – załaduj nową mapę (jeśli potrzebujesz dynamicznie)
  document.getElementById("floor-select").addEventListener("change", (e) => {
    const floor = e.target.value;
    // Można tu podmienić image.href lub przełączyć widok mapy
    console.log("Wybrano piętro:", floor);
  });
});
