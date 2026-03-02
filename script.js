// API URL - Detecta automáticamente si estamos en desarrollo o producción
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://product-ai-backend.onrender.com';

// ============================================
// DECLARACIÓN DE VARIABLES GLOBALES
// ============================================
let currentUser = null;

// Elementos DOM - Se asignarán después de que el DOM cargue
let registerSection, mainSection, loginTab, registerTab, loginForm, registerForm;
let loginEmail, loginPassword, registerEmail, registerPassword, registerName;
let userEmail, userPlan, generateBtn, productDetails, toneSelect, outputSection;
let descriptionOutput, loading, copyBtn, historyList, logoutBtn, usageCount;
let usageLimit, progressFill, upgradeSection, verificationMessage, verificationPending;
let resendVerificationBtn, seoSection, metaDescriptionSpan, suggestedKeywordsSpan;

// Elementos para recuperación de contraseña
let forgotPasswordLink, backToLoginLink, forgotSection, resetSection;
let forgotForm, resetForm, resetEmail, newPassword, confirmPassword;
let resetToken, forgotMessage, resetMessage;

// Elemento para selector de idioma
let languageSelect;

// ============================================
// FUNCIONES AUXILIARES
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

function showMainSection() {
    if (!registerSection || !mainSection) return;
    
    registerSection.style.display = 'none';
    mainSection.style.display = 'block';
    updateUserInfo();
    
    if (verificationPending) {
        if (currentUser && !currentUser.is_verified) {
            verificationPending.style.display = 'block';
            verificationPending.dataset.email = currentUser.email;
        } else {
            verificationPending.style.display = 'none';
        }
    }
    
    if (currentUser && currentUser.plan !== 'free') {
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

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    const googleUser = urlParams.get('googleUser');
    if (googleUser) {
        try {
            currentUser = JSON.parse(decodeURIComponent(googleUser));
            localStorage.setItem('user', JSON.stringify(currentUser));
            showMainSection();
            loadHistory();
            window.history.replaceState({}, document.title, '/');
        } catch (e) {
            console.error('Error parsing Google user:', e);
        }
    }
    
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

    const token = urlParams.get('token');
    if (token && resetToken) {
        resetToken.value = token;
        if (registerSection) registerSection.style.display = 'none';
        if (resetSection) resetSection.style.display = 'block';
    }
}

// ============================================
// FUNCIÓN DE RECUPERACIÓN
// ============================================
function checkResetToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        console.log('✅ Token de recuperación detectado');
        
        if (registerSection) {
            registerSection.style.display = 'none';
        }
        
        const oldResetSection = document.getElementById('reset-password-section');
        if (oldResetSection) {
            oldResetSection.remove();
        }
        
        const newResetSection = document.createElement('div');
        newResetSection.id = 'reset-password-section';
        newResetSection.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 500px !important;
            max-width: 90% !important;
            background: white !important;
            padding: 40px !important;
            border-radius: 10px !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
            z-index: 999999 !important;
            border: 5px solid #667eea !important;
            font-family: Arial, sans-serif !important;
        `;
        
        newResetSection.innerHTML = `
            <h2 style="color: #333; text-align: center; margin-bottom: 30px; font-size: 24px;">
                Establecer nueva contraseña
            </h2>
            <form id="reset-password-form">
                <input type="password" id="new-password" placeholder="Nueva contraseña" required 
                       style="width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px;">
                <input type="password" id="confirm-password" placeholder="Confirmar contraseña" required 
                       style="width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px;">
                <input type="hidden" id="reset-token" value="${token}">
                <button type="submit" 
                        style="width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 20px;">
                    Actualizar contraseña
                </button>
            </form>
            <div id="reset-message" class="message" style="display: none; margin-top: 15px; padding: 10px; border-radius: 5px; text-align: center;"></div>
        `;
        
        document.body.appendChild(newResetSection);
        
        resetSection = newResetSection;
        resetForm = document.getElementById('reset-password-form');
        newPassword = document.getElementById('new-password');
        confirmPassword = document.getElementById('confirm-password');
        resetToken = document.getElementById('reset-token');
        resetMessage = document.getElementById('reset-message');
        
        if (resetForm) {
            resetForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const token = resetToken.value;
                const password = newPassword.value;
                const confirm = confirmPassword.value;

                if (password !== confirm) {
                    resetMessage.className = 'message error';
                    resetMessage.textContent = 'Las contraseñas no coinciden';
                    resetMessage.style.cssText = 'display: block; margin-top: 15px; padding: 10px; border-radius: 5px; text-align: center; background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;';
                    return;
                }

                resetMessage.style.display = 'none';
                
                try {
                    const response = await fetch(`${API_URL}/update-password`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token, newPassword: password })
                    });

                    const data = await response.json();

                    if (data.success) {
                        resetMessage.className = 'message success';
                        resetMessage.textContent = data.message;
                        resetMessage.style.cssText = 'display: block; margin-top: 15px; padding: 10px; border-radius: 5px; text-align: center; background: #d4edda; color: #155724; border: 1px solid #c3e6cb;';
                        
                        newPassword.value = '';
                        confirmPassword.value = '';
                        
                        setTimeout(() => {
                            newResetSection.remove();
                            if (registerSection) {
                                registerSection.style.display = 'block';
                            }
                            window.history.replaceState({}, document.title, '/');
                        }, 3000);
                    } else {
                        resetMessage.className = 'message error';
                        resetMessage.textContent = data.error || 'Error al actualizar la contraseña';
                        resetMessage.style.cssText = 'display: block; margin-top: 15px; padding: 10px; border-radius: 5px; text-align: center; background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;';
                    }
                } catch (error) {
                    resetMessage.className = 'message error';
                    resetMessage.textContent = 'Error al conectar con el servidor';
                    resetMessage.style.cssText = 'display: block; margin-top: 15px; padding: 10px; border-radius: 5px; text-align: center; background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;';
                    console.error(error);
                }
            });
        }
        
        newResetSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ============================================
// FUNCIONES DE HISTORIAL (MODIFICADAS)
// ============================================

// 🔹 NUEVA: Cargar historial desde localStorage
function loadHistoryFromLocalStorage() {
    if (!currentUser) return;
    
    console.log('📁 Cargando historial desde localStorage');
    
    try {
        // Crear clave única para este usuario
        const storageKey = `history_${currentUser.id}`;
        
        // Obtener historial guardado
        const savedHistory = localStorage.getItem(storageKey);
        
        // Convertir de JSON a objeto (o array vacío si no hay)
        const descriptions = savedHistory ? JSON.parse(savedHistory) : [];
        
        console.log(`📊 Encontradas ${descriptions.length} descripciones guardadas`);
        
        // Mostrar el historial
        displayHistory(descriptions);
        
        // Actualizar contador basado en localStorage
        const limits = { free: 5, pro: 50, business: 1000 };
        const limit = limits[currentUser.plan] || 5;
        const used = descriptions.length;
        updateUsageInfo(limit - used);
        
    } catch (error) {
        console.error('Error cargando historial local:', error);
        if (historyList) {
            historyList.innerHTML = '<p>No descriptions yet. Generate your first one!</p>';
        }
    }
}

// 🔹 NUEVA: Guardar una descripción en localStorage
function saveDescriptionToLocalStorage(description) {
    if (!currentUser) return;
    
    try {
        const storageKey = `history_${currentUser.id}`;
        const existing = localStorage.getItem(storageKey);
        const history = existing ? JSON.parse(existing) : [];
        
        // Añadir nueva descripción al principio
        history.unshift(description);
        
        // Limitar a 50 descripciones máximo
        if (history.length > 50) history.pop();
        
        // Guardar en localStorage
        localStorage.setItem(storageKey, JSON.stringify(history));
        
        console.log('💾 Descripción guardada localmente');
        
        // Actualizar vista
        displayHistory(history);
        
        // Actualizar contador
        const limits = { free: 5, pro: 50, business: 1000 };
        const limit = limits[currentUser.plan] || 5;
        updateUsageInfo(limit - history.length);
        
    } catch (error) {
        console.error('Error guardando descripción:', error);
    }
}

// 🔹 MODIFICADA: loadHistory con soporte para localStorage
async function loadHistory() {
    if (!currentUser) return;

    try {
        console.log('🌐 Intentando cargar historial del backend...');
        const response = await fetch(`${API_URL}/my-descriptions/${currentUser.id}`);
        
        // Verificar si la respuesta es JSON
        const contentType = response.headers.get('content-type');
        
        if (!contentType || !contentType.includes('application/json')) {
            console.log('⚠️ Backend no devolvió JSON, usando localStorage');
            // Usar respaldo local
            loadHistoryFromLocalStorage();
            return;
        }

        // Si llegamos aquí, sí es JSON
        const data = await response.json();

        if (data.success) {
            console.log('✅ Historial cargado del backend');
            displayHistory(data.descriptions);
            
            // También guardar copia en localStorage
            const storageKey = `history_${currentUser.id}`;
            localStorage.setItem(storageKey, JSON.stringify(data.descriptions));
        }
    } catch (error) {
        console.error('Error cargando historial del backend:', error);
        // Si hay error, usar localStorage
        loadHistoryFromLocalStorage();
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
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    
    // Asignar elementos DOM
    registerSection = document.getElementById('register-section');
    mainSection = document.getElementById('main-section');
    loginTab = document.getElementById('login-tab');
    registerTab = document.getElementById('register-tab');
    loginForm = document.getElementById('login-form');
    registerForm = document.getElementById('register-form');
    loginEmail = document.getElementById('login-email');
    loginPassword = document.getElementById('login-password');
    registerEmail = document.getElementById('register-email');
    registerPassword = document.getElementById('register-password');
    registerName = document.getElementById('register-name');
    userEmail = document.getElementById('user-email');
    userPlan = document.getElementById('user-plan');
    generateBtn = document.getElementById('generate-btn');
    productDetails = document.getElementById('product-details');
    toneSelect = document.getElementById('tone');
    outputSection = document.getElementById('output-section');
    descriptionOutput = document.getElementById('description-output');
    loading = document.getElementById('loading');
    copyBtn = document.getElementById('copy-btn');
    historyList = document.getElementById('history-list');
    logoutBtn = document.getElementById('logout-btn');
    usageCount = document.getElementById('usage-count');
    usageLimit = document.getElementById('usage-limit');
    progressFill = document.getElementById('progress-fill');
    upgradeSection = document.getElementById('upgrade-section');
    verificationMessage = document.getElementById('verification-message');
    verificationPending = document.getElementById('verification-pending');
    resendVerificationBtn = document.getElementById('resend-verification-btn');
    seoSection = document.getElementById('seo-section');
    metaDescriptionSpan = document.getElementById('meta-description');
    suggestedKeywordsSpan = document.getElementById('suggested-keywords');

    // Elementos de recuperación de contraseña
    forgotPasswordLink = document.getElementById('forgot-password-link');
    backToLoginLink = document.getElementById('back-to-login-link');
    forgotSection = document.getElementById('forgot-password-section');
    resetSection = document.getElementById('reset-password-section');
    forgotForm = document.getElementById('forgot-password-form');
    resetForm = document.getElementById('reset-password-form');
    resetEmail = document.getElementById('reset-email');
    newPassword = document.getElementById('new-password');
    confirmPassword = document.getElementById('confirm-password');
    resetToken = document.getElementById('reset-token');
    forgotMessage = document.getElementById('forgot-message');
    resetMessage = document.getElementById('reset-message');

    // Selector de idioma
    languageSelect = document.getElementById('language');

    // Verificar parámetros de URL
    checkUrlParams();
    checkResetToken();

    // Cargar usuario guardado
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showMainSection();
            loadHistory(); // Ahora usa la versión mejorada
        } catch (e) {
            console.error('Error parsing saved user:', e);
            localStorage.removeItem('user');
        }
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    // Pestañas de autenticación
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

    // Login
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
                    loadHistory(); // Usa la versión mejorada
                } else {
                    if (data.needs_verification) {
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

    // Registro
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
                    loginTab.click();
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

    // Reenviar verificación
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

    // Generar descripción (MODIFICADO para guardar en localStorage)
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

            const selectedLanguage = languageSelect ? languageSelect.value : 'en';
            console.log('Idioma seleccionado:', selectedLanguage);

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
                        language: selectedLanguage,
                        include_seo: true
                    })
                });

                const data = await response.json();

                if (data.success) {
                    descriptionOutput.textContent = data.description;
                    outputSection.style.display = 'block';
                    
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
                    
                    // 🔹 NUEVO: Guardar en localStorage
                    const newDescription = {
                        product_details: details,
                        generated_description: data.description,
                        created_at: new Date().toISOString()
                    };
                    saveDescriptionToLocalStorage(newDescription);
                    
                    // Intentar cargar del backend (fallback a localStorage)
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

    // Copiar
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const text = descriptionOutput.textContent;
            navigator.clipboard.writeText(text).then(() => {
                alert('Description copied!');
            });
        });
    }

    // Cerrar sesión (MODIFICADO para limpiar localStorage del historial)
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Guardar el ID antes de borrar currentUser
            const userId = currentUser?.id;
            
            currentUser = null;
            localStorage.removeItem('user');
            
            // Opcional: NO borrar el historial localStorage para mantenerlo al next login
            // Si quieres borrarlo, descomenta esta línea:
            // if (userId) localStorage.removeItem(`history_${userId}`);
            
            registerSection.style.display = 'block';
            mainSection.style.display = 'none';
            
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
            
            fetch(`${API_URL}/logout`, { credentials: 'include' }).catch(console.error);
        });
    }

    // ============================================
    // EVENTOS DE RECUPERACIÓN DE CONTRASEÑA
    // ============================================
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            registerSection.style.display = 'block';
            registerSection.style.visibility = 'visible';
            registerSection.style.opacity = '1';
            registerSection.style.height = 'auto';
            registerSection.style.maxHeight = 'none';
            
            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) registerForm.style.display = 'none';
            
            forgotSection.style.display = 'block';
            forgotSection.style.visibility = 'visible';
            forgotSection.style.opacity = '1';
            
            forgotSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            console.log('✅ Sección de recuperación activada');
        });
    }

    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            forgotSection.style.display = 'none';
            
            if (loginForm) loginForm.style.display = 'block';
            if (registerForm) registerForm.style.display = 'none';
            
            if (loginTab) {
                loginTab.classList.add('active');
                if (registerTab) registerTab.classList.remove('active');
            }
            
            forgotMessage.style.display = 'none';
            
            console.log('✅ Volver a login');
        });
    }

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = resetEmail.value;

            forgotMessage.style.display = 'none';
            
            try {
                const response = await fetch(`${API_URL}/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                forgotMessage.className = 'message ' + (data.success ? 'success' : 'error');
                forgotMessage.textContent = data.message || data.error;
                forgotMessage.style.display = 'block';

                if (data.success) {
                    resetEmail.value = '';
                }
            } catch (error) {
                forgotMessage.className = 'message error';
                forgotMessage.textContent = 'Error al conectar con el servidor';
                forgotMessage.style.display = 'block';
            }
        });
    }

}); // ← FINAL DE DOMContentLoaded
