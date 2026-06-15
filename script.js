const ELECTION_DATE = new Date("2026-09-20T00:00:00");

const SHEET_URL_BASE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSIm3RdqQFw4LRaBK6fWlpq18xjoXdDcZ-4TrzKBIZltZv-uWSF4SVbLWkmVwyS_SFdJCeQn16QlqWS/pub?output=csv";

let allEvents = [];

function noCacheUrl(url) {
  return url + "&cacheBust=" + Date.now();
}

document.addEventListener("DOMContentLoaded", () => {
  calculateDaysUntilElection();
  loadEvents();

  document.getElementById("kvFilter").addEventListener("change", renderEvents);
  document.getElementById("artFilter").addEventListener("change", renderEvents);
  document.getElementById("timeFilter").addEventListener("change", renderEvents);
  document.getElementById("searchInput").addEventListener("input", renderEvents);
  document.getElementById("showCalendarBtn").addEventListener("click", () => {
  document.getElementById("calendarView").classList.remove("hidden");
  document.getElementById("listView").classList.add("hidden");

  document.getElementById("showCalendarBtn").classList.add("active");
  document.getElementById("showListBtn").classList.remove("active");

  equalizeCalendarRows();
});

document.getElementById("showListBtn").addEventListener("click", () => {
  document.getElementById("calendarView").classList.add("hidden");
  document.getElementById("listView").classList.remove("hidden");

  document.getElementById("showCalendarBtn").classList.remove("active");
  document.getElementById("showListBtn").classList.add("active");
});
});

function loadEvents() {
  Papa.parse(noCacheUrl(SHEET_URL_BASE), {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      const parsedEvents = results.data
        .map(cleanRow)
        .filter(event => event.title && event.date)
        .sort((a, b) => a.startDateTime - b.startDateTime);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      allEvents = parsedEvents.filter(event => event.startDateTime >= today);
const pastEvents = parsedEvents.filter(event => event.startDateTime < today);

fillFilters();
renderScoreboardFromPastEvents(pastEvents);
renderEvents();

// Kalender bekommt ALLE Termine
renderCalendar(parsedEvents);
    },
    error: function (error) {
      document.getElementById("events").innerHTML =
        `<div class="empty">Fehler beim Laden der Daten.</div>`;
      console.error(error);
    }
  });
}

function cleanRow(row) {
  const title = row["Titel"] || "";
  const kv = row["Kreisverband"] || "";
  const type = row["Was findet statt?"] || row["Art"] || "";
  const date = row["Wann findet es statt"] || row["Datum"] || "";
  const start = row["Startzeit "] || row["Startzeit"] || "";
  const end = row["Endzeit (geschätzte)"] || row["Endzeit (geschätzt)"] || row["Endzeit"] || "";
  const location = row["Treffpunkt"] || "";
  const person = row["Wer ist die/der Ansprechpartner*in? (Dein Name)"] || row["Ansprechperson"] || "";
  const signal = row["Signal-Handle/Telefonnummer"] || row["Signal-Handle/ Telefonnummer"] || "";
  const hints = row["Zusätzliche Hinweise"] || "";

  return {
    title: title.trim(),
    kv: kv.trim(),
    type: type.trim(),
    date: date.trim(),
    start: formatTime(start),
    end: formatTime(end),
    location: location.trim(),
    person: person.trim(),
    signal: signal.trim(),
    hints: hints.trim(),
    startDateTime: parseDateTime(date, start)
  };
}

function parseDateTime(dateString, timeString) {
  if (!dateString) return new Date("9999-12-31");

  const parts = String(dateString).trim().split(".");
  if (parts.length !== 3) return new Date("9999-12-31");

  const day = parts[0].padStart(2, "0");
  const month = parts[1].padStart(2, "0");
  const year = parts[2];

  const time = formatTime(timeString) || "00:00";

  return new Date(`${year}-${month}-${day}T${time}:00`);
}

function formatTime(value) {
  if (!value) return "";

  let time = String(value).trim();

  if (time.includes(" ")) {
    time = time.split(" ")[0];
  }

  const parts = time.split(":");

  if (parts.length >= 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }

  return time;
}

function fillFilters() {
  const fixedKVs = [
    "LV",
    "Nord",
    "Xhain",
    "TempelSchön",
    "Mitte",
    "Neukölln",
    "Ost",
    "SteZe",
    "Spandau",
    "CharWilm"
  ];

  const fixedTypes = [
    "Plakatieren",
    "Flyern",
    "Aktionspaket Klima",
    "Aktionspaket Jugend",
    "Aktionspaket Soziales",
    "Haustürwahlkampf",
    "Demo/Kundgebung",
    "Kneipen-/Spätiwahlkampf",
    "Workshops & Vernetzung",
    "Sonstiges"
  ];

  const kvFilter = document.getElementById("kvFilter");
  const artFilter = document.getElementById("artFilter");

  kvFilter.innerHTML = `<option value="Alle">Alle Kreisverbände</option>`;
  artFilter.innerHTML = `<option value="Alle">Alle Aktionsarten</option>`;

  fixedKVs.forEach(kv => {
    const option = document.createElement("option");
    option.value = kv;
    option.textContent = kv;
    kvFilter.appendChild(option);
  });

  fixedTypes.forEach(type => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    artFilter.appendChild(option);
  });
}

function renderScoreboardFromPastEvents(events) {
  const kvList = [
    "Nord",
    "Xhain",
    "TempelSchön",
    "Mitte",
    "Neukölln",
    "Ost",
    "SteZe",
    "Spandau",
    "CharWilm"
  ];

  const counts = {};

  kvList.forEach(kv => {
    counts[kv] = 0;
  });

  events.forEach(event => {
    const kv = event.kv?.trim();

    if (!kv) return;
    if (kv === "LV") return;

    if (Object.prototype.hasOwnProperty.call(counts, kv)) {
      counts[kv]++;
    }
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const scoreboard = document.getElementById("scoreboard");

  scoreboard.innerHTML = sorted.map(([kv, count]) => `
    <div class="score-row">
      <span>${escapeHTML(kv)}</span>
      <span class="score-value">${count}</span>
    </div>
  `).join("");
}

function renderEvents() {
  const eventsContainer = document.getElementById("events");

  const kvValue = document.getElementById("kvFilter").value;
  const artValue = document.getElementById("artFilter").value;
  const timeValue = document.getElementById("timeFilter").value;
  const searchValue = document.getElementById("searchInput").value.toLowerCase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let maxDate = null;

  if (timeValue !== "all") {
    maxDate = new Date(today);
    maxDate.setDate(today.getDate() + Number(timeValue));
  }

  const filtered = allEvents.filter(event => {
    if (event.startDateTime < today) return false;

    if (kvValue !== "Alle" && event.kv !== kvValue) return false;
    const fixedTypes = [
  "Plakatieren",
  "Flyern",
  "Aktionspaket Klima",
  "Aktionspaket Jugend",
  "Aktionspaket Soziales",
  "Haustürwahlkampf",
  "Demo/Kundgebung",
  "Kneipen-/Spätiwahlkampf",
  "Workshops & Vernetzung"
];

if (artValue !== "Alle") {

  if (artValue === "Sonstiges") {
    if (fixedTypes.includes(event.type)) return false;
  } else {
    if (event.type !== artValue) return false;
  }

}
    if (maxDate && event.startDateTime > maxDate) return false;

    const searchText = `
      ${event.title}
      ${event.kv}
      ${event.type}
      ${event.location}
      ${event.person}
      ${event.signal}
      ${event.hints}
    `.toLowerCase();

    return !searchValue || searchText.includes(searchValue);
  });

  if (filtered.length === 0) {
    eventsContainer.innerHTML = `<div class="empty">Keine passenden Aktionen gefunden.</div>`;
    return;
  }

  const grouped = groupByDate(filtered);

  eventsContainer.innerHTML = Object.entries(grouped).map(([date, events]) => `
    <div class="date-group">
      <div class="date-heading">${formatDateHeading(events[0].startDateTime)}</div>
      ${events.map(renderEventCard).join("")}
    </div>
  `).join("");
}

function renderEventCard(event) {
  const timeText = event.end
    ? `${event.start}–${event.end} Uhr`
    : event.start
      ? `${event.start} Uhr`
      : "Uhrzeit folgt";

  const contactText = [event.person, event.signal].filter(Boolean).join(" · ");

  return `
    <article class="event-card">
      <div class="event-left">
        <span class="event-kv">${escapeHTML(event.kv)}</span>
        <div class="event-time">${escapeHTML(timeText)}</div>
      </div>

      <div class="event-main">
        <div class="event-title">${escapeHTML(event.title)}</div>

        <div class="event-meta">
          <div>
            <span>${getActionEmoji(event.type)} ${escapeHTML(event.type || "Art folgt")}</span>
            <span>📍 ${escapeHTML(event.location || "Treffpunkt folgt")}</span>
          </div>

          <div class="contact-row">
  <span>👤 ${escapeHTML(contactText || "Ansprechperson folgt")}</span>

  ${event.hints ? `
    <span class="event-hints">
      ℹ️ ${escapeHTML(event.hints)}
    </span>
  ` : ""}
</div>
        </div>
      </div>
    </article>
  `;
}
function renderCalendar(events) {
  const calendar = document.getElementById("calendar");

  const months = [
    { name: "Juni", month: 5, year: 2026 },
    { name: "Juli", month: 6, year: 2026 },
    { name: "August", month: 7, year: 2026 },
    { name: "September", month: 8, year: 2026 }
  ];

  calendar.innerHTML = months.map(month => {
    const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
    let daysHTML = "";

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey =
        `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const dayEvents = events.filter(event => {
        const eventKey = event.startDateTime.toISOString().split("T")[0];
        return eventKey === dateKey;
      });

      const dateObject = new Date(month.year, month.month, day);
      const weekday = dateObject.getDay();
      const isWeekend = weekday === 0 || weekday === 6;

      daysHTML += `
        <div class="calendar-day ${isWeekend ? "weekend" : ""}" data-day="${day}">
          <div class="calendar-date">
            <span>${weekdayName(dateObject)}</span>
            <strong>${day}</strong>
          </div>

          <div class="calendar-events">
            ${dayEvents.map((event, index) => `
              <div class="calendar-event ${index > 0 ? "with-border" : ""}">
                <b>${escapeHTML(event.kv)}</b><br>
                ${getActionEmoji(event.type)} ${escapeHTML(event.title)}
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    return `
      <div class="calendar-month">
        <div class="calendar-month-title">${month.name}</div>
        ${daysHTML}
      </div>
    `;
  }).join("");

  equalizeCalendarRows();
}

function equalizeCalendarRows() {
  const rows = {};

  document.querySelectorAll(".calendar-day").forEach(day => {
    const dayNumber = day.dataset.day;

    day.style.height = "auto";

    if (!rows[dayNumber]) {
      rows[dayNumber] = [];
    }

    rows[dayNumber].push(day);
  });

  Object.values(rows).forEach(days => {
    const maxHeight = Math.max(...days.map(day => day.offsetHeight));

    days.forEach(day => {
      day.style.height = maxHeight + "px";
    });
  });
}

function groupByDate(events) {
  return events.reduce((groups, event) => {
    const key = event.startDateTime.toISOString().split("T")[0];

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(event);

    return groups;
  }, {});
}

function formatDateHeading(date) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function weekdayName(date) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short"
  }).format(date);
}

function getActionEmoji(type) {
  switch (type) {
    case "Plakatieren":
      return "🪧";
    case "Flyern":
      return "🔖";
    case "Aktionspaket Klima":
      return "🔥";
    case "Aktionspaket Jugend":
      return "🏫";
    case "Aktionspaket Soziales":
      return "✊";
    case "Haustürwahlkampf":
      return "🚪";
    case "Demo/Kundgebung":
      return "📢";
    case "Kneipen-/Spätiwahlkampf":
      return "🍻";
    default:
      return "💚";
  }
}

function calculateDaysUntilElection() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = ELECTION_DATE - today;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  document.getElementById("daysUntilElection").textContent =
    `${days} Tage bis zur Wahl`;
}

function escapeHTML(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}});

function loadEvents() {
  Papa.parse(noCacheUrl(SHEET_URL_BASE), {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      const parsedEvents = results.data
        .map(cleanRow)
        .filter(event => event.title && event.date)
        .sort((a, b) => a.startDateTime - b.startDateTime);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      allEvents = parsedEvents.filter(event => event.startDateTime >= today);
const pastEvents = parsedEvents.filter(event => event.startDateTime < today);

fillFilters();
renderScoreboardFromPastEvents(pastEvents);
renderEvents();

// Kalender bekommt ALLE Termine
renderCalendar(parsedEvents);
    },
    error: function (error) {
      document.getElementById("events").innerHTML =
        `<div class="empty">Fehler beim Laden der Daten.</div>`;
      console.error(error);
    }
  });
}

function cleanRow(row) {
  const title = row["Titel"] || "";
  const kv = row["Kreisverband"] || "";
  const type = row["Was findet statt?"] || row["Art"] || "";
  const date = row["Wann findet es statt"] || row["Datum"] || "";
  const start = row["Startzeit "] || row["Startzeit"] || "";
  const end = row["Endzeit (geschätzte)"] || row["Endzeit (geschätzt)"] || row["Endzeit"] || "";
  const location = row["Treffpunkt"] || "";
  const person = row["Wer ist die/der Ansprechpartner*in? (Dein Name)"] || row["Ansprechperson"] || "";
  const signal = row["Signal-Handle/Telefonnummer"] || row["Signal-Handle/ Telefonnummer"] || "";
  const hints = row["Zusätzliche Hinweise"] || "";

  return {
    title: title.trim(),
    kv: kv.trim(),
    type: type.trim(),
    date: date.trim(),
    start: formatTime(start),
    end: formatTime(end),
    location: location.trim(),
    person: person.trim(),
    signal: signal.trim(),
    hints: hints.trim(),
    startDateTime: parseDateTime(date, start)
  };
}

function parseDateTime(dateString, timeString) {
  if (!dateString) return new Date("9999-12-31");

  const parts = String(dateString).trim().split(".");
  if (parts.length !== 3) return new Date("9999-12-31");

  const day = parts[0].padStart(2, "0");
  const month = parts[1].padStart(2, "0");
  const year = parts[2];

  const time = formatTime(timeString) || "00:00";

  return new Date(`${year}-${month}-${day}T${time}:00`);
}

function formatTime(value) {
  if (!value) return "";

  let time = String(value).trim();

  if (time.includes(" ")) {
    time = time.split(" ")[0];
  }

  const parts = time.split(":");

  if (parts.length >= 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }

  return time;
}

function fillFilters() {
  const fixedKVs = [
    "LV",
    "Nord",
    "Xhain",
    "TempelSchön",
    "Mitte",
    "Neukölln",
    "Ost",
    "SteZe",
    "Spandau",
    "CharWilm"
  ];

  const fixedTypes = [
    "Plakatieren",
    "Flyern",
    "Aktionspaket Klima",
    "Aktionspaket Jugend",
    "Aktionspaket Soziales",
    "Haustürwahlkampf",
    "Demo/Kundgebung",
    "Kneipen-/Spätiwahlkampf",
    "Workshops & Vernetzung",
    "Aktionstraining",
    "Wahlkampfurlaub",
    "Vieles",
    "Wahlabend"
  ];

  const kvFilter = document.getElementById("kvFilter");
  const artFilter = document.getElementById("artFilter");

  kvFilter.innerHTML = `<option value="Alle">Alle Kreisverbände</option>`;
  artFilter.innerHTML = `<option value="Alle">Alle Aktionsarten</option>`;

  fixedKVs.forEach(kv => {
    const option = document.createElement("option");
    option.value = kv;
    option.textContent = kv;
    kvFilter.appendChild(option);
  });

  fixedTypes.forEach(type => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    artFilter.appendChild(option);
  });
}

function renderScoreboardFromPastEvents(events) {
  const kvList = [
    "Nord",
    "Xhain",
    "TempelSchön",
    "Mitte",
    "Neukölln",
    "Ost",
    "SteZe",
    "Spandau",
    "CharWilm"
  ];

  const counts = {};

  kvList.forEach(kv => {
    counts[kv] = 0;
  });

  events.forEach(event => {
    const kv = event.kv?.trim();

    if (!kv) return;
    if (kv === "LV") return;

    if (Object.prototype.hasOwnProperty.call(counts, kv)) {
      counts[kv]++;
    }
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const scoreboard = document.getElementById("scoreboard");

  scoreboard.innerHTML = sorted.map(([kv, count]) => `
    <div class="score-row">
      <span>${escapeHTML(kv)}</span>
      <span class="score-value">${count}</span>
    </div>
  `).join("");
}

function renderEvents() {
  const eventsContainer = document.getElementById("events");

  const kvValue = document.getElementById("kvFilter").value;
  const artValue = document.getElementById("artFilter").value;
  const timeValue = document.getElementById("timeFilter").value;
  const searchValue = document.getElementById("searchInput").value.toLowerCase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let maxDate = null;

  if (timeValue !== "all") {
    maxDate = new Date(today);
    maxDate.setDate(today.getDate() + Number(timeValue));
  }

  const filtered = allEvents.filter(event => {
    if (event.startDateTime < today) return false;

    if (kvValue !== "Alle" && event.kv !== kvValue) return false;
    if (artValue !== "Alle" && event.type !== artValue) return false;
    if (maxDate && event.startDateTime > maxDate) return false;

    const searchText = `
      ${event.title}
      ${event.kv}
      ${event.type}
      ${event.location}
      ${event.person}
      ${event.signal}
      ${event.hints}
    `.toLowerCase();

    return !searchValue || searchText.includes(searchValue);
  });

  if (filtered.length === 0) {
    eventsContainer.innerHTML = `<div class="empty">Keine passenden Aktionen gefunden.</div>`;
    return;
  }

  const grouped = groupByDate(filtered);

  eventsContainer.innerHTML = Object.entries(grouped).map(([date, events]) => `
    <div class="date-group">
      <div class="date-heading">${formatDateHeading(events[0].startDateTime)}</div>
      ${events.map(renderEventCard).join("")}
    </div>
  `).join("");
}

function renderEventCard(event) {
  const timeText = event.end
    ? `${event.start}–${event.end} Uhr`
    : event.start
      ? `${event.start} Uhr`
      : "Uhrzeit folgt";

  const contactText = [event.person, event.signal].filter(Boolean).join(" · ");

  return `
    <article class="event-card">
      <div class="event-left">
        <span class="event-kv">${escapeHTML(event.kv)}</span>
        <div class="event-time">${escapeHTML(timeText)}</div>
      </div>

      <div class="event-main">
        <div class="event-title">${escapeHTML(event.title)}</div>

        <div class="event-meta">
          <div>
            <span>${getActionEmoji(event.type)} ${escapeHTML(event.type || "Art folgt")}</span>
            <span>📍 ${escapeHTML(event.location || "Treffpunkt folgt")}</span>
          </div>

          <div class="contact-row">
  <span>👤 ${escapeHTML(contactText || "Ansprechperson folgt")}</span>

  ${event.hints ? `
    <span class="event-hints">
      ℹ️ ${escapeHTML(event.hints)}
    </span>
  ` : ""}
</div>
        </div>
      </div>
    </article>
  `;
}
function renderCalendar(events) {
  const calendar = document.getElementById("calendar");

  const months = [
    { name: "Juni", month: 5, year: 2026 },
    { name: "Juli", month: 6, year: 2026 },
    { name: "August", month: 7, year: 2026 },
    { name: "September", month: 8, year: 2026 }
  ];

  calendar.innerHTML = months.map(month => {
    const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
    let daysHTML = "";

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey =
        `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const dayEvents = events.filter(event => {
        const eventKey = event.startDateTime.toISOString().split("T")[0];
        return eventKey === dateKey;
      });

      const dateObject = new Date(month.year, month.month, day);
      const weekday = dateObject.getDay();
      const isWeekend = weekday === 0 || weekday === 6;

      daysHTML += `
        <div class="calendar-day ${isWeekend ? "weekend" : ""}" data-day="${day}">
          <div class="calendar-date">
            <span>${weekdayName(dateObject)}</span>
            <strong>${day}</strong>
          </div>

          <div class="calendar-events">
            ${dayEvents.map((event, index) => `
              <div class="calendar-event ${index > 0 ? "with-border" : ""}">
                <b>${escapeHTML(event.kv)}</b><br>
                ${getActionEmoji(event.type)} ${escapeHTML(event.title)}
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    return `
      <div class="calendar-month">
        <div class="calendar-month-title">${month.name}</div>
        ${daysHTML}
      </div>
    `;
  }).join("");

  equalizeCalendarRows();
}

function equalizeCalendarRows() {
  const rows = {};

  document.querySelectorAll(".calendar-day").forEach(day => {
    const dayNumber = day.dataset.day;

    day.style.height = "auto";

    if (!rows[dayNumber]) {
      rows[dayNumber] = [];
    }

    rows[dayNumber].push(day);
  });

  Object.values(rows).forEach(days => {
    const maxHeight = Math.max(...days.map(day => day.offsetHeight));

    days.forEach(day => {
      day.style.height = maxHeight + "px";
    });
  });
}

function groupByDate(events) {
  return events.reduce((groups, event) => {
    const key = event.startDateTime.toISOString().split("T")[0];

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(event);

    return groups;
  }, {});
}

function formatDateHeading(date) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function weekdayName(date) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short"
  }).format(date);
}

function getActionEmoji(type) {
  switch (type) {
    case "Plakatieren":
      return "🪧";
    case "Flyern":
      return "🔖";
    case "Aktionspaket Klima":
      return "🔥";
    case "Aktionspaket Jugend":
      return "🏫";
    case "Aktionspaket Soziales":
      return "✊";
    case "Haustürwahlkampf":
      return "🚪";
    case "Demo/Kundgebung":
      return "📢";
    case "Kneipen-/Spätiwahlkampf":
      return "🍻";
    default:
      return "💚";
  }
}

function calculateDaysUntilElection() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = ELECTION_DATE - today;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  document.getElementById("daysUntilElection").textContent =
    `${days} Tage bis zur Wahl`;
}

function escapeHTML(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
