# VYOM — Voice Assistant (React + Vite)

A lightweight voice assistant frontend built with **React + Vite**. It listens to microphone input, converts speech to text, and responds using AI (via Gemini or local Web Speech APIs). Includes a polished UI with an animated floating orb component.

---

## 🚀 Features

- 🎙️ **Speech-to-Text** via browser APIs or Gemini
- 🧠 **AI responses** (Gemini integration via API key)
- 🎧 **Text-to-Speech** playback
- ✨ Interactive floating orb UI component
- 🌦️ Weather support (OpenWeather API key)

---

## 🧩 Prerequisites

- Node.js (v18+ recommended)
- npm (bundled with Node)

---

## ⚙️ Setup (Local Development)

1. Install dependencies:

```bash
npm install
```

2. Copy the example env file:

```bash
cp .env.example .env.local
```

3. Edit `.env.local` and add your keys:

- `VITE_GEMINI_API_KEY` (Gemini AI, optional)
- `VITE_OPENWEATHER_API_KEY` (optional, for weather)

4. Start the dev server:

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

---

## 🧠 Notes

- The app uses browser Web Speech APIs when Gemini isn’t configured.
- **Do not commit your real API keys** — keep them in `.env.local` and add `.env.local` to `.gitignore`.

---

## 🧪 Build

```bash
npm run build
```

## 📦 Preview Production Build

```bash
npm run preview
```

---

## 📄 License

MIT (or choose your preferred license)
