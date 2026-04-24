document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("userLoginForm");
    const errorDiv = document.getElementById("errorMessage");
    const successDiv = document.getElementById("successMessage");

    loginForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const userId = document.getElementById("loginUserId").value.trim();
        const password = document.getElementById("loginPassword").value;

        errorDiv.style.display = "none";
        successDiv.style.display = "none";

        try {

            const response = await fetch("/api/user/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId, password })
            });

            const data = await response.json();

            if (!data.success) {
                errorDiv.innerText = "❌ " + data.message;
                errorDiv.style.display = "block";
                return;
            }

            // Save logged user
            localStorage.setItem("loggedUser", JSON.stringify(data.user));

            successDiv.innerText = "✅ Login successful! Redirecting...";
            successDiv.style.display = "block";

            setTimeout(() => {
                window.location.href = "/newdashboard";
            }, 1000);

        } catch (err) {

            console.error(err);
            errorDiv.innerText = "Server error. Check backend.";
            errorDiv.style.display = "block";

        }

    });

});