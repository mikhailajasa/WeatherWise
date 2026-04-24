const form = document.getElementById("weatherForm");
const cityInput = document.getElementById("city");
const activityInput = document.getElementById("activity");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const errorMessage = document.getElementById("errorMessage");

const resultCard = document.getElementById("resultCard");
const locationText = document.getElementById("location");
const descriptionText = document.getElementById("description");
const temperatureText = document.getElementById("temperature");
const feelsLikeText = document.getElementById("feelsLike");
const humidityText = document.getElementById("humidity");
const windSpeedText = document.getElementById("windSpeed");
const recommendationText = document.getElementById("recommendation");
const mapLink = document.getElementById("mapLink");
const forecastList = document.getElementById("forecastList");

const historyButton = document.getElementById("historyButton");
const currentLocationButton = document.getElementById("currentLocationButton");
const exportJsonButton = document.getElementById("exportJsonButton");
const exportCsvButton = document.getElementById("exportCsvButton");
const historyList = document.getElementById("historyList");

const API_URL = "http://localhost:5000";

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();
  if (!city) {
    showError("Please enter a location or use current location.");
    return;
  }
  await fetchWeather({ city });
});

currentLocationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      await fetchWeather({
        lat: position.coords.latitude,
        lon: position.coords.longitude
      });
    },
    () => showError("Location permission was denied. Please enter a city manually.")
  );
});

historyButton.addEventListener("click", loadHistory);
exportJsonButton.addEventListener("click", () => window.open(`${API_URL}/export/json`, "_blank"));
exportCsvButton.addEventListener("click", () => window.open(`${API_URL}/export/csv`, "_blank"));

async function fetchWeather(locationParams) {
  try {
    errorMessage.textContent = "";

    const params = new URLSearchParams({
      activity: activityInput.value,
      startDate: startDateInput.value,
      endDate: endDateInput.value
    });

    if (locationParams.city) params.append("city", locationParams.city);
    if (locationParams.lat && locationParams.lon) {
      params.append("lat", locationParams.lat);
      params.append("lon", locationParams.lon);
    }

    const response = await fetch(`${API_URL}/weather?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      showError(data.error || "Something went wrong.");
      return;
    }

    showWeather(data);
    loadHistory();
  } catch (error) {
    showError("Could not connect to the backend server.");
  }
}

function showWeather(data) {
  resultCard.classList.remove("hidden");

  locationText.textContent = `${data.location}${data.country ? ", " + data.country : ""}`;
  descriptionText.textContent = data.description;
  temperatureText.textContent = `${Math.round(data.temperature)}°C`;
  feelsLikeText.textContent = `${Math.round(data.feelsLike)}°C`;
  humidityText.textContent = `${data.humidity}%`;
  windSpeedText.textContent = `${data.windSpeed} m/s`;
  recommendationText.textContent = data.recommendation;
  mapLink.href = data.mapLink;

  forecastList.innerHTML = "";
  data.forecast.forEach((day) => {
    const div = document.createElement("div");
    div.className = "forecast-card";
    div.innerHTML = `
      <strong>${day.date}</strong>
      <p>${day.description}</p>
      <p>${Math.round(day.averageTemp)}°C</p>
      <p>Humidity: ${day.humidity}%</p>
      <p>Wind: ${day.windSpeed} m/s</p>
    `;
    forecastList.appendChild(div);
  });
}

function showError(message) {
  errorMessage.textContent = message;
  resultCard.classList.add("hidden");
}

async function loadHistory() {
  try {
    const response = await fetch(`${API_URL}/history`);
    const history = await response.json();

    historyList.innerHTML = "";

    if (history.length === 0) {
      historyList.innerHTML = "<li>No searches yet.</li>";
      return;
    }

    history.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${item.location}</strong> - ${Math.round(item.temperature)}°C, ${item.description}
        <br>
        <small><strong>Activity:</strong> ${item.activity || "general"}</small>
        <br>
        <small><strong>Date Range:</strong> ${item.startDate || "Not set"} to ${item.endDate || "Not set"}</small>
        <br>
        <small>${item.recommendation}</small>
        <div class="history-buttons">
          <button class="update-button" onclick="updateItem(${item.id})">Update Activity</button>
          <button class="delete-button" onclick="deleteItem(${item.id})">Delete</button>
        </div>
      `;
      historyList.appendChild(li);
    });
  } catch (error) {
    historyList.innerHTML = "<li>Could not load history.</li>";
  }
}

async function updateItem(id) {
  const newActivity = prompt("Enter new activity: general, outdoor, driving, school, or work", "general");
  if (!newActivity) return;

  const allowed = ["general", "outdoor", "driving", "school", "work"];
  if (!allowed.includes(newActivity)) {
    alert("Invalid activity. Please use: general, outdoor, driving, school, or work.");
    return;
  }

  await fetch(`${API_URL}/history/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      activity: newActivity,
      startDate: "",
      endDate: "",
      recommendation: `Updated activity to ${newActivity}.`
    })
  });

  loadHistory();
}

async function deleteItem(id) {
  const confirmDelete = confirm("Delete this saved weather record?");
  if (!confirmDelete) return;

  await fetch(`${API_URL}/history/${id}`, { method: "DELETE" });
  loadHistory();
}

loadHistory();
