// ============================================================
// ExamSmart AI - script_enhanced.js  (clean, fully working)
// Model  : gemini-2.0-flash / gpt-4o-mini
// ============================================================

const DEFAULT_API_KEY = "";
const OPENAI_MODEL    = "gpt-4o-mini";
const OPENAI_URL      = "https://api.openai.com/v1/chat/completions";

// ── Global state ──────────────────────────────────────────
let isLogin        = true;
let apiKey         = localStorage.getItem("openaiApiKey") || DEFAULT_API_KEY;
let uploadedDocument = "";
let currentMode    = localStorage.getItem("mode")     || "read";
let currentLanguage= localStorage.getItem("language") || "english";
let currentMarks   = parseInt(localStorage.getItem("marks")) || 2;
let isDarkMode     = localStorage.getItem("darkMode") === "true";
let sessionStats   = JSON.parse(localStorage.getItem("sessionStats")) || {
    questionsAsked: 0, documentsProcessed: 0, aiResponses: 0, sessionStart: Date.now()
};

// ── Boot ──────────────────────────────────────────────────
window.addEventListener("load", () => {
    // Seed demo credentials so the hint actually works
    if (!localStorage.getItem("user")) {
        localStorage.setItem("user", "test");
        localStorage.setItem("pass", "123");
    }

    // Load API Key
    const storedKey = localStorage.getItem("openaiApiKey");
    if (storedKey) {
        apiKey = storedKey;
        const input = document.getElementById("apiKeyInput");
        if (input) input.value = storedKey;
        updateApiStatusIndicator(false, "Testing saved API key...");
        testApiKey(true);
    } else {
        apiKey = "";
        updateApiStatusIndicator(false, "No API Key Set");
    }

    updateTheme();
    updateModeButton();
    updateLanguageButton();
    updateMarksButton();
    updateStatsDisplay();
    initialize3D();
});

// ── 3-D background ────────────────────────────────────────
function initialize3D() {
    const canvas = document.getElementById("bgCanvas");
    if (!canvas || typeof THREE === "undefined") return;
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
    camera.position.z = 5;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(innerWidth, innerHeight);

    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.15, wireframe: true })
    );
    scene.add(cube);

    for (let i = 0; i < 6; i++) {
        const s = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 12, 12),
            new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff, transparent: true, opacity: 0.4 })
        );
        s.position.set((Math.random()-.5)*10, (Math.random()-.5)*10, (Math.random()-.5)*10);
        scene.add(s);
    }

    (function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.005;
        cube.rotation.y += 0.007;
        renderer.render(scene, camera);
    })();

    window.addEventListener("resize", () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    });
}

// ── Theme ─────────────────────────────────────────────────
function toggleTheme() {
    isDarkMode = !isDarkMode;
    localStorage.setItem("darkMode", isDarkMode);
    updateTheme();
    showNotification(isDarkMode ? "🌙 Dark mode on" : "☀️ Light mode on");
}

function updateTheme() {
    document.body.setAttribute("data-theme", isDarkMode ? "dark" : "");
    const btn = document.querySelector(".theme-toggle");
    if (btn) btn.textContent = isDarkMode ? "☀️" : "🌙";
}

// ── Notifications ─────────────────────────────────────────
function showNotification(message, type = "success") {
    const n = document.createElement("div");
    n.className = `notification ${type}`;
    n.style.cssText = `
        position:fixed;top:90px;right:24px;z-index:9999;
        padding:14px 22px;border-radius:14px;font-weight:600;
        color:#fff;max-width:320px;word-break:break-word;
        background:linear-gradient(135deg,#00f5ff,#ff00ff);
        box-shadow:0 8px 32px rgba(0,245,255,.4);
        animation:slideInRight .35s ease forwards;
    `;
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(() => { n.style.animation = "slideOutRight .35s ease forwards"; setTimeout(() => n.remove(), 350); }, 3000);
}

// ── Auth ──────────────────────────────────────────────────
function toggleForm() {
    isLogin = !isLogin;
    document.getElementById("formTitle").innerText = isLogin ? "📚 Login" : "✨ Signup";
    document.getElementById("toggleText").innerHTML = isLogin
        ? `Don't have an account? <span onclick="toggleForm()">Create one</span>`
        : `Already have an account? <span onclick="toggleForm()">Login</span>`;
    const hint = document.getElementById("demoHint");
    if (hint) hint.style.display = isLogin ? "block" : "none";
}

function togglePassword() {
    const p = document.getElementById("password");
    p.type = p.type === "password" ? "text" : "password";
}

function handleAuth() {
    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value;
    if (!user || !pass) { showNotification("⚠️ Enter username & password", "warning"); return; }

    if (isLogin) {
        if (user === localStorage.getItem("user") && pass === localStorage.getItem("pass")) {
            loadApp();
        } else {
            showNotification("❌ Invalid credentials", "error");
        }
    } else {
        localStorage.setItem("user", user);
        localStorage.setItem("pass", pass);
        showNotification("✅ Account created! You can now login.", "success");
        toggleForm();
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
    }
}

function loadApp() {
    document.getElementById("authPage").style.display = "none";
    document.getElementById("mainApp").style.display  = "block";
    showNotification("🎉 Welcome to ExamSmart AI!");
    updateModeButton();
    updateLanguageButton();
    updateMarksButton();
    updateStatsDisplay();
}

function logout() {
    if (confirm("Logout? 🚪")) {
        localStorage.setItem("sessionStats", JSON.stringify(sessionStats));
        location.reload();
    }
}

// ── API Key ───────────────────────────────────────────────
function toggleApiKeySection() {
    const s = document.querySelector(".api-key-section");
    if (s) {
        s.style.display = s.style.display === "none" ? "block" : "none";
        // Focus the input when opened
        if (s.style.display === "block") {
            setTimeout(() => document.getElementById("apiKeyInput")?.focus(), 100);
        }
    }
}

function toggleApiKeyVisibility() {
    const input = document.getElementById("apiKeyInput");
    const btn = document.querySelector(".eye-toggle-btn");
    if (!input || !btn) return;
    if (input.type === "password") {
        input.type = "text";
        btn.textContent = "🙈";
    } else {
        input.type = "password";
        btn.textContent = "👁️";
    }
}

function updateApiStatusIndicator(isValid, msg) {
    const statusDiv = document.getElementById("apiStatusMessage");
    if (!statusDiv) return;
    statusDiv.innerHTML = msg;
    if (isValid) {
        statusDiv.style.color = "#00f5ff";
        statusDiv.style.textShadow = "0 0 10px rgba(0, 245, 255, 0.5)";
    } else if (msg.includes("Testing") || msg.includes("Saving")) {
        statusDiv.style.color = "#ffa500";
        statusDiv.style.textShadow = "0 0 10px rgba(255, 165, 0, 0.5)";
    } else {
        statusDiv.style.color = "#ff3b30";
        statusDiv.style.textShadow = "0 0 10px rgba(255, 59, 48, 0.5)";
    }
}

function detectApiProvider(key) {
    const value = (key || "").trim();
    if (!value) return "unknown";
    return value.startsWith("sk-") ? "openai" : "gemini";
}

async function saveUserApiKey() {
    const input = document.getElementById("apiKeyInput");
    if (!input) return;
    const val = input.value.trim();
    if (!val) {
        showNotification("⚠️ Please enter a valid API key", "warning");
        updateApiStatusIndicator(false, "Key cannot be empty");
        return;
    }

    apiKey = val;
    updateApiStatusIndicator(false, "Testing connection...");
    showNotification("🔍 Validating API key...", "info");

    const isValid = await testApiKey(false);
    if (isValid) {
        localStorage.setItem("openaiApiKey", apiKey);
        showNotification("💾 API Key saved locally!", "success");
    } else {
        apiKey = "";
        localStorage.removeItem("openaiApiKey");
        input.value = "";
        updateApiStatusIndicator(false, "❌ Invalid or unsupported API key");
    }
}

function clearUserApiKey() {
    const input = document.getElementById("apiKeyInput");
    if (input) input.value = "";
    apiKey = "";
    localStorage.removeItem("openaiApiKey");
    updateApiStatusIndicator(false, "No API key configured");
    showNotification("🗑️ API Key deleted", "info");
}

async function testApiKey(silent = true) {
    const key = (apiKey || "").trim();
    if (!key) {
        updateApiStatusIndicator(false, "No API key configured");
        return false;
    }

    const provider = detectApiProvider(key);
    const isGemini = provider === "gemini";
    const providerLabel = isGemini ? "Gemini" : "OpenAI";
    const endpoint = isGemini
        ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`
        : OPENAI_URL;

    updateApiStatusIndicator(false, "Testing connection...");

    try {
        const headers = { "Content-Type": "application/json" };
        if (!isGemini) {
            headers["Authorization"] = `Bearer ${key}`;
        }
        const body = isGemini
            ? JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
            : JSON.stringify({
                model: OPENAI_MODEL,
                messages: [{ role: "user", content: "Hi" }],
                max_tokens: 5
            });

        const res = await fetch(endpoint, {
            method: "POST",
            headers: headers,
            body: body
        });

        if (res.ok) {
            updateApiStatusIndicator(true, `✅ API Working (${providerLabel})`);
            if (!silent) showNotification(`✅ Key validated successfully! (${providerLabel})`, "success");
            return true;
        }

        const err = await res.json().catch(() => ({}));
        const errMsg = err?.error?.message || `Status ${res.status}`;
        updateApiStatusIndicator(false, `❌ Invalid Key`);
        if (!silent) showNotification(`❌ Key validation failed: ${errMsg}`, "error");
        return false;
    } catch (e) {
        updateApiStatusIndicator(false, "❌ Network Error");
        if (!silent) showNotification(`❌ Network error while validating key`, "error");
        return false;
    }
}

// ── File Upload ───────────────────────────────────────────
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const allowed = ["application/pdf","application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain","image/jpeg","image/jpg","image/png"];

    if (!allowed.includes(file.type)) {
        showNotification("⚠️ Unsupported file type", "warning"); return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showNotification("⚠️ File too large (max 10 MB)", "warning"); return;
    }

    updateDocumentInfo(file);

    if (file.type === "text/plain") {
        const r = new FileReader();
        r.onload = e => {
            uploadedDocument = e.target.result;
            document.getElementById("previewText").innerHTML =
                `<pre style="white-space:pre-wrap">${uploadedDocument.substring(0,1200)}${uploadedDocument.length>1200?"…":""}</pre>`;
            sessionStats.documentsProcessed++;
            updateStatsDisplay();
            showNotification("✅ Text file loaded!");
            setTimeout(() => showDocumentReady(file.name), 400);
        };
        r.readAsText(file);
    } else if (file.type.startsWith("image/")) {
        const r = new FileReader();
        r.onload = e => {
            uploadedDocument = `[Image: ${file.name} | ${(file.size/1024).toFixed(1)} KB]`;
            document.getElementById("previewText").innerHTML =
                `<div style="text-align:center"><img src="${e.target.result}" style="max-width:100%;max-height:200px;border-radius:10px"><p style="margin-top:8px;opacity:.7">🖼️ ${file.name}</p></div>`;
            sessionStats.documentsProcessed++;
            updateStatsDisplay();
            showNotification("✅ Image loaded!");
            setTimeout(() => showDocumentReady(file.name), 400);
        };
        r.readAsDataURL(file);
    } else {
        uploadedDocument = `[${file.type.includes("pdf")?"PDF":"Document"}: ${file.name} | ${(file.size/1024).toFixed(1)} KB]\nAsk questions and the AI will help based on this document.`;
        document.getElementById("previewText").innerText = uploadedDocument;
        sessionStats.documentsProcessed++;
        updateStatsDisplay();
        showNotification("✅ Document loaded!");
        setTimeout(() => showDocumentReady(file.name), 400);
    }
}

function updateDocumentInfo(file) {
    const info = document.getElementById("documentInfo");
    if (!info) return;
    document.getElementById("docName").textContent  = file.name;
    document.getElementById("docSize").textContent  = `${(file.size/1024).toFixed(1)} KB`;
    document.getElementById("docType").textContent  = (file.type.split("/")[1]||"unknown").toUpperCase();
    document.getElementById("docPages").textContent = file.type==="application/pdf"
        ? "~"+Math.max(1,Math.ceil(file.size/50000))+" pages"
        : file.type==="text/plain" ? "~"+Math.max(1,Math.ceil(file.size/2000))+" pages" : "N/A";
    info.style.display = "block";
}

function showDocumentReady(fileName) {
    const box = document.getElementById("chatBox");
    box.innerHTML = "";
    appendChat("ai", `✨ <b>"${fileName}"</b> loaded! Ask me anything about it.`);
}

// ── Mode / Language / Marks ───────────────────────────────
function setMode(mode) {
    currentMode = mode;
    localStorage.setItem("mode", mode);
    updateModeButton();
    showNotification(`Mode → ${mode.toUpperCase()}`);
}

function updateModeButton() {
    ["read","exam","teach"].forEach(m => {
        const btn = document.getElementById(m+"Btn");
        if (btn) btn.classList.toggle("active", currentMode === m);
    });
}

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem("language", lang);
    updateLanguageButton();
}

function updateLanguageButton() {
    const map = { english:"langEnglish", hinglish:"langHinglish", hindi:"langHindi" };
    Object.entries(map).forEach(([l, id]) => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.toggle("active", currentLanguage === l);
    });
}

function setMarks(marks) {
    currentMarks = marks;
    localStorage.setItem("marks", marks);
    updateMarksButton();
}

function updateMarksButton() {
    [2,5,10].forEach(m => {
        const btn = document.getElementById("marks"+m);
        if (btn) btn.classList.toggle("active", currentMarks === m);
    });
}

// ── Stats ─────────────────────────────────────────────────
function updateStatsDisplay() {
    try {
        document.getElementById("questionsAsked").textContent   = sessionStats.questionsAsked;
        document.getElementById("documentsProcessed").textContent = sessionStats.documentsProcessed;
        document.getElementById("aiResponses").textContent      = sessionStats.aiResponses;
        document.getElementById("sessionTime").textContent      =
            Math.floor((Date.now()-sessionStats.sessionStart)/60000)+"m";
    } catch(_) {}
}

function toggleStats() {
    const p = document.getElementById("statsPanel");
    if (p) { p.style.display = p.style.display==="none" ? "block" : "none"; updateStatsDisplay(); }
}

// ── Chat helpers ──────────────────────────────────────────
function appendChat(role, html, extraStyle = "") {
    const box = document.getElementById("chatBox");
    const d   = document.createElement("div");
    d.className = "ai-response" + (role==="user" ? " user-message" : "");
    if (extraStyle) d.style.cssText = extraStyle;
    d.innerHTML = html;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
    return d;
}

function addSystemMessage(msg) {
    appendChat("sys", `<i>ℹ️ ${msg}</i>`, "background:rgba(255,255,255,.06);color:#94a3b8;font-size:12px;");
}

// ── Export / Clear ────────────────────────────────────────
function exportChat() {
    const msgs = document.getElementById("chatBox").querySelectorAll(".ai-response");
    let txt = `ExamSmart AI Export\n${new Date().toLocaleString()}\nMode:${currentMode} | Lang:${currentLanguage} | Marks:${currentMarks}\n${"─".repeat(50)}\n\n`;
    msgs.forEach(m => { txt += m.innerText + "\n\n"; });
    const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob([txt],{type:"text/plain"})),
        download: `examsmart-${new Date().toISOString().split("T")[0]}.txt`
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showNotification("📤 Chat exported!");
}

function clearChat() {
    if (!confirm("Clear chat history?")) return;
    document.getElementById("chatBox").innerHTML = "";
    appendChat("ai", `👋 Chat cleared! Upload a document and ask away.`);
    showNotification("🗑️ Chat cleared!");
}

// ── Help Modal ────────────────────────────────────────────
function showHelp()  { document.getElementById("helpModal").style.display = "block"; }
function closeModal(){ document.getElementById("helpModal").style.display = "none";  }
window.addEventListener("click", e => {
    const m = document.getElementById("helpModal");
    if (m && e.target === m) m.style.display = "none";
});

// ── Fallback response ─────────────────────────────────────
function getFallbackResponse(q, mode, lang, marks) {
    const templates = {
        english: `Here is a ${marks}-mark answer for: "${q}"\n\nKey points:\n• Review the main concepts from your document\n• Focus on definitions and examples\n• Structure your answer clearly`,
        hindi:   `"${q}" के लिए ${marks} अंक का उत्तर:\n\n• दस्तावेज़ के मुख्य बिंदु देखें\n• परिभाषाएं और उदाहरण शामिल करें`,
        hinglish:`"${q}" ke liye ${marks} marks ka answer:\n\n• Document ke main points dekho\n• Definitions aur examples include karo`
    };
    return templates[lang] || templates.english;
}

// ── AI fetch with auto-retry on 429 ──────────────────
async function fetchAIResponse(prompt, maxRetries = 3) {
    const provider = detectApiProvider(apiKey);
    const isGemini = provider === "gemini";
    const endpoint = isGemini
        ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
        : OPENAI_URL;

    let delay = 2000;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const headers = { "Content-Type": "application/json" };
        if (!isGemini) {
            headers["Authorization"] = `Bearer ${apiKey}`;
        }

        const body = isGemini 
            ? JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            : JSON.stringify({
                model: OPENAI_MODEL,
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1024,
                temperature: 0.7
            });

        const res = await fetch(endpoint, {
            method: "POST",
            headers: headers,
            body: body
        });

        if (res.ok) {
            const data = await res.json();
            let text = "";
            let modelName = "";
            if (isGemini) {
                text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                modelName = "Gemini 2.0 Flash";
            } else {
                text = data?.choices?.[0]?.message?.content;
                modelName = "GPT-4o Mini";
            }
            return { text, model: modelName };
        }

        const errData = await res.json().catch(() => ({}));
        const msg = errData?.error?.message || res.statusText;

        if (res.status === 429) {
            if (attempt < maxRetries) {
                const loadingEl = document.querySelector(".loading-msg");
                if (loadingEl) loadingEl.textContent = `⏳ Rate limit hit, retrying in ${delay/1000}s… (attempt ${attempt}/${maxRetries})`;
                showNotification(`⏳ Rate limit – retrying in ${delay/1000}s…`, "warning");
                await new Promise(r => setTimeout(r, delay));
                delay *= 2;
                continue;
            }
            throw new Error("Rate limit exceeded. Please wait a minute and try again.");
        }

        if (res.status === 400) throw new Error(`Bad request: ${msg}`);
        if (res.status === 401) throw new Error("Invalid API key – check your key in API Settings");
        if (res.status === 403) throw new Error("API key doesn't have permission");
        throw new Error(`API error ${res.status}: ${msg}`);
    }
}

// ── Main AI call ──────────────────────────────────────────
async function askAI() {
    const q = document.getElementById("question").value.trim();
    if (!q)               { showNotification("⚠️ Please type a question", "warning"); return; }
    if (!uploadedDocument){ showNotification("⚠️ Upload a document first", "warning"); return; }

    if (!apiKey) {
        showNotification("⚠️ Please configure your API key first!", "warning");
        const s = document.querySelector(".api-key-section");
        if (s) {
            s.style.display = "block";
            setTimeout(() => document.getElementById("apiKeyInput")?.focus(), 100);
        }
        const card = document.querySelector(".api-card");
        if (card) card.scrollIntoView({ behavior: "smooth" });
        return;
    }

    sessionStats.questionsAsked++;
    appendChat("user", `<b>👤 You:</b> ${q}`);

    const loadingDiv = appendChat("ai", `<b>🤖 Assistant:</b> <span class="loading-msg"><i>Thinking…</i> ⏳</span>`);
    const askBtn = document.getElementById("askBtn");
    askBtn.disabled = true;
    askBtn.innerHTML = "⏳ Processing…";
    document.getElementById("question").value = "";

    try {
        const langNote = currentLanguage==="hindi"    ? " (Respond in Hindi)"    :
                         currentLanguage==="hinglish" ? " (Respond in Hinglish)" : "";
        const modeNote = currentMode==="exam"  ? "Give exam-focused, point-wise answer." :
                         currentMode==="teach" ? "Explain in detail like a teacher."     :
                                                 "Give a clear, readable explanation.";

        const prompt = `You are an expert exam assistant.
Mode: ${currentMode}. ${modeNote}
Answer length: suitable for ${currentMarks} marks.${langNote}

Document:
${uploadedDocument.substring(0, 4000)}

Student question: ${q}

Provide a helpful, accurate answer based on the document.`;

        const response = await fetchAIResponse(prompt);
        if (!response || !response.text) throw new Error("Empty response from AI – please try again");

        loadingDiv.remove();
        sessionStats.aiResponses++;

        const formatted = response.text
            .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
            .replace(/\*(.*?)\*/g, "<i>$1</i>")
            .replace(/\n/g, "<br>");

        appendChat("ai", `<b>🤖 Assistant:</b><br><br>${formatted}
            <div class="tags" style="margin-top:10px">
                <span>✅ Live</span>
                <span>⚡ ${response.model}</span>
                <span>📚 ${currentMode.toUpperCase()}</span>
                <span>⭐ ${currentMarks} Marks</span>
            </div>`);

    } catch (err) {
        console.error("askAI error:", err.message);
        loadingDiv.remove();

        appendChat("ai",
            `<b>🤖 Assistant (Offline):</b><br>${getFallbackResponse(q, currentMode, currentLanguage, currentMarks)}`,
            "border-left-color:#ffa500;"
        );
        appendChat("sys",
            `<b>❌ ${err.message}</b>`,
            "background:rgba(220,53,69,.15);color:#ff6b6b;border-left:4px solid #dc3545;"
        );
    } finally {
        askBtn.disabled = false;
        askBtn.innerHTML = "🚀 Ask";
        updateStatsDisplay();
        document.getElementById("chatBox").scrollTop = 99999;
    }
}

// ── Notification keyframes (injected once) ────────────────
const _style = document.createElement("style");
_style.textContent = `
@keyframes slideInRight  { from{transform:translateX(120%);opacity:0} to{transform:translateX(0);opacity:1} }
@keyframes slideOutRight { from{transform:translateX(0);opacity:1}    to{transform:translateX(120%);opacity:0} }
.controls button.active, .modes button.active {
    background: linear-gradient(135deg,#00f5ff,#ff00ff) !important;
    border-color: transparent !important;
    color: #fff !important;
}
.user-message {
    background: linear-gradient(135deg,rgba(0,245,255,.25),rgba(255,0,255,.25)) !important;
    border-left-color: #ff00ff !important;
    text-align: right;
}
`;
document.head.appendChild(_style);

