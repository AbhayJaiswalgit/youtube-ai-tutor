# YouTube AI Assistant 🎥🤖

YouTube AI Assistant is an AI-powered system that allows users to **ask questions about YouTube videos** and receive answers **strictly based on the video’s content**.

The project is built as a **full-stack application** consisting of:
- 🧠 **AI Backend** (FastAPI + LangChain + Whisper)
- 🌐 **Chrome Extension** (User interface on YouTube)

---

## 🚀 Features

- Automatically extracts YouTube captions
- Falls back to **Whisper speech-to-text** when captions are unavailable
- **Intent-based question answering**
  - Global intent → full video understanding (summary, overview, quiz)
  - Retrieval intent → specific questions via semantic search
- Prevents hallucinations by answering **only from video content**
- Works directly on YouTube via a Chrome extension

---

## 🏗️ Project Structure

```
youtube-ai-project/
├── backend/
│   ├── app.py
│   ├── yt_backend.py
│   ├── requirements.txt
│   ├── .env.example
│
├── chrome-extension/
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
│
└── .gitignore
```

---

## 🧠 How It Works

1. Chrome extension detects the current YouTube video
2. Backend fetches the video transcript
3. If captions are unavailable:
   - Audio is downloaded using `yt-dlp`
   - Whisper transcribes the audio
4. Transcript is split into chunks
5. Chunks are summarized to build compact context
6. User query is classified into:
   - **GLOBAL intent**
   - **RETRIEVAL intent**
7. LLM generates answers **only from video content**

---

## ⚙️ Backend Setup (Local)

### 1️⃣ Clone the repository
```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd youtube-ai-project/backend
```

### 2️⃣ Create and activate a virtual environment
```bash
python -m venv venv
venv\Scripts\activate
```

### 3️⃣ Install dependencies
```bash
pip install -r requirements.txt
```

### 4️⃣ Set environment variables

Create a `.env` file inside `backend/`:
```env
HUGGINGFACEHUB_ACCESS_TOKEN=your_token_here
```

### 5️⃣ Run the FastAPI server
```bash
python -m uvicorn app:app --reload
```

Backend runs at:
- http://127.0.0.1:8000
- http://127.0.0.1:8000/docs

---

## 🌐 Chrome Extension Setup

1. Open `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder
5. Refresh YouTube

---

## 👤 Author

Built by **[Abhay Jaiswal]**
