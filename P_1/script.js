const API_KEY = "2038d94718601e310000ab4aa3aaa150";

const elements = {
    cityInput: document.getElementById("cityInput"),
    searchBtn: document.getElementById("searchBtn"),
    geoBtn: document.getElementById("geoBtn"),
    saveBtn: document.getElementById("saveBtn"),
    themeBtn: document.getElementById("themeBtn"),
    statusEl: document.getElementById("status"),
    currentCard: document.getElementById("currentCard"),
    cityNameEl: document.getElementById("cityName"),
    descEl: document.getElementById("desc"),
    weatherIconEl: document.getElementById("weatherIcon"),
    tempEl: document.getElementById("temp"),
    feelsEl: document.getElementById("feels"),
    humidityEl: document.getElementById("humidity"),
    windEl: document.getElementById("wind"),
    forecastCard: document.getElementById("forecastCard"),
    forecastList: document.getElementById("forecastList"),
    favoritesList: document.getElementById("favoritesList"),
    chartCard: document.getElementById("chartCard"),
    tempChartCanvas: document.getElementById("tempChart"),
};

let tempChart = null;

function setStatus(msg, isError = false) {
    elements.statusEl.textContent = msg;
    elements.statusEl.style.color = isError ? "var(--danger-color)" : "var(--success-color)";
}

function toggleElement(el, show) {
    el.classList.toggle("hidden", !show);
}

function buildIconUrl(icon) {
    return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

function loadFavorites() {
    return JSON.parse(localStorage.getItem("weather_favs") || "[]");
}

function saveFavorites(favs) {
    localStorage.setItem("weather_favs", JSON.stringify(favs));
    renderFavorites();
}

function renderFavorites() {
    const favs = loadFavorites();
    elements.favoritesList.innerHTML = favs.length ? favs.map(city => `
        <div class="fav" data-city="${city}">
            ${city}
            <button class="remove-fav" data-city-remove="${city}" title="Remove ${city}">&times;</button>
        </div>`).join('') : "<small>No saved cities</small>";

    document.querySelectorAll(".fav").forEach(el => {
        el.addEventListener("click", (e) => {
            if (e.target.classList.contains('remove-fav')) return;
            fetchWeatherByCity(el.dataset.city);
        });
    });

    document.querySelectorAll(".remove-fav").forEach(el => {
        el.addEventListener("click", () => {
            const cityToRemove = el.dataset.cityRemove;
            let currentFavs = loadFavorites().filter(fav => fav !== cityToRemove);
            saveFavorites(currentFavs);
            setStatus(`Removed ${cityToRemove}`);
        });
    });
}

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || "Failed to fetch data");
    }
    return res.json();
}

async function fetchWeatherByCity(city) {
    if (!city) return setStatus("Enter a city name.", true);
    setStatus(`Loading weather for ${city}...`);
    try {
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
        const [current, forecast] = await Promise.all([fetchJSON(currentUrl), fetchJSON(forecastUrl)]);
        handleWeatherData(current, forecast);
    } catch (err) {
        setStatus(`Error: ${err.message}`, true);
    }
}

async function fetchWeatherByCoords({ latitude, longitude }) {
    setStatus("Loading weather for your location...");
    try {
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`;
        const [current, forecast] = await Promise.all([fetchJSON(currentUrl), fetchJSON(forecastUrl)]);
        handleWeatherData(current, forecast);
    } catch (err) {
        setStatus(`Error: ${err.message}`, true);
    }
}

function processForecast(forecastList) {
    const dailyData = new Map();
    for (const item of forecastList) {
        const date = new Date(item.dt * 1000);
        const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        if (!dailyData.has(dayKey)) {
            dailyData.set(dayKey, { temps: [], icon: item.weather[0].icon, desc: item.weather[0].description });
        }
        dailyData.get(dayKey).temps.push(item.main.temp);
    }

    const sortedDays = Array.from(dailyData.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    return sortedDays.slice(0, 5).map(([date, data]) => {
        const tempMin = Math.min(...data.temps);
        const tempMax = Math.max(...data.temps);
        return { date, tempMin, tempMax, icon: data.icon, desc: data.desc };
    });
}

function handleWeatherData(current, forecast) {
    elements.cityNameEl.textContent = `${current.name}, ${current.sys.country}`;
    elements.descEl.textContent = current.weather[0].description.replace(/\b\w/g, c => c.toUpperCase());
    elements.weatherIconEl.src = buildIconUrl(current.weather[0].icon);
    elements.tempEl.textContent = `${Math.round(current.main.temp)}°C`;
    elements.feelsEl.textContent = `${Math.round(current.main.feels_like)}°C`;
    elements.humidityEl.textContent = `${current.main.humidity}%`;
    elements.windEl.textContent = `${current.wind.speed} m/s`;

    const processed = processForecast(forecast.list);
    renderForecast(processed);
    renderChart(processed);

    toggleElement(elements.currentCard, true);
    toggleElement(elements.forecastCard, true);
    toggleElement(elements.chartCard, true);
    setStatus(`Showing weather for ${current.name}, ${current.sys.country}`);
}

function renderForecast(days) {
    elements.forecastList.innerHTML = days.map(d => {
        const [year, month, dayNum] = d.date.split('-');
        const localDate = new Date(year, month - 1, dayNum);
        const day = localDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        return `
            <div class="forecast-item">
                <div class="day">${day}</div>
                <img src="${buildIconUrl(d.icon)}" alt="${d.desc}" />
                <div class="temp">${Math.round(d.tempMin)}° / ${Math.round(d.tempMax)}°</div>
            </div>`;
    }).join('');
}

function getThemeColors() {
    const style = getComputedStyle(document.body);
    return {
        accent: style.getPropertyValue('--accent-color').trim(),
        text: style.getPropertyValue('--text-secondary').trim(),
        grid: style.getPropertyValue('--grid-color').trim(),
        accentBg: style.getPropertyValue('--accent-color').trim() + '1A',
    };
}

function renderChart(days) {
    const colors = getThemeColors();
    const labels = days.map(d => {
        const [year, month, dayNum] = d.date.split('-');
        const localDate = new Date(year, month - 1, dayNum);
        return localDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });
    const data = days.map(d => (d.tempMin + d.tempMax) / 2);

    if (tempChart) {
        tempChart.data.labels = labels;
        tempChart.data.datasets[0].data = data;
        updateChartTheme();
        return;
    }

    tempChart = new Chart(elements.tempChartCanvas.getContext("2d"), {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Temp (°C)",
                data,
                fill: true,
                borderColor: colors.accent,
                backgroundColor: colors.accentBg,
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: colors.accent
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: false, ticks: { color: colors.text }, grid: { color: colors.grid } },
                x: { ticks: { color: colors.text }, grid: { color: colors.grid } }
            }
        }
    });
}

function updateChartTheme() {
    if (!tempChart) return;
    const colors = getThemeColors();
    const ds = tempChart.data.datasets[0];
    ds.borderColor = colors.accent;
    ds.backgroundColor = colors.accentBg;
    ds.pointBackgroundColor = colors.accent;
    
    tempChart.options.scales.y.ticks.color = colors.text;
    tempChart.options.scales.x.ticks.color = colors.text;
    tempChart.options.scales.y.grid.color = colors.grid;
    tempChart.options.scales.x.grid.color = colors.grid;
    tempChart.update();
}

function initializeEventListeners() {
    elements.searchBtn.addEventListener("click", () => fetchWeatherByCity(elements.cityInput.value.trim()));
    elements.cityInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") fetchWeatherByCity(elements.cityInput.value.trim());
    });
    elements.geoBtn.addEventListener("click", () => {
        if (!navigator.geolocation) return setStatus("Geolocation not supported.", true);
        setStatus("Requesting location...");
        navigator.geolocation.getCurrentPosition(
            pos => fetchWeatherByCoords(pos.coords),
            err => setStatus(`Location error: ${err.message}`, true)
        );
    });
    elements.saveBtn.addEventListener("click", () => {
        const name = (elements.cityNameEl.textContent || "").split(",")[0].trim();
        if (!name) return setStatus("No city to save.", true);
        const favs = loadFavorites();
        if (!favs.includes(name)) {
            saveFavorites([name, ...favs].slice(0, 6));
            setStatus(`Saved ${name}`);
        } else {
            setStatus(`${name} is already saved`);
        }
    });
    elements.themeBtn.addEventListener("click", () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('weather_theme', isLight ? 'light' : 'dark');
        updateChartTheme();
    });
}

function init() {
    if (localStorage.getItem('weather_theme') === 'light') {
        document.body.classList.add('light-mode');
    }
    renderFavorites();
    initializeEventListeners();
    setStatus("Ready. Search a city or use your location.");
}

init();

