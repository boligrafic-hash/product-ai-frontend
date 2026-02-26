// ============================================
// RECUPERACIÓN DE CONTRASEÑA
// ============================================

// Elementos DOM
const forgotPasswordLink = document.getElementById('forgot-password-link');
const backToLoginLink = document.getElementById('back-to-login-link');
const forgotSection = document.getElementById('forgot-password-section');
const resetSection = document.getElementById('reset-password-section');
const forgotForm = document.getElementById('forgot-password-form');
const resetForm = document.getElementById('reset-password-form');
const resetEmail = document.getElementById('reset-email');
const newPassword = document.getElementById('new-password');
const confirmPassword = document.getElementById('confirm-password');
const resetToken = document.getElementById('reset-token');
const forgotMessage = document.getElementById('forgot-message');
const resetMessage = document.getElementById('reset-message');

// Mostrar sección de recuperación
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerSection.style.display = 'none';
        forgotSection.style.display = 'block';
    });
}

// Volver al login desde recuperación
if (backToLoginLink) {
    backToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        forgotSection.style.display = 'none';
        registerSection.style.display = 'block';
        forgotMessage.style.display = 'none';
    });
}

// Enviar solicitud de recuperación
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

// Verificar token en URL (para reset)
function checkResetToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        resetToken.value = token;
        registerSection.style.display = 'none';
        resetSection.style.display = 'block';
    }
}

// Enviar nueva contraseña
if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = resetToken.value;
        const password = newPassword.value;
        const confirm = confirmPassword.value;

        if (password !== confirm) {
            resetMessage.className = 'message error';
            resetMessage.textContent = 'Las contraseñas no coinciden';
            resetMessage.style.display = 'block';
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

            resetMessage.className = 'message ' + (data.success ? 'success' : 'error');
            resetMessage.textContent = data.message || data.error;
            resetMessage.style.display = 'block';

            if (data.success) {
                // Limpiar campos y redirigir al login después de 3 segundos
                newPassword.value = '';
                confirmPassword.value = '';
                setTimeout(() => {
                    resetSection.style.display = 'none';
                    registerSection.style.display = 'block';
                    // Limpiar token de la URL
                    window.history.replaceState({}, document.title, '/');
                }, 3000);
            }
        } catch (error) {
            resetMessage.className = 'message error';
            resetMessage.textContent = 'Error al conectar con el servidor';
            resetMessage.style.display = 'block';
        }
    });
}

// Modificar la inicialización para incluir checkResetToken
// Busca la parte donde se llama a checkUrlParams() y agrega:
// checkResetToken();

// Por lo tanto, reemplaza:
// checkUrlParams();
// Por:
checkUrlParams();
checkResetToken();
