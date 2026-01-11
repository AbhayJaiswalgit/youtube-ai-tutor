const BACKEND = "http://127.0.0.1:8000";

const askBtn = document.getElementById("askBtn");
const questionInput = document.getElementById("question");
const chat = document.getElementById("chat");
const statusDiv = document.getElementById("status");
const themeBtn = document.getElementById("themeToggle");

let currentVideoId = null;
let isProcessing = false;

/* =====================
   THEME
===================== */
chrome.storage.local.get(["theme"], (res) => {
  if (res.theme === "dark") {
    document.body.classList.add("dark");
    themeBtn.textContent = "☀️";
  }
});

themeBtn.onclick = () => {
  const isDark = document.body.classList.toggle("dark");
  themeBtn.textContent = isDark ? "☀️" : "🌙";
  chrome.storage.local.set({ theme: isDark ? "dark" : "light" });
};

/* =====================
   HELPERS
===================== */
function getVideoId(url) {
  try {
    return new URL(url).searchParams.get("v");
  } catch {
    return null;
  }
}

function showProcessingUI() {
  statusDiv.innerText = "Processing video…";
  statusDiv.className = "status processing";

  askBtn.disabled = true;
  questionInput.disabled = true;

  chat.innerHTML = `
    <div class="processing-card">
      ⏳ Processing video transcript…<br/>
      This happens automatically
    </div>
  `;
}

function showReadyUI() {
  statusDiv.innerText = "Video processed ✓";
  statusDiv.className = "status done";

  askBtn.disabled = false;
  questionInput.disabled = false;

  chat.innerHTML = "";
}

/* =====================
   AUTO VIDEO PROCESSING
===================== */
async function processVideoIfNeeded() {
  if (isProcessing) return;

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const url = tabs[0]?.url;
    const videoId = getVideoId(url);

    if (!videoId || videoId === currentVideoId) return;

    currentVideoId = videoId;
    isProcessing = true;

    showProcessingUI();

    try {
      await fetch(`${BACKEND}/load_video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      showReadyUI();
    } catch {
      statusDiv.innerText = "Failed to process video";
      statusDiv.className = "status idle";
    } finally {
      isProcessing = false;
    }
  });
}

/* Run on open */
processVideoIfNeeded();

/* Detect video change (YouTube SPA safe) */
setInterval(processVideoIfNeeded, 1500);

/* =====================
   CHAT
===================== */
function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = `msg ${type}`;
  div.innerText = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

askBtn.onclick = async () => {
  const q = questionInput.value.trim();
  if (!q) return;

  addMessage(q, "user");
  questionInput.value = "";

  const thinking = document.createElement("div");
  thinking.className = "msg bot";
  thinking.innerHTML = `
    <div class="typing">
      <span></span><span></span><span></span>
    </div>
  `;
  chat.appendChild(thinking);
  chat.scrollTop = chat.scrollHeight;

  const res = await fetch(`${BACKEND}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: q }),
  });

  const data = await res.json();
  thinking.innerText = data.answer;
};

questionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault(); // stop newline
    if (!askBtn.disabled) {
      askBtn.click(); // trigger send
    }
  }
});

// const BACKEND = "https://youtubeaitutor-production.up.railway.app";

// const askBtn = document.getElementById("askBtn");
// const questionInput = document.getElementById("question");
// const chat = document.getElementById("chat");
// const statusDiv = document.getElementById("status");
// const themeBtn = document.getElementById("themeToggle");

// let currentVideoId = null;
// let isProcessing = false;

// /* =====================
//    THEME
// ===================== */
// chrome.storage.local.get(["theme"], (res) => {
//   if (res.theme === "dark") {
//     document.body.classList.add("dark");
//     themeBtn.textContent = "☀️";
//   }
// });

// themeBtn.onclick = () => {
//   const isDark = document.body.classList.toggle("dark");
//   themeBtn.textContent = isDark ? "☀️" : "🌙";
//   chrome.storage.local.set({ theme: isDark ? "dark" : "light" });
// };

// /* =====================
//    HELPERS
// ===================== */
// function getVideoId(url) {
//   try {
//     return new URL(url).searchParams.get("v");
//   } catch {
//     return null;
//   }
// }

// /* =====================
//    TRANSCRIPT FETCH (KEY)
// ===================== */
// async function fetchTranscript(videoId) {
//   const captionUrls = [
//     // English manual
//     `https://video.google.com/timedtext?lang=en&v=${videoId}&fmt=srv3`,
//     // English auto
//     `https://video.google.com/timedtext?lang=en&kind=asr&v=${videoId}&fmt=srv3`,
//     // US English
//     `https://video.google.com/timedtext?lang=en-US&v=${videoId}&fmt=srv3`,
//     // UK English
//     `https://video.google.com/timedtext?lang=en-GB&v=${videoId}&fmt=srv3`,
//   ];

//   for (const url of captionUrls) {
//     try {
//       const res = await fetch(url);
//       if (!res.ok) continue;

//       const xml = await res.text();
//       if (!xml.includes("<text")) continue;

//       const parser = new DOMParser();
//       const xmlDoc = parser.parseFromString(xml, "text/xml");

//       const text = [...xmlDoc.getElementsByTagName("text")]
//         .map((t) => t.textContent.replace(/\n/g, " "))
//         .join(" ");

//       if (text.length > 50) return text;
//     } catch (e) {
//       continue;
//     }
//   }

//   return null;
// }

// /* =====================
//    UI STATES
// ===================== */
// function showProcessingUI() {
//   statusDiv.innerText = "Processing video…";
//   statusDiv.className = "status processing";

//   askBtn.disabled = true;
//   questionInput.disabled = true;

//   chat.innerHTML = `
//     <div class="processing-card">
//       ⏳ Extracting video captions…
//     </div>
//   `;
// }

// function showReadyUI() {
//   statusDiv.innerText = "Video ready ✓";
//   statusDiv.className = "status done";

//   askBtn.disabled = false;
//   questionInput.disabled = false;

//   chat.innerHTML = "";
// }

// function showNoCaptionUI() {
//   statusDiv.innerText = "No captions available";
//   statusDiv.className = "status idle";

//   askBtn.disabled = true;
//   questionInput.disabled = true;

//   chat.innerHTML = `
//     <div class="processing-card">
//       ❌ This video has no captions<br/>
//       Cannot analyze this video
//     </div>
//   `;
// }

// /* =====================
//    AUTO VIDEO PROCESSING
// ===================== */
// async function processVideoIfNeeded() {
//   if (isProcessing) return;

//   chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
//     const url = tabs[0]?.url;
//     const videoId = getVideoId(url);

//     if (!videoId || videoId === currentVideoId) return;

//     currentVideoId = videoId;
//     isProcessing = true;

//     showProcessingUI();

//     try {
//       const transcript = await fetchTranscript(videoId);

//       if (!transcript) {
//         showNoCaptionUI();
//         isProcessing = false;
//         return;
//       }

//       await fetch(`${BACKEND}/load_video`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ transcript }),
//       });

//       showReadyUI();
//     } catch (err) {
//       statusDiv.innerText = "Failed to process video";
//       statusDiv.className = "status idle";
//     } finally {
//       isProcessing = false;
//     }
//   });
// }

// /* Run on open */
// processVideoIfNeeded();

// /* Detect video change (YouTube SPA safe) */
// setInterval(processVideoIfNeeded, 1500);

// /* =====================
//    CHAT
// ===================== */
// function addMessage(text, type) {
//   const div = document.createElement("div");
//   div.className = `msg ${type}`;
//   div.innerText = text;
//   chat.appendChild(div);
//   chat.scrollTop = chat.scrollHeight;
// }

// askBtn.onclick = async () => {
//   const q = questionInput.value.trim();
//   if (!q) return;

//   addMessage(q, "user");
//   questionInput.value = "";

//   const thinking = document.createElement("div");
//   thinking.className = "msg bot";
//   thinking.innerHTML = `
//     <div class="typing">
//       <span></span><span></span><span></span>
//     </div>
//   `;
//   chat.appendChild(thinking);
//   chat.scrollTop = chat.scrollHeight;

//   const res = await fetch(`${BACKEND}/ask`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ question: q }),
//   });

//   const data = await res.json();
//   thinking.innerText = data.answer;
// };

// questionInput.addEventListener("keydown", (e) => {
//   if (e.key === "Enter" && !e.shiftKey) {
//     e.preventDefault();
//     if (!askBtn.disabled) askBtn.click();
//   }
// });
