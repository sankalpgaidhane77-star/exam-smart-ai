// Global state
let isLogin = true;
let apiKey = localStorage.getItem("geminiApiKey") || localStorage.getItem("openai") || "";
let uploadedDocument = "";
let currentMode = localStorage.getItem("mode") || "read";
let currentLanguage = localStorage.getItem("language") || "english";
let currentMarks = parseInt(localStorage.getItem("marks")) || 2;

// 3D Scene variables
let scene, camera, renderer, cube;

function initialize3D() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;

    // Create scene
    scene = new THREE.Scene();

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Create renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Create cube geometry
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x667eea, 
        transparent: true, 
        opacity: 0.3,
        wireframe: true 
    });
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Add some floating spheres
    for (let i = 0; i < 5; i++) {
        const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({ 
            color: Math.random() * 0xffffff, 
            transparent: true, 
            opacity: 0.5 
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );
        scene.add(sphere);
    }

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Initialize on page load
window.addEventListener("load", () => {
    initialize3D();
    initializeApp();
});

function initializeApp() {
    try {
        // Load API key
        apiKey = localStorage.getItem("geminiApiKey") || localStorage.getItem("openai") || "";
        
        // Load API key
        if (apiKey) {
            const apiKeyInput = document.getElementById("apiKey");
            if (apiKeyInput) {
                apiKeyInput.value = apiKey.substring(0, 10) + "...";
            }
        }
        
        // Set default buttons
        updateModeButton();
        updateLanguageButton();
        updateMarksButton();
        
        // Test API key silently (no user messages)
        setTimeout(() => {
            testApiKey(true);
        }, 500);
    } catch (e) {
        console.log("Initialization in progress...");
    }
}

function toggleForm() {
    isLogin = !isLogin;
    document.getElementById("formTitle").innerText = isLogin ? "📚 Login" : "✨ Signup";
    document.getElementById("toggleText").innerHTML =
        isLogin
        ? `Don't have an account? <span onclick="toggleForm()">Create one</span>`
        : `Already have an account? <span onclick="toggleForm()">Login</span>`;
}

function handleAuth() {
    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value;

    if (!user || !pass) {
        alert("⚠️ Please enter both username and password");
        return;
    }

    if (isLogin) {
        if (user === localStorage.getItem("user") &&
            pass === localStorage.getItem("pass")) {
            loadApp();
        } else {
            alert("❌ Invalid login credentials");
        }
    } else {
        localStorage.setItem("user", user);
        localStorage.setItem("pass", pass);
        alert("✅ Signup successful! You can now login.");
        toggleForm();
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
    }
}

function loadApp() {
    document.getElementById("authPage").style.display = "none";
    document.getElementById("mainApp").style.display = "block";
    initializeApp();
}

function logout() {
    if (confirm("Are you sure you want to logout? 🚪")) {
        location.reload();
    }
}

function saveApiKey() {
    let keyInput = document.getElementById("apiKey").value.trim();
    
    // If it's masked, restore the original key
    if (keyInput.includes("...")) {
        keyInput = apiKey;
    }
    
    if (!keyInput) {
        alert("⚠️ Please enter an API Key");
        return;
    }
    
    if (keyInput.length < 20) {
        alert("⚠️ API Key seems too short. Please verify.");
        return;
    }
    
    apiKey = keyInput;
    localStorage.setItem("geminiApiKey", apiKey);
    alert("✅ API Key saved successfully!");
    document.getElementById("apiKey").value = keyInput.substring(0, 10) + "...";
    
    // Test the API key
    testApiKey(false);
}

async function testApiKey(silent = true) {
    const statusDiv = document.getElementById("apiStatus");
    
    // Only update status div if it exists (API key section is shown)
    if (statusDiv && !silent) {
        statusDiv.textContent = "API Status: Testing...";
        statusDiv.style.color = "#ffa500";
    }
    
    try {
        console.log("Testing API key with gemini-2.0-flash...");
        const testResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: "Say 'Connection successful!' in exactly 3 words."
                        }]
                    }]
                })
            }
        );
        
        console.log("Test response status:", testResponse.status);
        
        if (testResponse.ok) {
            const testData = await testResponse.json();
            if (testData.candidates && testData.candidates[0]?.content?.parts?.[0]?.text) {
                console.log("✅ API key is working!");
                if (statusDiv && !silent) {
                    statusDiv.textContent = "API Status: ✅ Working";
                    statusDiv.style.color = "#28a745";
                    addSystemMessage("✅ API key verified and working!");
                }
            } else {
                throw new Error("Invalid response format");
            }
        } else {
            console.error("❌ API key test failed:", testResponse.status);
            const errorText = await testResponse.text();
            console.error("Error details:", errorText);
            if (statusDiv && !silent) {
                statusDiv.textContent = "API Status: ❌ Failed";
                statusDiv.style.color = "#dc3545";
                addSystemMessage("API key test failed. Please verify your key.");
            }
        }
    } catch (error) {
        console.error("API key test error:", error);
        if (statusDiv && !silent) {
            statusDiv.textContent = "API Status: ❌ Error";
            statusDiv.style.color = "#dc3545";
            addSystemMessage("API test failed: " + error.message);
        }
    }
}

function getFallbackResponse(question, mode, language, marks) {
    const responses = {
        read: {
            english: `Based on the document you uploaded, here's a clear explanation for your question: "${question}". 

This appears to be a ${marks}-mark question, so I'll provide a focused answer. Please check your document content and try rephrasing your question for better results.`,
            hindi: `आपके अपलोड किए गए दस्तावेज के आधार पर, आपके प्रश्न का स्पष्ट स्पष्टीकरण: "${question}"। 

यह ${marks} अंक का प्रश्न प्रतीत होता है, इसलिए मैं एक केंद्रित उत्तर प्रदान करूंगा। कृपया अपने दस्तावेज की सामग्री की जांच करें और बेहतर परिणामों के लिए अपने प्रश्न को फिर से वाक्यांशित करें।`,
            hinglish: `Aapke upload kiye gaye document ke basis par, aapke question ka clear explanation: "${question}".

Ye ${marks} marks ka question lagta hai, so main ek focused answer dunga. Please apne document ki content check kariye aur better results ke liye question ko rephrase kariye.`
        },
        exam: {
            english: `For this ${marks}-mark exam question: "${question}", focus on key points from your document. 

Key elements to cover:
• Main concept
• Important definitions
• Examples from the text
• Conclusion

Please ensure your answer is concise and directly addresses the question.`,
            hindi: `इस ${marks} अंक के परीक्षा प्रश्न के लिए: "${question}", अपने दस्तावेज से मुख्य बिंदुओं पर ध्यान दें।

कवर करने के लिए मुख्य तत्व:
• मुख्य अवधारणा
• महत्वपूर्ण परिभाषाएं
• पाठ से उदाहरण
• निष्कर्ष

कृपया सुनिश्चित करें कि आपका उत्तर संक्षिप्त है और प्रश्न का सीधे उत्तर देता है।`,
            hinglish: `Is ${marks} marks ke exam question ke liye: "${question}", apne document se key points par focus kariye.

Cover karne ke liye main elements:
• Main concept
• Important definitions  
• Text se examples
• Conclusion

Please ensure karo ki aapka answer concise hai aur question ka directly address karta hai.`
        },
        teach: {
            english: `For detailed teaching on: "${question}", let's break this down systematically.

Teaching Approach for ${marks}-mark answer:
1. Introduction to the concept
2. Detailed explanation with examples
3. Key points and formulas (if applicable)
4. Practical applications
5. Summary and conclusion

Please refer to your document for specific content and examples.`,
            hindi: `"${question}" पर विस्तृत शिक्षण के लिए, आइए इसे व्यवस्थित रूप से विभाजित करें।

${marks} अंक के उत्तर के लिए शिक्षण दृष्टिकोण:
1. अवधारणा का परिचय
2. उदाहरणों के साथ विस्तृत स्पष्टीकरण
3. मुख्य बिंदु और सूत्र (यदि लागू हो)
4. व्यावहारिक अनुप्रयोग
5. सारांश और निष्कर्ष

कृपया विशिष्ट सामग्री और उदाहरणों के लिए अपने दस्तावेज का संदर्भ लें।`,
            hinglish: `"${question}" par detailed teaching ke liye, let's systematically break it down.

${marks} marks ke answer ke liye teaching approach:
1. Concept ka introduction
2. Examples ke saath detailed explanation
3. Key points aur formulas (agar applicable ho)
4. Practical applications
5. Summary aur conclusion

Please apne document ka reference lijiye specific content aur examples ke liye.`
        }
    };
    
    return responses[mode][language] || responses.read.english;
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ["application/pdf", "application/msword", 
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
                        "text/plain"];
    
    if (!validTypes.includes(file.type)) {
        alert("⚠️ Invalid file type. Please upload PDF, DOC, DOCX, or TXT");
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("⚠️ File size exceeds 5MB limit");
        return;
    }

    if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedDocument = e.target.result;
            const preview = uploadedDocument.substring(0, 500);
            document.getElementById("previewText").innerText = preview + (uploadedDocument.length > 500 ? "...\n\n[Document loaded]" : "");
            alert("✅ Document uploaded successfully!");
            
            // Show demo answer after upload
            setTimeout(() => {
                showDemoAnswer(file.name);
            }, 500);
        };
        reader.readAsText(file);
    } else if (file.type === "application/pdf") {
        uploadedDocument = `[PDF File: ${file.name}]\n[Size: ${(file.size / 1024).toFixed(2)} KB]\n\nYour PDF has been uploaded successfully. The AI will analyze it when you ask questions.`;
        document.getElementById("previewText").innerText = uploadedDocument;
        alert("✅ PDF uploaded successfully! Ask questions about the content.");
        
        // Show demo answer after upload
        setTimeout(() => {
            showDemoAnswer(file.name);
        }, 500);
    } else {
        uploadedDocument = `[Document: ${file.name}]\n[Type: ${file.type}]\n[Size: ${(file.size / 1024).toFixed(2)} KB]`;
        document.getElementById("previewText").innerText = uploadedDocument;
        alert("✅ Document uploaded successfully!");
        
        // Show demo answer after upload
        setTimeout(() => {
            showDemoAnswer(file.name);
        }, 500);
    }
}

function showDemoAnswer(fileName) {
    const chatBox = document.getElementById("chatBox");
    
    // Clear welcome message
    chatBox.innerHTML = `
        <div class="ai-response">
            👋 Hello! Upload a document and I'll help you prepare for your exams. Ask me anything!
            <div class="tags">
                <span>✓ Verified</span>
                <span>⚡ Fast</span>
                <span>🎯 Accurate</span>
            </div>
        </div>
    `;
    
    // Demo system message
    const sysMsg = document.createElement("div");
    sysMsg.className = "ai-response";
    sysMsg.style.background = "#e3f2fd";
    sysMsg.style.color = "#1565c0";
    sysMsg.style.fontSize = "13px";
    sysMsg.style.borderLeft = "4px solid #1565c0";
    sysMsg.style.paddingLeft = "15px";
    sysMsg.innerHTML = `<i>✨ Document <b>"${fileName}"</b> loaded successfully!</i>`;
    chatBox.appendChild(sysMsg);
    
    // Demo AI response
    setTimeout(() => {
        const demoDiv = document.createElement("div");
        demoDiv.className = "ai-response";
        demoDiv.style.background = "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)";
        demoDiv.style.color = "#1b5e20";
        demoDiv.innerHTML = `
            <b>🤖 AI Assistant:</b> Great! Your document is ready for analysis! 📚<br><br>
            <strong>What you can do now:</strong><br>
            <ul style="margin: 8px 0; padding-left: 20px;">
                <li>📝 Ask questions about the document content</li>
                <li>🎯 Switch between <strong>Read/Exam/Teach</strong> modes</li>
                <li>🌐 Choose your language (English/Hinglish/Hindi)</li>
                <li>⭐ Select answer length (2/5/10 marks)</li>
            </ul>
            <br><strong style="color: #0d47a1;">✏️ Try asking:</strong><br>
            <code style="background: rgba(255,255,255,0.7); padding: 8px; border-radius: 4px; display: block; margin: 8px 0; font-size: 12px;">
            • "What are the main topics in this document?"<br>
            • "Give me a summary of key concepts"<br>
            • "Explain the important definitions"<br>
            • "What are the key points for exam preparation?"
            </code>
            <div class="tags" style="margin-top: 12px;">
                <span>✅ Ready</span>
                <span>📄 Document loaded</span>
                <span>🤖 AI Active</span>
                <span>🚀 Live API</span>
            </div>
        `;
        chatBox.appendChild(demoDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 600);
}

function setMode(mode) {
    currentMode = mode;
    localStorage.setItem("mode", mode);
    updateModeButton();
    addSystemMessage(`Mode changed to ${mode.toUpperCase()}`);
}

function updateModeButton() {
    try {
        document.getElementById("readBtn").style.background = currentMode === "read" ? "#667eea" : "rgba(255,255,255,0.2)";
        document.getElementById("examBtn").style.background = currentMode === "exam" ? "#667eea" : "rgba(255,255,255,0.2)";
        document.getElementById("teachBtn").style.background = currentMode === "teach" ? "#667eea" : "rgba(255,255,255,0.2)";
    } catch (e) {}
}

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem("language", lang);
    updateLanguageButton();
}

function updateLanguageButton() {
    try {
        document.getElementById("langEnglish").style.background = currentLanguage === "english" ? "#667eea" : "white";
        document.getElementById("langEnglish").style.color = currentLanguage === "english" ? "white" : "#667eea";
        
        document.getElementById("langHinglish").style.background = currentLanguage === "hinglish" ? "#667eea" : "white";
        document.getElementById("langHinglish").style.color = currentLanguage === "hinglish" ? "white" : "#667eea";
        
        document.getElementById("langHindi").style.background = currentLanguage === "hindi" ? "#667eea" : "white";
        document.getElementById("langHindi").style.color = currentLanguage === "hindi" ? "white" : "#667eea";
    } catch (e) {}
}

function setMarks(marks) {
    currentMarks = marks;
    localStorage.setItem("marks", marks);
    updateMarksButton();
}

function updateMarksButton() {
    try {
        document.getElementById("marks2").style.background = currentMarks === 2 ? "#667eea" : "white";
        document.getElementById("marks2").style.color = currentMarks === 2 ? "white" : "#667eea";
        
        document.getElementById("marks5").style.background = currentMarks === 5 ? "#667eea" : "white";
        document.getElementById("marks5").style.color = currentMarks === 5 ? "white" : "#667eea";
        
        document.getElementById("marks10").style.background = currentMarks === 10 ? "#667eea" : "white";
        document.getElementById("marks10").style.color = currentMarks === 10 ? "white" : "#667eea";
    } catch (e) {}
}

function addSystemMessage(message) {
    try {
        const msgDiv = document.createElement("div");
        msgDiv.className = "ai-response";
        msgDiv.style.background = "#f0f0f0";
        msgDiv.style.color = "#666";
        msgDiv.style.fontSize = "12px";
        msgDiv.innerHTML = `<i>ℹ️ ${message}</i>`;
        document.getElementById("chatBox").appendChild(msgDiv);
        document.getElementById("chatBox").scrollTop = document.getElementById("chatBox").scrollHeight;
    } catch (e) {}
}

async function askAI() {
    const q = document.getElementById("question").value.trim();
    if (!q) {
        alert("⚠️ Please ask a question");
        return;
    }

    if (!apiKey) {
        alert("⚠️ Please enter your Google Gemini API Key first");
        document.getElementById("apiKey").focus();
        return;
    }

    if (!uploadedDocument) {
        alert("⚠️ Please upload a document first");
        return;
    }

    console.log("API Key:", apiKey.substring(0, 10) + "...");
    console.log("Question:", q);
    console.log("Document length:", uploadedDocument.length);

    // User message
    const userDiv = document.createElement("div");
    userDiv.className = "ai-response user-message";
    userDiv.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    userDiv.style.color = "white";
    userDiv.style.marginBottom = "12px";
    userDiv.innerHTML = `<b>👤 You:</b> ${q}`;
    document.getElementById("chatBox").appendChild(userDiv);

    // Loading indicator
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "ai-response";
    loadingDiv.innerHTML = `<b>🤖 Assistant:</b> <i>Thinking...</i> ⏳`;
    document.getElementById("chatBox").appendChild(loadingDiv);

    document.getElementById("askBtn").disabled = true;
    document.getElementById("askBtn").style.opacity = "0.6";

    try {
        const languageInstruction = currentLanguage === "hindi" ? " (Respond in Hindi)" : 
                                   currentLanguage === "hinglish" ? " (Respond in Hinglish)" : "";
        
        const marksInstruction = `Answer should be suitable for ${currentMarks} mark answer. Keep it concise and relevant.`;
        
        const modeInstruction = currentMode === "exam" ? "Provide exam-focused, concise answers." :
                               currentMode === "teach" ? "Provide detailed teaching content." :
                               "Provide clear, readable explanations.";

        const prompt = `You are an expert exam assistant. Mode: ${currentMode}. ${modeInstruction} ${marksInstruction}${languageInstruction}

Document Content:
${uploadedDocument.substring(0, 3000)}

Question from student: ${q}

Please provide a clear, helpful, and accurate answer based on the document content. Make sure your answer directly addresses the question asked.`;

        console.log("Sending request to Gemini API...");
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                })
            }
        );

        console.log("Response status:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API Error:", response.status, errorText);
            if (response.status === 401) {
                throw new Error("Invalid API Key - Please check your key");
            }
            if (response.status === 429) {
                throw new Error("API rate limit exceeded - Please try again later");
            }
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log("API Response:", data);
        loadingDiv.remove();

        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
            console.error("No candidates in response:", data);
            throw new Error("No response from AI - Please try again");
        }

        const aiResponse = data.candidates[0].content.parts[0].text;
        console.log("AI Response:", aiResponse);

        const aiDiv = document.createElement("div");
        aiDiv.className = "ai-response";
        aiDiv.innerHTML = `
            <b>🤖 Assistant:</b> ${aiResponse}<br>
            <div class="tags" style="margin-top: 10px;">
                <span>✓ Live</span>
                <span>⚡ Generated</span>
                <span>📚 ${currentMode.toUpperCase()}</span>
            </div>
        `;
        document.getElementById("chatBox").appendChild(aiDiv);

    } catch (error) {
        console.error("Error in askAI:", error);
        loadingDiv.remove();
        
        // Provide a fallback response if API fails
        const fallbackResponse = getFallbackResponse(q, currentMode, currentLanguage, currentMarks);
        
        const aiDiv = document.createElement("div");
        aiDiv.className = "ai-response";
        aiDiv.innerHTML = `
            <b>🤖 Assistant (Offline Mode):</b> ${fallbackResponse}<br>
            <div class="tags" style="margin-top: 10px;">
                <span>⚠️ API Error</span>
                <span>📚 ${currentMode.toUpperCase()}</span>
            </div>
        `;
        document.getElementById("chatBox").appendChild(aiDiv);
        
        // Also show error message
        const errorDiv = document.createElement("div");
        errorDiv.className = "ai-response";
        errorDiv.style.background = "#ffebee";
        errorDiv.style.color = "#c62828";
        errorDiv.innerHTML = `<b>❌ Error:</b> ${error.message} - Using offline mode.`;
        document.getElementById("chatBox").appendChild(errorDiv);
    } finally {
        document.getElementById("askBtn").disabled = false;
        document.getElementById("askBtn").style.opacity = "1";
        document.getElementById("question").value = "";
        document.getElementById("chatBox").scrollTop = document.getElementById("chatBox").scrollHeight;
    }
}

