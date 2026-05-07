# 🤖 NEURAL HAND — Cyberpunk Gesture Control Interface

> **Control a holographic 3D orb with your bare hands.**  
> Built with MediaPipe, Three.js, and pure WebGL — no frameworks, no installs, just open and go.

**Made by [Monish Paramasivam](https://github.com/MonishParamasivam)**

---

## ✨ Live Demo

> Deploy on **GitHub Pages** — see setup instructions below.

---

## 🎮 Gesture Controls

| Gesture | What it does |
|---|---|
| ✋ **Open Palm** | Expands orb + attracts particles toward it |
| ✊ **Closed Fist** | Shrinks orb + repels particles outward |
| ☝️ **Point (1 finger)** | Fires a neon laser beam from the orb |
| ✌️ **Peace / V-Sign** | Cycles through 5 colour themes |
| 🤟 **Three Fingers** | Triggers a particle explosion burst |
| 🤏 **Pinch (thumb + index)** | Freezes / unfreezes orb rotation |
| 👍 **Thumbs Up** | Toggles wireframe mode on/off |

---

## 🖥️ Preview

```
┌──────────────────────────────────────────────┐
│  NEURAL HAND          ● TRACKING   60 FPS    │
│  v3.0.0 // GESTURE OS                        │
│                                              │
│          ✦ Holographic Orb ✦                 │
│         Glowing · Reactive · 3D              │
│                                              │
│  GESTURE  OPEN PALM      ✦ GESTURE CONTROLS  │
│  OPENNESS 87%            ✋ OPEN PALM         │
│  COLOR    CYAN           ✊ CLOSED FIST       │
│  MODE     NORMAL         ☝️ POINT             │
└──────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Option 1 — Open directly in browser
```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/neural-hand.git
cd neural-hand

# Just open index.html in Chrome or Edge
open index.html
```

> ⚠️ **Must use Chrome or Edge** — Firefox does not support the MediaPipe Camera API fully.

### Option 2 — Local dev server (recommended)
```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .

# Then open
http://localhost:8080
```

---

## 🌐 Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)` folder
4. Click **Save**
5. Your site will be live at:
   ```
   https://YOUR_USERNAME.github.io/neural-hand/
   ```

> GitHub Pages serves over HTTPS which is **required** for webcam access in browsers.

---

## 📁 Project Structure

```
neural-hand/
├── index.html      # App shell, HUD, gesture legend, permission screen
├── style.css       # Cyberpunk dark UI, glassmorphism, animations
├── app.js          # Three.js scene + MediaPipe hand tracking engine
└── README.md       # You are here
```

No build step. No npm. No bundler. Pure HTML/CSS/JS.

---

## ⚙️ Tech Stack

| Technology | Purpose |
|---|---|
| [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) | Real-time 21-point hand landmark detection |
| [Three.js r128](https://threejs.org/) | 3D orb, rings, particles, laser beam (WebGL) |
| HTML5 Canvas API | Hand skeleton overlay drawn per frame |
| CSS3 | Cyberpunk UI, glassmorphism, scanlines, animations |
| Google Fonts | Orbitron + Share Tech Mono |

All processing is **100% local** — no video data is ever sent to a server.

---

## 🎨 Colour Themes

Cycle through themes with the ✌️ **Peace gesture**:

| # | Theme | Colour |
|---|---|---|
| 1 | CYAN | `#00f5ff` |
| 2 | MAGENTA | `#ff00aa` |
| 3 | PURPLE | `#9900ff` |
| 4 | GREEN | `#00ff88` |
| 5 | GOLD | `#ffcc00` |

---

## 🔧 How It Works

```
Webcam Feed (320×240)
       ↓
MediaPipe Hands (21 landmarks, 60fps)
       ↓
Gesture Classifier (finger extension ratios, pinch distance)
       ↓
Three.js Scene Update (orb scale, position, colour, effects)
       ↓
Canvas 2D Skeleton Overlay (joints + bones drawn on screen)
```

### Gesture Detection Logic
Each gesture is detected by analysing which fingers are extended:
- **Tip Y < PIP Y** → finger is extended (screen coordinates)
- **Thumb extension** → lateral distance between tip and MCP joint
- **Pinch** → Euclidean distance between thumb tip and index tip < 0.065
- Gestures must be held for **8 consecutive frames** before triggering (debounce)

---

## 📱 Browser Compatibility

| Browser | Support |
|---|---|
| ✅ Chrome 90+ | Full support |
| ✅ Edge 90+ | Full support |
| ⚠️ Firefox | Limited (Camera API issues) |
| ⚠️ Safari | Partial (WebGL may vary) |
| ✅ Chrome on Android | Supported |

> Webcam permission is required. All data stays on your device.

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

<div align="center">

**Made with 💙 by Monish Paramasivam**

*If you found this cool, drop a ⭐ on the repo!*

</div>
