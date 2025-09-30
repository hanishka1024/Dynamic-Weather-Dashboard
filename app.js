// ========= CONFIG ============
const API_KEY = "d61b029662f70c187fd662837352bf9e"; // replace with your key
const UNITS = "metric";

// ========= DOM ============
const statusEl = document.getElementById("status");
const currentCard = document.getElementById("current");
const forecastSection = document.getElementById("forecast");
const forecastCards = document.getElementById("forecast-cards");

const cityEl = document.getElementById("city");
const tempEl = document.getElementById("temp");
const descEl = document.getElementById("description");
const iconEl = document.getElementById("weather-icon");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");

const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const locBtn = document.getElementById("loc-btn");

// ========= Helpers ============
function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "#ffb4b4" : "";
}
function showLoading(msg = "Loading…") {
  showStatus(msg);
}
function hideStatus() {
  statusEl.textContent = "";
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(
      res.status + " " + res.statusText + (txt ? " — " + txt : "")
    );
  }
  return res.json();
}
function capital(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function formatDateYMD(ymd) {
  const d = new Date(ymd);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ========= API Calls ============
async function fetchWeatherByCoords(lat, lon) {
  showLoading("Fetching weather for your location…");

  try {
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${UNITS}&appid=${API_KEY}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${UNITS}&appid=${API_KEY}`;

    const [currentData, forecastData] = await Promise.all([
      fetchJSON(currentUrl),
      fetchJSON(forecastUrl),
    ]);

    renderCurrent(currentData);
    renderForecast(forecastData);

    hideStatus();
  } catch (err) {
    showStatus("Error: " + err.message, true);
    console.error(err);
  }
}

async function fetchWeatherByCity(q) {
  if (!q) return;
  showLoading(`Searching ${q}…`);
  try {
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      q
    )}&units=${UNITS}&appid=${API_KEY}`;
    const currentData = await fetchJSON(currentUrl);
    const { lat, lon } = currentData.coord;
    renderCurrent(currentData);
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${UNITS}&appid=${API_KEY}`;
    const forecastData = await fetchJSON(forecastUrl);
    renderForecast(forecastData);
    hideStatus();
  } catch (err) {
    showStatus("Error: " + err.message, true);
    console.error(err);
  }
}

// ========= Render ============
function renderCurrent(data) {
  currentCard.classList.remove("hidden");
  cityEl.textContent = `${data.name}${
    data.sys && data.sys.country ? ", " + data.sys.country : ""
  }`;
  tempEl.textContent = `${Math.round(data.main.temp)}°${
    UNITS === "metric" ? "C" : "F"
  }`;
  descEl.textContent = capital(data.weather[0].description || "");
  iconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  iconEl.alt = data.weather[0].description || "weather icon";
  humidityEl.textContent = String(data.main.humidity);
  windEl.textContent = String(data.wind.speed);

  // ====== Dynamic Background ======
  const condition = data.weather[0].main.toLowerCase(); // "Clear", "Clouds", "Rain", etc.
  const now = Math.floor(Date.now() / 1000);
  const isDay = now > data.sys.sunrise && now < data.sys.sunset;

  let bgClass = "";
  if (condition.includes("clear")) {
    bgClass = isDay ? "clear-day" : "clear-night";
  } else if (condition.includes("cloud")) {
    bgClass = isDay ? "clouds-day" : "clouds-night";
  } else if (condition.includes("rain") || condition.includes("drizzle")) {
    bgClass = isDay ? "rain-day" : "rain-night";
  } else if (condition.includes("snow")) {
    bgClass = isDay ? "snow-day" : "snow-night";
  } else {
    // fallback
    bgClass = isDay ? "clear-day" : "clear-night";
  }

  document.body.className = bgClass; // replace all body classes
}

function renderForecast(data) {
  forecastCards.innerHTML = "";
  forecastSection.classList.remove("hidden");

  const groups = {};
  data.list.forEach((it) => {
    const date = it.dt_txt.split(" ")[0];
    groups[date] = groups[date] || [];
    groups[date].push(it);
  });

  const today = new Date().toISOString().split("T")[0];
  const days = Object.keys(groups)
    .filter((d) => d !== today)
    .slice(0, 5);

  days.forEach((date) => {
    const items = groups[date];
    const temps = items.map((i) => i.main.temp);
    const min = Math.round(Math.min(...temps));
    const max = Math.round(Math.max(...temps));
    const mid = items[Math.floor(items.length / 2)];
    const icon = mid.weather[0].icon;
    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <div class="date">${formatDateYMD(date)}</div>
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${
      mid.weather[0].description
    }" />
      <div class="minmax">${min}° / ${max}°</div>
    `;
    forecastCards.appendChild(card);
  });
}

// ========= Geolocation & Events ============
function requestLocation() {
  if (!navigator.geolocation) {
    showStatus("Your browser does not support Geolocation API", true);
    return;
  }
  showLoading("Requesting location permission…");

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      fetchWeatherByCoords(latitude, longitude);
    },
    (err) => {
      showStatus(
        "Location unavailable or permission denied. Try searching a city.",
        true
      );
      console.warn("Geolocation error", err);
    },
    { enableHighAccuracy: false, maximumAge: 1000 * 60 * 5, timeout: 10000 }
  );
}

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = cityInput.value.trim();
  if (q) fetchWeatherByCity(q);
});

locBtn.addEventListener("click", () => requestLocation());

window.addEventListener("load", () => {
  // requestLocation(); // uncomment if you want auto-detect
});
