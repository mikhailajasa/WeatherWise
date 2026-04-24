# WeatherWise – Full Stack Weather App

Hello, my name is Mikhail Ajasa and this project is my full stack weather application built for the AI Engineer Intern technical assessment at PM Accelerator.

I completed both the:
- Technical Assessment #1 (Frontend)
- Technical Assessment #2 (Backend)

---

## What the App Does

This app lets a user check the weather for any location.

- The user can enter a city or town.  
- The user can also use their current location if they want to  
- The app shows current weather and a 5-day forecast  
- It gives simple recommendations based on the weather (like clothing tips for a cool touch)  
- Each search is saved in a database  
- Users can update or delete the saved searches  
- Data can then be exported as a JSON or CSV  
- A Google Maps link is provided for each location as well.  

---

## Tech Stack

Frontend:
- HTML
- CSS
- JavaScript

Backend:
- Node.js
- Express
- SQLite
- Axios
- OpenWeatherMap API

---

## How to Run the Project

1. Clone or download the repository

2. Open the project in VS Code

3. Go to the backend folder:

cd backend

4. Then install the required packages:

npm install

5. Create a `.env` file inside the backend folder and add:

OPENWEATHER_API_KEY=your_api_key_here  
PORT=5000  

6. Start the backend server:

npm start

You should see this:

Server running on port 5000

7. Open the frontend:

- Go to the `frontend` folder  
- Open `index.html` using Live Server or double click it  

---

