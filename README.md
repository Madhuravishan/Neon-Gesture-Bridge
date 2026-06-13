# 🌌 Neon Bridge: Real-Time Hand Tracking

An interactive computer vision web application that tracks hand movements in real-time, renders glowing neon lines between fingertips, and detects pinch gestures using a webcam.

## ✨ Features

* **Cross-Hand Bridging:** When two hands are detected, the app draws dynamic, glowing lines connecting corresponding fingertips (thumb-to-thumb, index-to-index, etc.).
* **Pinch Detection:** Calculates the spatial distance between the thumb and index finger in real-time. If a pinch is detected, the UI instantly updates to "Gesture: PINCH" and the neon effects turn a vibrant red.
* **High-Performance Tracking:** Utilizes Google's MediaPipe tasks-vision library leveraging WebAssembly and GPU delegation for smooth, high-framerate detection right in the browser.
* **Custom Canvas Rendering:** Features a custom drawing loop utilizing HTML5 Canvas `shadowBlur` and `shadowColor` to create realistic glowing neon aesthetics over a darkened video background.

## 🛠️ Tech Stack

* **Logic & Engine:** Vanilla JavaScript / HTML5 Canvas API
* **Computer Vision:** Google MediaPipe Hand Landmarker API (v0.10.14)
* **Build System:** Vite & React

## 🚀 Installation & Local Setup

To run this project locally on your machine:

1. Clone the repository:

   ```bash
   git clone https://github.com/Madhuravishan/Neon-gesture-bridge.git
   ```

2. Navigate to the project directory:

   ```bash
   cd Neon-gesture-bridge
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the local development server:

   ```bash
   npm run dev
   ```

## 🧠 How It Works (Technical Breakdown)

1. **Vision & Mapping:** The application captures the user's webcam feed and passes it to the MediaPipe Hand Landmarker. MediaPipe acts as the "eyes," identifying the spatial coordinates (X, Y, Z) of 21 unique hand points.
2. **Logic & Math:** The app continuously monitors the coordinates of Landmark 4 (Thumb Tip) and Landmark 8 (Index Finger Tip). Using the Pythagorean theorem (`Math.hypot`), it calculates the exact pixel distance between these two points. When the distance drops below a set threshold, the application registers a `Pinch` event.
3. **Generative Rendering:** To get that cyberpunk neon glow, the canvas isolates the fingertip coordinates `[4, 8, 12, 16, 20]` and draws multi-layered strokes with shadow blurs to simulate neon light tubes.
