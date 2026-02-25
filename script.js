// API URL - Detecta automáticamente si estamos en desarrollo o producción
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://product-ai-backend.onrender.com';

// Estado
let currentUser = null;

// Elementos DOM
const registerSection = document.getElementById('register-section');
const mainSection = document.getElementById('main-section');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const registerName = document.getElementById('register-name');
const userEmail = document.getElementById('user-email');
const userPlan = document.getElementById('user-plan');
const generateBtn = document.getElementById('generate-btn');
const productDetails = document.getElementById('product-details');
const toneSelect = document.getElementById('tone');
const outputSection = document.getElementById('output-section');
const descriptionOutput = document.getElementById('description-output');
const loading = document.getElementById('loading');
const copyBtn = document.getElementById('copy-btn');
const historyList = document.getElementById('history-list');
const logoutBtn = document.getElementById('logout-btn');
const usageCount = document.getElementById('usage-count');
const usageLimit = document.getElementById('usage-limit');
const progressFill = document.getElementById('progress-fill');
const upgradeSection = document.getElementById('upgrade-section');
const verificationMessage = document.getElementById('verification-message');
const verificationPending = document.getElementById('verification-pending');
const resendVerificationBtn = document.getElementById('resend-verification-btn');
const seoSection = document.getElementById('seo-section');
const metaDescriptionSpan = document.getElementById('meta-description');
const suggestedKeywordsSpan = document.getElementById('suggested-keywords');

// ============================================
// VERIFICAR PARÁMETROS DE URL (Google y Email)
// ============================================
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Google Auth success
    const googleUser = urlParams.get('googleUser');
    if (googleUser) {
        try {
            currentUser = JSON.parse(decodeURIComponent(googleUser));
            localStorage.setItem('user', JSON.stringify(currentUser));
            showMainSection();
            loadHistory();
            // Limpiar URL
            window.history.replaceState({}, document.title, '/');
        } catch (e) {
            console.error('Error parsing Google user:', e);
        }
    }
    
    // Email verification
    const verification = urlParams.get('verification');
    if (verification === 'success') {
        showMessage('✅ Email verified successfully! You can now log in.', 'success');
        window.history.replaceState({}, document.title, '/');
    } else if (verification === 'invalid') {
        showMessage('❌ Invalid or expired verification link.', 'error');
        window.history.replaceState({}, document.title, '/');
    } else if (verification === 'failed') {
        showMessage('❌ Verification failed. Please try again.', 'error');
        window.history.replaceState({}, document.title, '/');
    }
}

// ============================================
// MOSTRAR MENSAJES
// ============================================
function showMessage(text, type = 'info') {
    if (verificationMessage) {
        verificationMessage.style.display = 'block';
        verificationMessage.textContent = text;
        verificationMessage.className = `verification-message ${type}`;
        setTimeout(() => {
            verificationMessage.style.display = 'none';
        }, 5000);
    }
}

// ============================================
// PESTAÑAS DE AUTH
// ============================================
if (loginTab && registerTab) {
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    });

    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.style.display = 'block';
        loginForm.style.display = 'none';
    });
}

// ============================================
// LOGIN
// ============================================
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = loginEmail.value;
        const password = loginPassword.value;

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                currentUser = {
                    id: data.user.id,
                    email: data.user.email,
                    plan: data.user.plan,
                    is_verified: data.user.is_verified
                };
                localStorage.setItem('user', JSON.stringify(currentUser));
                showMainSection();
                loadHistory();
            } else {
                if (data.needs_verification) {
                    // Mostrar opción de reenviar verificación
                    if (verificationPending) {
                        verificationPending.style.display = 'block';
                        verificationPending.dataset.email = email;
                    }
                    showMessage('⚠️ Please verify your email before logging in.', 'warning');
                } else {
                    alert('Error: ' + data.error);
                }
            }
        } catch (error) {
            alert('Error connecting to server');
            console.error(error);
        }
    });
}

// ============================================
// REGISTRO
// ============================================
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = registerEmail.value;
        const password = registerPassword.value;
        const full_name = registerName.value;

        if (!email || !password) {
            alert('Email and password are required');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, full_name })
            });

            const data = await response.json();

            if (data.success) {
                showMessage('✅ Registration successful! Please check your email to verify your account.', 'success');
                
                // Cambiar a pestaña de login
                loginTab.click();
                
                // Limpiar campos
                registerEmail.value = '';
                registerPassword.value = '';
                registerName.value = '';
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Error connecting to server');
            console.error(error);
        }
    });
}

// ============================================
// REENVIAR VERIFICACIÓN
// ============================================
if (resendVerificationBtn) {
    resendVerificationBtn.addEventListener('click', async () => {
        const email = verificationPending?.dataset.email;
        
        if (!email) return;

        try {
            const response = await fetch(`${API_URL}/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.success) {
                showMessage('✅ Verification email resent! Please check your inbox.', 'success');
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Error connecting to server');
        }
    });
}

// ============================================
// GENERAR DESCRIPCIÓN
// ============================================
if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
        const details = productDetails.value.trim();
        
        if (!details) {
            alert('Please enter product details');
            return;
        }

        if (!currentUser) {
            alert('Please login first');
            return;
        }

        if (!currentUser.is_verified) {
            alert('Please verify your email before generating descriptions');
            return;
        }

        loading.style.display = 'block';
        outputSection.style.display = 'none';
        if (seoSection) seoSection.style.display = 'none';

        try {
            const response = await fetch(`${API_URL}/generate-description`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    product_details: details,
                    tone: toneSelect.value,
                    language: 'en',
                    include_seo: true
                })
            });

            const data = await response.json();

            if (data.success) {
                descriptionOutput.textContent = data.description;
                outputSection.style.display = 'block';
                
                // Mostrar SEO info si existe
                if (data.meta_description || data.suggested_keywords?.length) {
                    if (metaDescriptionSpan) {
                        metaDescriptionSpan.textContent = data.meta_description || 'Not available';
                    }
                    if (suggestedKeywordsSpan) {
                        suggestedKeywordsSpan.textContent = data.suggested_keywords?.join(', ') || 'Not available';
                    }
                    if (seoSection) seoSection.style.display = 'block';
                }
                
                if (data.remaining !== undefined) {
                    updateUsageInfo(data.remaining);
                }
                
                loadHistory();
            } else {
                if (data.error && data.error.includes('Límite')) {
                    alert(`⚠️ ${data.error}\nPlan: ${data.plan}\nUsados: ${data.current}/${data.limit}`);
                } else {
                    alert('Error: ' + data.error);
                }
            }
        } catch (error) {
            alert('Error connecting to server');
            console.error(error);
        } finally {
            loading.style.display = 'none';
        }
    });
}

// ============================================
// COPIAR
// ============================================
if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        const text = descriptionOutput.textContent;
        navigator.clipboard.writeText(text).then(() => {
            alert('Description copied!');
        });
    });
}

// ============================================
// CERRAR SESIÓN
// ============================================
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('user');
        registerSection.style.display = 'block';
        mainSection.style.display = 'none';
        
        // Limpiar campos
        if (loginEmail) loginEmail.value = '';
        if (loginPassword) loginPassword.value = '';
        if (registerEmail) registerEmail.value = '';
        if (registerPassword) registerPassword.value = '';
        if (registerName) registerName.value = '';
        if (productDetails) productDetails.value = '';
        if (outputSection) outputSection.style.display = 'none';
        if (seoSection) seoSection.style.display = 'none';
        if (historyList) historyList.innerHTML = '';
        if (verificationPending) verificationPending.style.display = 'none';
        
        // También cerrar sesión en el backend (Google)
        fetch(`${API_URL}/logout`, { credentials: 'include' }).catch(console.error);
    });
}

// ============================================
// CARGAR HISTORIAL
// ============================================
async function loadHistory() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_URL}/my-descriptions/${currentUser.id}`);
        const data = await response.json();

        if (data.success) {
            displayHistory(data.descriptions);
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function displayHistory(descriptions) {
    if (!historyList) return;
    
    if (!descriptions || descriptions.length === 0) {
        historyList.innerHTML = '<p>No descriptions yet. Generate your first one!</p>';
        return;
    }

    let html = '';
    descriptions.slice(0, 5).forEach(desc => {
        const date = new Date(desc.created_at).toLocaleDateString();
        html += `
            <div class="history-item">
                <div class="history-product">📝 ${desc.product_details.substring(0, 50)}...</div>
                <div class="history-description">${desc.generated_description.substring(0, 100)}...</div>
                <div class="history-date">${date}</div>
            </div>
        `;
    });

    historyList.innerHTML = html;
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function showMainSection() {
    if (!registerSection || !mainSection) return;
    
    registerSection.style.display = 'none';
    mainSection.style.display = 'block';
    updateUserInfo();
    
    // Mostrar aviso de verificación si es necesario
    if (verificationPending) {
        if (currentUser && !currentUser.is_verified) {
            verificationPending.style.display = 'block';
            verificationPending.dataset.email = currentUser.email;
        } else {
            verificationPending.style.display = 'none';
        }
    }
    
    if (currentUser.plan !== 'free') {
        if (upgradeSection) upgradeSection.style.display = 'none';
    } else {
        if (upgradeSection) upgradeSection.style.display = 'block';
    }
}

function updateUserInfo() {
    if (currentUser && userEmail && userPlan) {
        userEmail.textContent = currentUser.email;
        userPlan.textContent = currentUser.plan === 'free' ? 'Free Plan' : 
                               currentUser.plan === 'pro' ? 'Pro Plan' : 'Business Plan';
    }
}

function updateUsageInfo(remaining) {
    if (!currentUser) return;
    
    const limits = { free: 5, pro: 50, business: 1000 };
    const limit = limits[currentUser.plan] || 5;
    const used = limit - remaining;
    
    if (usageCount) usageCount.textContent = used;
    if (usageLimit) usageLimit.textContent = limit;
    
    if (progressFill) {
        const percentage = (used / limit) * 100;
        progressFill.style.width = Math.min(percentage, 100) + '%';
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================
checkUrlParams();

const savedUser = localStorage.getItem('user');
if (savedUser) {
    try {
        currentUser = JSON.parse(savedUser);
        showMainSection();
        loadHistory();
    } catch (e) {
        console.error('Error parsing saved user:', e);
        localStorage.removeItem('user');
    }
}
