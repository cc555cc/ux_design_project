# UX Design Project

Interactive sandwich-ordering prototype with:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Python rule-based chatbot API

---

## 1) Prerequisites

Install these first:

- **Git**
- **Node.js 20+ (LTS recommended)** and npm
- **Python 3.10+**

Check versions:

```bash
git --version
node --version
npm --version
python --version
```

> If `npm run dev` fails with Vite/Node compatibility errors (for example around `styleText`), upgrade Node to a current LTS release.

---

## 2) Repository Structure

```text
ux_design_project/
├── client/   # React frontend
└── server/   # Python chatbot API
```

---

## 3) Backend Setup (server)

The frontend expects the backend at **http://127.0.0.1:8010**.

### Windows (PowerShell)

```powershell
cd server
python -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\python src\app.py
```

### macOS/Linux

```bash
cd server
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
.venv/bin/python src/app.py
```

### Optional: improve word matching (WordNet)

Without this, the chatbot still works, but linguistic matching is less flexible.

Windows:

```powershell
.\.venv\Scripts\python -c "import nltk; nltk.download('wordnet', download_dir='.venv/nltk_data')"
$env:NLTK_DATA = ".venv/nltk_data"
.\.venv\Scripts\python src\app.py
```

macOS/Linux:

```bash
.venv/bin/python -c "import nltk; nltk.download('wordnet', download_dir='.venv/nltk_data')"
NLTK_DATA=.venv/nltk_data .venv/bin/python src/app.py
```

### Optional: change backend port

Default is `8010`. To override:

Windows (PowerShell):

```powershell
$env:SANDWICH_API_PORT = "8000"
.\.venv\Scripts\python src\app.py
```

macOS/Linux:

```bash
SANDWICH_API_PORT=8000 .venv/bin/python src/app.py
```

---

## 4) Frontend Setup (client)

Open a second terminal:

### Windows/macOS/Linux

```bash
cd client
npm install
npm run dev
```

The Vite dev server prints a local URL (usually `http://localhost:5173`).

---

## 5) Run the Full Application

1. Start backend (`server/src/app.py`) and keep it running.
2. Start frontend (`npm run dev`) in a separate terminal.
3. Open the frontend URL in your browser.
4. Go to the order experience and test chat/voice flow.

---

## 6) Verify It Is Working

### Backend health check

In a third terminal:

```bash
curl http://127.0.0.1:8010/api/menu
```

You should receive JSON with sandwich categories.

### Frontend-to-backend integration check

From the UI, open the order/chatbot section and send a message like:

`I want a footlong wheat sandwich with turkey`

You should see:
- chatbot response text
- updated sandwich/order state

---

## 7) Development Commands

### Frontend (`client`)

```bash
npm run dev      # Start Vite dev server
npm run build    # Production build + TypeScript project build
npm run lint     # ESLint
npm run preview  # Preview production build locally
```

### Backend (`server`)

```bash
python -m unittest discover tests
```

Use your virtual environment’s Python executable (`.venv/.../python`) if needed.

---

## 8) Common Troubleshooting

### A) Chatbot not responding / proxy errors
- Confirm backend is running on `127.0.0.1:8010`.
- Confirm frontend is running from `client/`.
- Check [client/vite.config.ts](./client/vite.config.ts) proxy target (`/api -> 127.0.0.1:8010`).

### B) `ModuleNotFoundError: nltk`
- Reinstall backend dependencies:
  - `pip install -r requirements.txt` in `server/` using the active venv.

### C) Port already in use
- Change backend port with `SANDWICH_API_PORT`.
- If you change backend port, also update proxy in [client/vite.config.ts](./client/vite.config.ts) or set it back to `8010`.

### D) Frontend build/dev errors after Node upgrade
- Delete `client/node_modules` and reinstall:
  - `npm install`

### E) Voice controls unavailable
- Browser speech APIs are browser-dependent.
- Test in latest Chrome/Edge first.
- Ensure microphone permission is granted.

---

## 9) API and Server Docs

For endpoint contracts and server specifics:
- [server/API.md](./server/API.md)
- [server/README.md](./server/README.md)

