# 🎭 Ritmator

### A Lightweight 3D Auto-Rigging & Animation Tool

Ritmator is a browser-based 3D animation tool built with **Three.js** that allows you to load 3D models, automatically create humanoid skeletons, animate bones, edit keyframes, and export your animations — all directly from your browser.

Designed for creators, game developers, and 3D enthusiasts who want a simple way to rig and animate GLB models without relying on heavyweight 3D software.

<img width="1920" height="953" alt="image" src="https://github.com/user-attachments/assets/e2bf1247-ede2-4c8d-a132-a2fa36aac409" />

<img width="1920" height="961" alt="image" src="https://github.com/user-attachments/assets/ade17849-44ff-44d5-a8b5-2dfff9802fbe" />

<img width="1920" height="944" alt="image" src="https://github.com/user-attachments/assets/dffa30ea-785a-4287-8651-fd07aa5c2e07" />


---

## ✨ Features

- **📦 GLB Model Import** — Load 3D character models in `.glb` format directly into the viewport.
- **🦴 Automatic Rigging** — Automatically generate a humanoid skeleton based on your model's geometry.
- **🛠️ Manual Rigging** — Fine-tune joint positions using interactive 3D transform controls.
- **🎬 Animation Presets** — Instantly generate animations using built-in presets.
- **🎞️ Timeline Editor** — Play, pause, loop, scrub, and control animation playback.
- **🔑 Keyframe Editing** — Edit individual bone rotations and create custom animations.
- **🧍 Pose Selection** — Support for T-pose, A-pose, and arms-down configurations.
- **🎨 Smooth Animation Curves** — Enable smooth interpolation between keyframes.
- **⚡ Playback Speed Control** — Preview animations at different speeds.
- **📤 Export Animations** — Export rigged models and animations as GLB-based code.
- **🌐 Standalone HTML Player** — Generate a self-contained HTML animation player.
- **🌙 Dark Mode** — Automatic dark/light theme support.
- **📱 Responsive Interface** — Adaptable layout for desktop and smaller screens.

---

## 🎭 Animation Presets

Ritmator includes a variety of procedural animation presets.

| Animation | Description |
|---|---|
| Idle | Natural idle movement |
| Walk | Walking animation |
| Run | Running animation |
| Wave | Hand-waving animation |
| Jump | Jumping animation |
| Dance | Dance animation |
| Punch | Punching animation |
| Kick | Kicking animation |
| Hit | Hit reaction |
| Sit | Sitting animation |
| Crouch | Crouching animation |
| Fall | Falling animation |
| Empty | Blank animation clip for custom animation |

Each animation can be customized using duration, intensity, bone rotations, and keyframes.

---

## 🚀 Getting Started

### 1. Run Ritmator

Open the HTML file in a modern browser.

For the best experience, use a local development server:

```bash
git clone https://github.com/YOUR_USERNAME/ritmator.git
cd ritmator
```

Then launch a local server:

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

> **Note:** Ritmator loads Three.js dependencies from a CDN by default. An internet connection may be required unless the dependencies are available locally.

### 2. Load a 3D Model

- Click **Load GLB**.
- Select your `.glb` character model.
- Your model will appear in the 3D viewport.

### 3. Rig Your Model

Choose one of the following:

- **Auto Rig** — Automatically generate the humanoid skeleton.
- **Manual Rig** — Adjust joint positions manually for better accuracy.

You can toggle the skeleton visualization to inspect your rig.

### 4. Create Animations

Select an animation preset from the available options.

Customize:

- Animation duration
- Animation intensity
- Bone rotations
- Keyframes
- Smooth curves
- Playback speed

### 5. Export

Export your animations using the available options:

- **Copy Code** — Copy animation data and loader code.
- **Code .txt** — Export the animation integration code.
- **Player .html** — Generate a standalone HTML animation player.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause animation |
| `K` | Set keyframe |
| `Delete` | Remove keyframe |
| `W` | Switch to translate mode during manual rigging |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | Responsive interface and styling |
| JavaScript | Animation logic and application functionality |
| Three.js | 3D rendering and scene management |
| GLTFLoader | Loading 3D models |
| GLTFExporter | Exporting rigged models and animations |
| OrbitControls | 3D viewport navigation |
| TransformControls | Manual joint manipulation |

---

## 📂 Project Structure

```text
ritmator/
│
├── index.html
├── lib/
│   ├── three.min.js
│   ├── GLTFLoader.js
│   ├── OrbitControls.js
│   ├── GLTFExporter.js
│   └── TransformControls.js
│
└── README.md
```

> The `lib/` directory is optional when using CDN-based dependency loading.

---

## 🎯 Use Cases

Ritmator can be useful for:

- Indie game development
- Character animation prototyping
- 3D model rigging experiments
- Creating animation assets for browser games
- Generating humanoid animation presets
- Testing character movement before integrating into a game engine

---

## ⚠️ Limitations

- Automatic rigging is designed primarily for humanoid characters.
- Rigging accuracy depends on the geometry and pose of the imported model.
- Complex models may require manual joint adjustments.
- The automatic rigging process replaces an existing skeleton.
- Exported animation code requires Three.js integration to use inside another project.

---

## 🤝 Contributing

Contributions, ideas, bug reports, and feature requests are welcome!

If you would like to contribute:

1. Fork the repository.
2. Create a new branch.
3. Make your changes.
4. Submit a pull request.

---

## 📜 License

This project is open for collaboration. Add a `LICENSE` file to the repository to specify the terms under which Ritmator can be used, modified, and distributed.

---

<div align="center">

### Built with ❤️ and Three.js

**Ritmator — Rig. Animate. Export.**

</div>
