document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('userLoginForm');
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');

    if (loginForm) {
        // Remove any other listeners that auth.js might have added to this specific form
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopImmediatePropagation(); // Stops auth.js from interfering with the login

            // Clear previous messages
            if (errorDiv) errorDiv.style.display = 'none';
            if (successDiv) successDiv.style.display = 'none';

            const userId = document.getElementById('loginUserId').value.trim();
            const password = document.getElementById('loginPassword').value;

            try {
                const response = await fetch('http://localhost:3000/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, password })
                });

                const data = await response.json();

                if (data.success) {
                    // 1. Show Success Message
                    if (successDiv) {
                        successDiv.textContent = "✅ Login successful! Redirecting...";
                        successDiv.style.display = 'block';
                        successDiv.style.color = 'green';
                    }

                    localStorage.setItem('currentUser', JSON.stringify(data.user));

                    // 2. Delay the redirect by 1.5 seconds so you can see the message
                    setTimeout(() => {
                        window.location.href = 'newdashboard.html';
                    }, 1500);

                } else {
                    // Show Invalid Message
                    if (errorDiv) {
                        errorDiv.textContent = "❌ " + data.message;
                        errorDiv.style.display = 'block';
                        errorDiv.style.color = 'red';
                    }
                }
            } catch (err) {
                if (errorDiv) {
                    errorDiv.textContent = "🌐 Server Error: Is node server.js running?";
                    errorDiv.style.display = 'block';
                }
            }
        });
    }
});