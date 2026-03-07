const API_URL = "http://localhost:3000/users";

// --- Alert Helpers ---
function showError(msg) {
  const err = document.getElementById('errorMessage');
  if (err) { err.textContent = msg; err.classList.add('show'); }
  else alert(msg);
}

function showSuccess(msg) {
  const succ = document.getElementById('successMessage');
  if (succ) { succ.textContent = msg; succ.classList.add('show'); }
  else alert(msg);
}

// --- API Logic ---
async function getUsers() {
  try {
    const response = await fetch(API_URL);
    return await response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
}

// --- Integrated Login Handler ---
document.getElementById('userLoginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  // Use stopImmediatePropagation to prevent auth.js from conflicting
  e.stopImmediatePropagation();

  const userId = document.getElementById('loginUserId').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  console.log("Attempting login for ID:", userId);

  try {
    // 1. Send data to the backend /login endpoint
    const response = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password })
    });

    const data = await response.json();

    if (data.success) {
      console.log("Login Success:", data.user.name);

      // 2. Store in localStorage so the Dashboard can see it
      localStorage.setItem('currentUser', JSON.stringify(data.user));

      // 3. Show the success message you were missing
      showSuccess('✅ Login successful! Redirecting...');

      // 4. Wait 1.5 seconds so the user can actually read the message
      setTimeout(() => {
        window.location.href = 'newdashboard.html';
      }, 1500);

    } else {
      console.error("Login failed:", data.message);
      showError(data.message || 'Invalid User ID or Password');
    }
  } catch (error) {
    console.error("Network error:", error);
    showError('🌐 Server offline. Please run "node server.js"');
  }
});
// --- Registration Handler ---
document.getElementById('userRegisterForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const userId = "USR" + Math.floor(1000 + Math.random() * 9000);
  const newUser = {
    userId: userId,
    name: document.getElementById('registerName').value,
    email: document.getElementById('registerEmail').value,
    phone: document.getElementById('registerPhone').value,
    password: document.getElementById('registerPassword').value,
    createdAt: new Date().toISOString()
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });

    if (response.ok) {
      showSuccess('Registration Successful! Your ID is: ' + userId);
      // If you have a modal function, call it here
      if (typeof showUserIdModal === "function") showUserIdModal(userId);
    } else {
      showError('Email already registered.');
    }
  } catch (err) {
    showError('Server error during registration.');
  }
});