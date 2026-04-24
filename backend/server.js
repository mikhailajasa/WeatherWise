require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const db = require("./database");

const app = express();
app.use(cors());
app.use(express.json());

function validateDateRange(startDate, endDate) {
  if (!startDate && !endDate) return null;
  if (!startDate || !endDate) return "Please provide both start date and end date.";

  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  const maxForecastDate = new Date();

  maxForecastDate.setDate(today.getDate() + 5);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Invalid date format.";
  }

  if (start > end) return "Start date cannot be after end date.";

  if (start < new Date(today.toDateString())) {
    return "Start date cannot be in the past.";
  }

  if (end > maxForecastDate) {
    return "End date must be within the next 5 days.";
  }

  return null;
}

function getRecommendation(temp, description, windSpeed, activity) {
  const tips = [];
  const desc = description.toLowerCase();

  if (temp < 0) {
    tips.push("It is below freezing, so wear a heavy jacket, gloves, and winter shoes.");
  } else if (temp < 5) {
    tips.push("Wear a warm jacket and layers.");
  } else if (temp > 25) {
    tips.push("Stay hydrated and wear light clothing.");
  }

  if (desc.includes("rain")) tips.push("Bring an umbrella or rain jacket.");
  if (desc.includes("snow")) tips.push("Wear boots and plan extra travel time.");
  if (desc.includes("storm") || desc.includes("thunder")) {
    tips.push("Avoid outdoor plans if possible because storms may be unsafe.");
  }

  if (windSpeed > 8) {
    tips.push("Be careful because strong wind can affect travel and make it feel colder.");
  }

  if (activity === "outdoor") {
    tips.push("Check the forecast again before staying outside for a long time.");
  }

  if (activity === "driving") {
    tips.push("Check road conditions and leave earlier if needed.");
  }

  if (activity === "school" || activity === "work") {
    tips.push("Plan your commute and dress for the temperature.");
  }

  if (tips.length === 0) {
    tips.push("The weather looks manageable. Dress comfortably and check conditions again before leaving.");
  }

  return tips.join(" ");
}

function simplifyForecast(list) {
  const daily = {};

  list.forEach((item) => {
    const date = item.dt_txt.split(" ")[0];

    if (!daily[date]) {
      daily[date] = {
        date,
        temps: [],
        descriptions: [],
        humidity: [],
        wind: []
      };
    }

    daily[date].temps.push(item.main.temp);
    daily[date].descriptions.push(item.weather[0].description);
    daily[date].humidity.push(item.main.humidity);
    daily[date].wind.push(item.wind.speed);
  });

  return Object.values(daily).slice(0, 5).map((day) => {
    const avgTemp = day.temps.reduce((a, b) => a + b, 0) / day.temps.length;
    const avgHumidity = day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length;
    const avgWind = day.wind.reduce((a, b) => a + b, 0) / day.wind.length;

    const count = {};
    day.descriptions.forEach((desc) => {
      count[desc] = (count[desc] || 0) + 1;
    });

    const mainDescription = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];

    return {
      date: day.date,
      averageTemp: Number(avgTemp.toFixed(1)),
      humidity: Math.round(avgHumidity),
      windSpeed: Number(avgWind.toFixed(1)),
      description: mainDescription
    };
  });
}

function filterForecastByDateRange(forecast, startDate, endDate) {
  if (!startDate || !endDate) return forecast;

  return forecast.filter((day) => {
    return day.date >= startDate && day.date <= endDate;
  });
}

function saveSearch(result) {
  db.run(
    `INSERT INTO searches
    (location, country, activity, startDate, endDate, temperature, feelsLike, description, humidity, windSpeed, recommendation, mapLink, forecastJson)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      result.location,
      result.country,
      result.activity,
      result.startDate || "",
      result.endDate || "",
      result.temperature,
      result.feelsLike,
      result.description,
      result.humidity,
      result.windSpeed,
      result.recommendation,
      result.mapLink,
      JSON.stringify(result.forecast || [])
    ]
  );
}

app.get("/", (req, res) => {
  res.json({ message: "WeatherWise API is running." });
});

app.get("/weather", async (req, res) => {
  const { city, lat, lon, activity = "general", startDate, endDate } = req.query;

  const dateError = validateDateRange(startDate, endDate);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  if ((!city || city.trim() === "") && (!lat || !lon)) {
    return res.status(400).json({
      error: "Please enter a city or use your current location."
    });
  }

  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "API key is missing. Add it to your .env file."
      });
    }

    const params = city
      ? { q: city, appid: apiKey, units: "metric" }
      : { lat, lon, appid: apiKey, units: "metric" };

    const [weatherResponse, forecastResponse] = await Promise.all([
      axios.get("https://api.openweathermap.org/data/2.5/weather", { params }),
      axios.get("https://api.openweathermap.org/data/2.5/forecast", { params })
    ]);

    const weather = weatherResponse.data;
    const forecast = simplifyForecast(forecastResponse.data.list);
    const filteredForecast = filterForecastByDateRange(forecast, startDate, endDate);

    const locationName = weather.name || city || `${lat}, ${lon}`;
    const description = weather.weather[0].description;
    const temperature = weather.main.temp;
    const windSpeed = weather.wind.speed;

    const result = {
      location: locationName,
      country: weather.sys?.country || "",
      activity,
      startDate,
      endDate,
      temperature,
      feelsLike: weather.main.feels_like,
      description,
      humidity: weather.main.humidity,
      windSpeed,
      recommendation: getRecommendation(temperature, description, windSpeed, activity),
      mapLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}`,
      forecast: filteredForecast.length ? filteredForecast : forecast
    };

    saveSearch(result);
    res.json(result);
  } catch (error) {
    const status = error.response?.status || 500;

    if (status === 404) {
      return res.status(404).json({
        error: "Location not found. Please check the spelling."
      });
    }

    if (status === 401) {
      return res.status(401).json({
        error: "Weather API key is invalid or not active yet."
      });
    }

    return res.status(500).json({
      error: "Could not get weather data. Please try again later."
    });
  }
});

app.get("/history", (req, res) => {
  db.all("SELECT * FROM searches ORDER BY createdAt DESC LIMIT 20", [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        error: "Could not get search history."
      });
    }

    const formattedRows = rows.map((row) => ({
      ...row,
      forecast: row.forecastJson ? JSON.parse(row.forecastJson) : []
    }));

    res.json(formattedRows);
  });
});

app.put("/history/:id", (req, res) => {
  const { id } = req.params;
  const { activity, startDate, endDate, recommendation } = req.body;

  const dateError = validateDateRange(startDate, endDate);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  db.run(
    `UPDATE searches 
     SET activity = ?, startDate = ?, endDate = ?, recommendation = ?
     WHERE id = ?`,
    [activity, startDate || "", endDate || "", recommendation || "", id],
    function (err) {
      if (err) {
        return res.status(500).json({
          error: "Update failed."
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          error: "Record not found."
        });
      }

      res.json({
        message: "Record updated successfully."
      });
    }
  );
});

app.delete("/history/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM searches WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({
        error: "Delete failed."
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        error: "Record not found."
      });
    }

    res.json({
      message: "Record deleted successfully."
    });
  });
});

app.get("/export/json", (req, res) => {
  db.all("SELECT * FROM searches ORDER BY createdAt DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        error: "Export failed."
      });
    }

    res.setHeader("Content-Disposition", "attachment; filename=weatherwise-export.json");
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(rows, null, 2));
  });
});

app.get("/export/csv", (req, res) => {
  db.all("SELECT * FROM searches ORDER BY createdAt DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        error: "Export failed."
      });
    }

    const headers = [
      "id",
      "location",
      "country",
      "activity",
      "startDate",
      "endDate",
      "temperature",
      "feelsLike",
      "description",
      "humidity",
      "windSpeed",
      "recommendation",
      "mapLink",
      "createdAt"
    ];

    const csvRows = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header] === null || row[header] === undefined ? "" : String(row[header]);
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
    ];

    res.setHeader("Content-Disposition", "attachment; filename=weatherwise-export.csv");
    res.setHeader("Content-Type", "text/csv");
    res.send(csvRows.join("\n"));
  });
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});