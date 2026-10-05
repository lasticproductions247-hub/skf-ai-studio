# 👠 SKF AI Studio

**Local AI chat + infinite images. Zero cost. Zero API keys. Nothing leaves your machine.**

| | |
|---|---|
| 💬 **Chat** | Streams from your local Ollama — private, free, unlimited |
| 🎨 **Image** | Pollinations/Flux generation, up to 8 at once, no key needed |
| ⚙️ **Config** | Swap models, edit my persona, tune temperature, 5 themes |
| 🔒 **Private** | Chat never touches a server. History stays in localStorage |

## Run it
Open `index.html` — that's it. Requires [Ollama](https://ollama.com) running locally for chat.

## Model
Defaults to `qwen3.5:0.8b` (fast). Any installed model works — swap it in the Config tab.

## ⚠️ Note
The app calls `http://127.0.0.1:11434` directly, so it must be served (or allow CORS) —
`python -m http.server` in this folder works fine.
