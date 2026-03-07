document.addEventListener('DOMContentLoaded', () => {
    // 1. Check if a user is actually logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!currentUser) {
        // No user found in storage? Send them back to login
        alert("Please login first to access the dashboard.");
        window.location.href = 'userlogin.html';
        return;
    }

    // 2. Update the Dashboard UI with User Data
    // Ensure you have an element with id="userName" in your HTML
    const userNameDisplay = document.getElementById('userName');
    const userIdDisplay = document.getElementById('userIdDisplay');

    if (userNameDisplay) {
        userNameDisplay.textContent = `Welcome, ${currentUser.name}`;
    }

    if (userIdDisplay) {
        userIdDisplay.textContent = currentUser.userId;
    }

    console.log("✅ Dashboard authenticated for:", currentUser.name);
});

// 3. Logout Function
function handleLogout() {
    localStorage.removeItem('currentUser'); // Clear the session
    window.location.href = 'userlogin.html'; // Redirect to login
}