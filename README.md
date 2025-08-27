# SPAI — Story Pipeline AI

An end‑to‑end **local‑first** single‑page app that turns a **story idea → title & story → scene plan → images → illustrated script** using your own machine.

- **LLM:** [Ollama](https://ollama.com) (e.g., `llama3.2`)
- **Images:** [Stable Diffusion AUTOMATIC1111 Web UI](https://github.com/AUTOMATIC1111/stable-diffusion-webui) (txt2img API)
- **Frontend:** HTML5, CSS3, Bootstrap 5 + Icons (no framework)
- **Privacy:** No cloud calls required; runs locally

> 🔧 **Status:** Initial version. I’ll keep updating this in the coming days.  
> 🙌 **Contributions welcome:** It’s free to access. Open an issue/PR or ping me with ideas!

---

## ✨ Features

- Stepper flow **0 → 4**
  - **0. Idea** – type a seed
  - **1. Title & Story** – generated with Ollama
  - **2. Scenes** – auto breakdown with per‑scene durations + image prompts
  - **3. Images** – per‑scene **txt2img** via A1111, PNG download
  - **4. Illustrated Script** – export **HTML** and **JSON**
- **Settings** panel with connection test
- **Aspect presets**: 16:9, 9:16, 1:1
- **Consistency controls**: Global Style (appended to all prompts) + Fixed Seed (uses `seed + sceneIndex`)
- Optional **Node/Express proxy** to avoid CORS changes

---

## 🗂️ Repo Layout

```
repo/
├─ spai_single_page_app.html      # The SPA – open via a local server
└─ (optional) server.js           # Express proxy (only if you want it)
```

> You can rename the HTML file; just update your server route if you use `server.js`.

---

## ⚡ Quick Start

### 1) Clone
```bash
git clone <YOUR_REPO_URL> spai
cd spai
```

### 2) Serve the SPA (pick ONE)

**Option A — Simple static server (fastest):**
```bash
# Using npx (no install)
npx serve .
# or
npm i -g http-server
http-server -p 3000
```
Open: `http://localhost:3000/spai_single_page_app.html`

**Option B — Express proxy (no CORS hassle):**
Create `server.js` (only once) with the contents from the **Proxy Server** section below, then:
```bash
npm init -y
npm i express node-fetch
node server.js
```
Open: `http://localhost:3000`

> You can use Option A now and switch to Option B later if you hit CORS issues.

---

## 🖊️ Install & Run: Ollama (LLM)

1. **Install Ollama** (see their docs for your OS).  
2. Pull a model (example `llama3.2`) and start the server:
   ```bash
   ollama pull llama3.2
   ollama serve
   ```
3. (Optional but recommended for browser access) Allow your SPA origin:  
   **Windows (PowerShell)**:
   ```powershell
   setx OLLAMA_ORIGINS "http://localhost:3000,http://127.0.0.1:3000"
   # then close/reopen your terminal and run:  ollama serve
   ```
   **macOS/Linux (bash/zsh):**
   ```bash
   export OLLAMA_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
   ollama serve
   ```
4. **Verify**:
   ```bash
   curl http://localhost:11434/api/tags
   ```

**SPAI Settings → LLM**
- **Base URL:** `http://localhost:11434`
- **Model:** `llama3.2:latest` (or your preferred model)

---

## 🖼️ Install & Run: Stable Diffusion (AUTOMATIC1111)

1. Install **AUTOMATIC1111 web UI** (see its repo for GPU/driver setup).  
2. Start it **with API enabled** (and CORS for browser use).

**Windows (edit `webui-user.bat`):**
```bat
set COMMANDLINE_ARGS=--api --listen --cors-allow-origins=http://localhost:3000,http://127.0.0.1:3000
```
Run `webui-user.bat`.

**macOS/Linux:**
```bash
./webui.sh --api --listen --cors-allow-origins=http://localhost:3000,http://127.0.0.1:3000
```

3. **Verify**:
```bash
curl http://127.0.0.1:7860/sdapi/v1/options
```
4. (Optional) Swagger docs: open `http://127.0.0.1:7860/docs` in a browser.

**SPAI Settings → Image Engine**
- **Provider:** Stable Diffusion (Automatic1111 API)
- **API Base URL:** `http://127.0.0.1:7860`
- **Sampler:** e.g., `DPM++ 2M Karras`

---

## 🔁 Pipeline (What happens under the hood)

```
Idea
  → (Ollama /api/generate) Title & Story
  → (Ollama /api/generate) Scene breakdown with per‑scene imagePrompt
  → (A1111 /sdapi/v1/txt2img) Image for each scene
  → Illustrated Script (HTML + images + prompts) → Export HTML/JSON
```

**Consistency tips**
- Use **Global Style** in SPAI Settings to lock palette/lighting/lens.
- Enable **Fixed Seed** so scenes vary predictably (`seed + index`).
- Keep **one checkpoint, sampler, steps, CFG** across all scenes.
- For character continuity, prefer **img2img** (denoise ~0.35–0.5), **ControlNet**, **IP-Adapter**, or a small **LoRA**.

---

## 🧪 Test the backends quickly

**Ollama**
```bash
curl -s http://localhost:11434/api/tags | jq .
```

**A1111 (txt2img smoke test)**
```bash
curl -X POST http://127.0.0.1:7860/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{"prompt":"a tiny test", "steps": 8, "width": 512, "height": 512}'
```

---

## 🧩 Proxy Server (Optional but Handy)

If you don’t want to touch CORS flags, proxy both backends through the same origin (`http://localhost:3000`).

Create **server.js**:

```js
const express = require("express");
const path = require("path");
const fetch = (...args) => import("node-fetch").then(({default: f}) => f(...args));

const app = express();
app.use(express.json({ limit: "50mb" }));

// Serve the SPA
app.use(express.static(__dirname));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "spai_single_page_app.html")));

// Proxy: Stable Diffusion (A1111)
const SD_BASE = process.env.SD_BASE || "http://127.0.0.1:7860";
app.post("/api/sd/txt2img", async (req, res) => {
  try {
    const r = await fetch(`${SD_BASE}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(req.body)
    });
    const j = await r.json();
    res.status(r.status).json(j);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Proxy: Ollama
const OLLAMA_BASE = process.env.OLLAMA_BASE || "http://127.0.0.1:11434";
app.post("/api/ollama/generate", async (req, res) => {
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(req.body)
    });
    const j = await r.json();
    res.status(r.status).json(j);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SPAI running at http://localhost:${PORT}`));
```

Install & run:
```bash
npm init -y
npm i express node-fetch
node server.js
```

Then in SPAI Settings you can keep:
- **Ollama Base:** `http://localhost:3000/api/ollama` (the SPA posts to `/api/generate`)
- **Image Base:**  `http://localhost:3000/api/sd`     (the SPA posts to `/sdapi/v1/txt2img`)

> If your SPA already points directly to `11434`/`7860`, no change is required—this proxy is purely for convenience.

---

## 🧭 Using the App

1. Open the SPA in your browser.
2. **Settings → Save** your endpoints and model name.
3. Click **Test Connections**.
4. **Step 0:** Type your idea → **Generate Title & Story**.
5. **Step 2:** Choose scene count & min seconds → **Generate Scenes**.
6. (Optional) Edit prompts/descriptions.
7. **Step 3:** Generate images (one‑by‑one or all).
8. **Step 4:** **Build Illustrated Script** → Download HTML/JSON.

---

## 🛠️ Troubleshooting

- **“TypeError: Failed to fetch” in browser**
  - Serve the HTML via `http://` (not `file://`). Use `npx serve .` or the proxy server.
  - Enable CORS in A1111 (`--cors-allow-origins=...`) and for Ollama (`OLLAMA_ORIGINS`).
  - Confirm firewalls allow `11434` and `7860` locally.
- **API returns 400/422**
  - Remove/adjust `sampler_name`, confirm it exists in your A1111 install.
  - Check resolution, steps, and CFG ranges for your model.
- **Images look inconsistent**
  - Use **Global Style** + **Fixed Seed** in Settings.
  - Keep checkpoint/sampler/steps/CFG constant.
  - Consider **img2img** or **ControlNet** for stronger continuity.

---

## 🤝 Contributing

Issues and PRs are welcome! Please:
- Keep changes modular and documented.
- Add notes to this README if you introduce new flags/options.

---

## 📜 License

MIT (or your preferred license). Update this section accordingly.
