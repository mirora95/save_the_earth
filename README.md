# 🌍 Save the Earth

Save the Earth is a mobile educational game app that teaches children how to sort trash and protect the environment in a fun and interactive way.

Players control a character and catch falling items, collecting only the correct type of waste (glass, plastic, paper, or organic). The game combines simple mechanics with environmental awareness to create an engaging learning experience.

## 🎮 Live Demo

👉 https://mirora95.github.io/save_the_earth/

## 📌 Project Summary

- Static, client-side web game
- No backend or server required
- Runs directly in the browser
- Focused on recycling education and interactive learning

## 🧠 Features

- 🎯 Target-based gameplay (collect correct trash type)
- ⏱ Timer and level system
- 📈 Score, streak, and best score tracking
- 👤 Player profile (name, age, avatar)
- 💾 Local Storage persistence
- 📱 Mobile-friendly controls (touch + keyboard)
- 🎨 Smooth animations and responsive UI

## 🛠 Tech Stack

- HTML5 – structure and app mount point
- CSS3 – styling, animations, responsive design
- JavaScript (ES Modules) – game logic and rendering
- Local Storage – persistence (score + profile)

## ⚙️ Architecture Overview

The app uses a state-driven architecture with a single render root:

- `#app` → main mount node

Central state object:

- game phase (`start`, `playing`, `gameover`)
- score, level, timer, streak
- player + items

Lightweight runtime system:

- animation loop
- timers
- cached DOM references

📍 Main logic: `src/main.js`

## 🎮 Game Mechanics

### Levels

Level 1

- 45 seconds
- slower speed
- goal: 10 points

Level 2

- 60 seconds
- faster gameplay

### Gameplay

- Items fall from the top
- Player catches items in a target zone

✔ Correct item → `+1` score  
❌ Wrong item → `-1` score (min `0`)

## 🕹 Controls

- ⌨️ Keyboard: Left / Right arrows
- 👆 Touch / Mouse: Move player with pointer

### 📝 Input

- Name (required)
- Age (optional)
- Avatar selection

## 💾 Persistence

Stored in browser Local Storage:

- `save-the-earth.best-score`
- `save-the-earth.player-profile`

Includes:

- name
- age
- avatar
- best score

## 🎨 UI & Design

- CSS variables for color system
- Environmental theme with gradients
- HUD + card-based layout
- Responsive design for mobile and desktop
- Feedback animations for success/error

## 🚀 Getting Started

### Run locally

Option 1

- Open `index.html` in browser

Option 2 (recommended)

- Use Live Server in VS Code

## 🌐 Deployment

This project is fully static, so you can deploy easily:

- GitHub Pages
- Push to repository
- Enable Pages from root
- Done ✅

## 📂 Project Structure

- `index.html`
- `src/main.js`
- `src/styles.css`
- `package.json`
- `README.md`
- `metadata.json`

## ⚡ Strengths

- Very fast and lightweight
- No backend required
- Easy to deploy and share
- Clear separation of logic and UI

## ⚠️ Limitations

- No automated tests yet
- No analytics or backend tracking
- Rendering may become complex as UI grows
- Accessibility can be improved

## 🔮 Future Improvements

- ✅ Add unit tests
- ♿ Improve accessibility (ARIA, keyboard navigation)
- ⚙️ Extract game config to JSON
- 📦 Add service worker (offline mode)
- 🎯 Improve balancing and difficulty system

## 🎯 Goal

The goal of this project is to make learning about recycling simple, fun, and interactive for children.

## 👧 Author

Created as a Technovation project to promote environmental awareness through technology.
