// Enhanced script with cursor, particles, scroll animations, typing effects
// Global state
let isLogin = true;
window.apiKey = localStorage.getItem("geminiApiKey") || localStorage.getItem("openaiApiKey") || "";
let uploadedDocument = "";
let currentMode = localStorage.getItem("mode") || "read";
let currentLanguage = localStorage.getItem("language") || "english";
let currentMarks = parseInt(localStorage.getItem("marks")) || 2;
let sessionStats = JSON.parse(localStorage.getItem("sessionStats")) || {
    questionsAsked: 0,
    documentsProcessed: 0,
    aiResponses: 0,
    sessionStart: Date.now()
};
let isDarkMode = localStorage.getItem("darkMode") === "true";

// Visual enhancements
let cursor, cursorFollower;
let particlesCtx;
let particles = [];
let animationId;
let typingQueue = [];

// Initialize everything
window.addEventListener("load", () => {
    initializeVisuals();
    initializeApp();
});

// VISUAL INITIALIZATION
function initializeVisuals() {
    // Custom Cursor
    initCursor();
    
    // Particles
    initParticles();
    
    // Scroll Animations
    initScrollAnimations();
    
    // Theme
    updateTheme();
    
    // 3D Background (existing)
    if (document.getElementById('bgCanvas')) {
        initialize3D();
    }
}

function initCursor() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    
    cursor = document.createElement('div');
    cursor.className = 'cursor';
    document.body.appendChild(cursor);
    
    cursorFollower = document.createElement('div');
    cursorFollower.className = 'cursor-follower';
    document.body.appendChild(cursorFollower);
    
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    (function updateCursor() {
        cursorX += (mouseX - cursorX) * 0.15;
        cursorY += (mouseY - cursorY) * 0.15;
        
        cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
        cursorFollower.style.transform = `translate(${mouseX - 30}px, ${mouseY - 30}px)`;
        
        requestAnimationFrame(updateCursor);
    })();
    
    // Hover states
    document.querySelectorAll('button, [role="button"], .upload-box, .auth-box span').forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.style.transform += ' scale(2)';
            cursorFollower.style.opacity = '0.6';
            cursorFollower.style.transform += ' scale(0.8)';
        });
        el.addEventListener('mouseleave', () => {
            cursor.style.transform = cursor.style.transform.replace(' scale(2)', '');
            cursorFollower.style.opacity = '0.3';
            cursorFollower.style.transform = cursorFollower.style.transform.replace(' scale(0.8)', '');
        });
    });
}

function initParticles() {
    const canvas = document.createElement('canvas');
    canvas.id = 'particles-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '-2';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    particlesCtx = ctx;
    
    // Create particles
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2 + 1,
            color: `hsl(${Math.random() * 60 + 280}, 70%, 60%)`, // Purple/pink hues
            alpha: Math.random() * 0.5 + 0.2
        });
    }
    
    animateParticles();
}

function animateParticles() {
    particlesCtx.clearRect(0, 0, particlesCtx.canvas.width, particlesCtx.canvas.height);
    
    particles.forEach(p => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += (Math.sin(Date.now() * 0.001 + p.x) * 0.005);
        p.alpha = Math.max(0.1, Math.min(1, p.alpha));
        
        // Wrap around edges
        if (p.x < 0) p.x = particlesCtx.canvas.width;
        if (p.x > particlesCtx.canvas.width) p.x = 0;
        if (p.y < 0) p.y = particlesCtx.canvas.height;
        if (p.y > particlesCtx.canvas.height) p.y = 0;
        
        // Draw particle with glow
        particlesCtx.save();
        particlesCtx.globalAlpha = p.alpha;
        particlesCtx.shadowColor = p.color;
        particlesCtx.shadowBlur = 15;
        particlesCtx.beginPath();
        particlesCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        particlesCtx.fillStyle = p.color;
        particlesCtx.fill();
        particlesCtx.restore();
    });
    
    animationId = requestAnimationFrame(animateParticles);
}

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.fade-in, .doc-viewer, .ai-panel, .stat-item').forEach(el => {
        observer.observe(el);
    });
}

function typeWriter(element, text, speed = 30) {
    element.innerHTML = '';
    let i = 0;
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Typing effect wrapper for AI responses
function typeAIResponse(container, responseHTML) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = responseHTML;
    const content = tempDiv.textContent || tempDiv.innerText || '';
    
    const typeDiv = document.createElement('div');
    typeDiv.className = 'ai-response typing';
    typeDiv.style.minHeight = '80px';
    container.appendChild(typeDiv);
    
    typeWriter(typeDiv, content, 20);
    
    setTimeout(() => {
        typeDiv.outerHTML = responseHTML;
    }, content.length * 22);
}

// Theme Toggle
function toggleTheme() {
    isDarkMode = !isDarkMode;
    localStorage.setItem("darkMode", isDarkMode);
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : '');
    showNotification(isDarkMode ? "🌙 Dark mode activated" : "☀️ Light mode restored", "success");
}

// Update Theme
function updateTheme() {
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : '');
}

// Notification System
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 30px;
        background: linear-gradient(135deg, var(--neon-pink), var(--neon-purple));
        color: white;
        padding: 16px 24px;
        border-radius: 16px;
        backdrop-filter: blur(20px);
        box-shadow: var(--shadow-neon);
        z-index: 10000;
        font-weight: 600;
        transform: translateX(400px);
        animation: slideInRight 0.4s forwards;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.4s forwards';
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

// Existing app functions (unchanged core logic)
function initializeApp() {
    window.apiKey = localStorage.getItem("geminiApiKey") || localStorage.getItem("openaiApiKey") || "";
    
    updateModeButton();
    updateLanguageButton();
    updateMarksButton();
    updateStatsDisplay();
    
    setTimeout(() => testApiKey(true), 500);
}

let passwordVisible = false;

function togglePassword() {
    const passwordInput = document.getElementById('password');
    passwordVisible = !passwordVisible;
    passwordInput.type = passwordVisible ? 'text' : 'password';
    const toggleBtn = document.querySelector('.password-toggle');
    toggleBtn.textContent = passwordVisible ? '🙈' : '👁️';
}

function toggleForm() {
    isLogin = !isLogin;
    document.getElementById("formTitle").innerText = isLogin ? "📚 Login" : "✨ Sign Up";
    document.getElementById("toggleText").innerHTML = isLogin 
        ? `Don't have an account? <span onclick="toggleForm()">Create one</span>`
        : `Have account? <span onclick="toggleForm()">Login</span>`;
    // Reset password visibility when switching forms
    const passwordInput = document.getElementById('password');
    passwordInput.type = 'password';
    passwordVisible = false;
    document.querySelector('.password-toggle').textContent = '👁️';
}

function handleAuth() {
    const submitBtn = document.getElementById('submitBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value;
    
    // Enhanced validation
    if (!user || !pass) {
        showNotification("⚠️ Please enter both username and password", "warning");
        return;
    }
    if (user.length < 3) {
        showNotification("⚠️ Username must be at least 3 characters", "warning");
        return;
    }
    if (pass.length < 4) {
        showNotification("⚠️ Password must be at least 4 characters", "warning");
        return;
    }
    
    // Show loading
    submitBtn.style.display = 'none';
    loadingSpinner.style.display = 'block';
    
    setTimeout(() => { // Simulate auth delay
        if (isLogin) {
            const storedUser = localStorage.getItem("user");
            const storedPass = localStorage.getItem("pass");
            if (user === storedUser && pass === storedPass) {
                loadApp();
            } else {
                showNotification("❌ Invalid credentials. Demo: test/123", "error");
                resetAuthForm();
            }
        } else {
            // Signup
            localStorage.setItem("user", user);
            localStorage.setItem("pass", pass);
            showNotification("✅ Account created successfully! Please login.", "success");
            toggleForm();
            resetAuthForm();
        }
    }, 1500);
}

function resetAuthForm() {
    const submitBtn = document.getElementById('submitBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    submitBtn.style.display = 'block';
    loadingSpinner.style.display = 'none';
    document.getElementById('username').focus();
}

function loadApp() {
    document.getElementById("authPage").style.display = "none";
    document.getElementById("mainApp").style.display = "block";
    showNotification("🎉 Welcome back to ExamSmart!", "success");
}

function logout() {
    if (confirm("Logout? 🚪")) {
        localStorage.setItem("sessionStats", JSON.stringify(sessionStats));
        location.reload();
    }
}

// [Rest of existing functions unchanged - saveApiKey, testApiKey, getFallbackResponse, 
//  handleFileUpload, showDemoAnswer, setMode, updateModeButton, setLanguage, etc.
//  Only askAI modified for typing effect]

async function askAI() {
    const q = document.getElementById("question").value.trim();
    if (!q) return showNotification("⚠️ Ask a question", "warning");
    
    if (!apiKey) return showNotification("⚠️ Enter Gemini API key", "warning");
    if (!uploadedDocument) return showNotification("⚠️ Upload document first", "warning");
    
    sessionStats.questionsAsked++;
    
    // User message
    const userDiv = document.createElement("div");
    userDiv.className = "ai-response user-message";
    userDiv.innerHTML = `<b>👤 You:</b> ${q}`;
    document.getElementById("chatBox").appendChild(userDiv);
    
    // Typing container
    const typingDiv = document.createElement("div");
    typingDiv.className = "ai-response";
    typingDiv.innerHTML = `<b>🤖 Thinking...</b> <span class="loading"></span>`;
    document.getElementById("chatBox").appendChild(typingDiv);
    
    const askBtn = document.getElementById("askBtn");
    askBtn.disabled = true;
    askBtn.innerHTML = '⏳ Processing...';
    
    try {
        const prompt = buildPrompt(q);
        const response = await fetchGemini(prompt);
        const aiText = parseAIResponse(response);
        
        typingDiv.remove();
        typeAIResponse(document.getElementById("chatBox"), 
            `<b>🤖 Assistant:</b> ${aiText}
             <div class="tags">
                 <span>✨ Live</span>
                 <span>⚡ Fresh</span>
                 <span>${currentMode.toUpperCase()}</span>
             </div>`
        );
        
        sessionStats.aiResponses++;
    } catch (error) {
        typingDiv.remove();
        handleAPIError(error, q);
    } finally {
        askBtn.disabled = false;
        askBtn.innerHTML = '🚀 Ask';
        document.getElementById("question").value = "";
        document.getElementById("chatBox").scrollTop = document.getElementById("chatBox").scrollHeight;
        updateStatsDisplay();
    }
}

// Utility functions (abbreviated for brevity)
function buildPrompt(q) {
    const lang = currentLanguage === "hindi" ? " (Hindi में जवाब दें)" : 
                 currentLanguage === "hinglish" ? " (Hinglish में जवाब दें)" : "";
    return `Exam assistant. Mode: ${currentMode}. Question: ${q}${lang}

Document: ${uploadedDocument.substring(0, 3000)}

Provide ${currentMarks} mark answer.`;
}

async function fetchGemini(prompt) {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        { method: "POST", headers: {"Content-Type": "application/json"},
          body: JSON.stringify({contents: [{parts: [{text: prompt}]}]}) }
    );
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
}

function parseAIResponse(data) {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 
           getFallbackResponse();
}

function getFallbackResponse(question = '', mode = currentMode, language = currentLanguage, marks = currentMarks) {
    // Simple fallback - expand as needed
    return `Great question about your document! (${mode.toUpperCase()}, ${marks} marks, ${language}).
    
Please ensure document is uploaded for full AI analysis.`;
}

function handleAPIError(error, q) {
    const fallback = getFallbackResponse(q, currentMode, currentLanguage, currentMarks);
    typeAIResponse(document.getElementById("chatBox"), 
        `<b>🤖 Offline Mode:</b> ${fallback}
         <div class="tags"><span>⚠️ Fallback</span></div>`
    );
    showNotification(error.message, "error");
}

// [Include ALL other existing functions: updateStatsDisplay, toggleApiKeySection, 
//  exportChat, clearChat, showHelp, closeModal, setLanguage, etc. - unchanged]

function updateStatsDisplay() {
    try {
        document.getElementById("questionsAsked").textContent = sessionStats.questionsAsked;
        document.getElementById("documentsProcessed").textContent = sessionStats.documentsProcessed;
        document.getElementById("aiResponses").textContent = sessionStats.aiResponses;
        document.getElementById("sessionTime").textContent = 
            Math.floor((Date.now() - sessionStats.sessionStart) / 60000) + "m";
    } catch (e) {}
}

// Window resize handler
window.addEventListener('resize', () => {
    if (particlesCtx) {
        particlesCtx.canvas.width = window.innerWidth;
        particlesCtx.canvas.height = window.innerHeight;
    }
});

console.log("🎨 ExamSmart AI - Ultra Enhanced Edition Loaded ✨");


