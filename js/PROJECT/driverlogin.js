const API_URL = "http://localhost:3000/drivers";

function generateDriverId() {
    const prefix = 'DRV';
    const number = Math.floor(1000 + Math.random() * 9000);
    return prefix + number;
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    successDiv.classList.remove('show');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');

    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.classList.remove('show');
    successDiv.textContent = message;
    successDiv.classList.add('show');

    setTimeout(() => {
        successDiv.classList.remove('show');
    }, 5000);
}

// Form Validation Functions
function isValidName(name) {
    const nameRegex = /^[A-Za-z]+\s+[A-Za-z]+$/;
    return nameRegex.test(name.trim());
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isAllowedEmailDomain(email) {
    const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    return allowedDomains.includes(domain);
}

function isValidPhone(phone) {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

function isValidLicense(license) {
    return license.length >= 6 && /^[A-Z0-9]+$/i.test(license);
}

// Password Strength Functions
function checkPasswordStrength(password) {
    let strength = 0;
    const feedback = [];

    if (password.length >= 8) {
        strength += 1;
    } else {
        feedback.push('At least 8 characters');
    }

    if (password.length >= 12) {
        strength += 1;
    }

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
        strength += 1;
    } else {
        feedback.push('Upper & lowercase letters');
    }

    if (/[0-9]/.test(password)) {
        strength += 1;
    } else {
        feedback.push('Numbers');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
        strength += 1;
    } else {
        feedback.push('Special characters');
    }

    return { strength, feedback };
}

function updatePasswordStrength(password) {
    const strengthBar = document.getElementById('passwordStrengthBar');
    const strengthText = document.getElementById('passwordStrengthText');
    const strengthFeedback = document.getElementById('passwordStrengthFeedback');

    if (!password) {
        strengthBar.style.width = '0%';
        strengthBar.className = 'strength-bar';
        strengthText.textContent = '';
        strengthFeedback.textContent = '';
        return;
    }

    const { strength, feedback } = checkPasswordStrength(password);
    const percentage = (strength / 5) * 100;

    strengthBar.style.width = percentage + '%';
    strengthBar.className = 'strength-bar';

    if (strength <= 2) {
        strengthBar.classList.add('weak');
        strengthText.textContent = 'Weak';
        strengthText.style.color = '#ff4444';
    } else if (strength <= 3) {
        strengthBar.classList.add('medium');
        strengthText.textContent = 'Medium';
        strengthText.style.color = '#ffa500';
    } else {
        strengthBar.classList.add('strong');
        strengthText.textContent = 'Strong';
        strengthText.style.color = '#00C851';
    }

    if (feedback.length > 0) {
        strengthFeedback.textContent = 'Add: ' + feedback.join(', ');
    } else {
        strengthFeedback.textContent = 'Excellent password!';
    }
}

// Modal Functions
function showDriverIdModal(driverId) {
    const modal = document.getElementById('driverIdModal');
    const driverIdDisplay = document.getElementById('driverIdDisplay');
    driverIdDisplay.textContent = driverId;
    modal.style.display = 'flex';
}

function closeDriverIdModal() {
    const modal = document.getElementById('driverIdModal');
    modal.style.display = 'none';
}

function copyDriverId() {
    const driverId = document.getElementById('driverIdDisplay').textContent;
    navigator.clipboard.writeText(driverId).then(() => {
        const copyBtn = document.querySelector('.copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    });
}

// Forgot Password Functions
function showForgotPassword() {
    document.getElementById('driverLoginForm').classList.add('hidden');
    document.getElementById('forgotPasswordForm').classList.remove('hidden');
    document.getElementById('headerTitle').textContent = 'Reset Password';
    document.getElementById('headerSubtitle').textContent = 'Enter your email to reset password';
}

function showLoginFromForgot() {
    document.getElementById('forgotPasswordForm').classList.add('hidden');
    document.getElementById('driverLoginForm').classList.remove('hidden');
    document.getElementById('headerTitle').textContent = 'Driver Login';
    document.getElementById('headerSubtitle').textContent = 'Access your driver dashboard';
}

async function getDrivers() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch drivers');
        }
        const drivers = await response.json();
        return drivers;
    } catch (error) {
        console.error('Error fetching drivers:', error);
        showError('Unable to connect to server');
        return [];
    }
}

async function updateDriver(driverId, updatedData) {
    try {
        const response = await fetch(`${API_URL}/${driverId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            throw new Error('Failed to update driver');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating driver:', error);
        return null;
    }
}

async function addDriver(driverData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(driverData)
        });

        if (!response.ok) {
            throw new Error('Failed to add driver');
        }

        const newDriver = await response.json();
        return newDriver;
    } catch (error) {
        console.error('Error adding driver:', error);
        showError('Failed to create account. Please try again.');
        return null;
    }
}

// Event Listeners
document.getElementById('showRegister').addEventListener('click', function () {
    document.getElementById('driverLoginForm').classList.add('hidden');
    document.getElementById('driverRegisterForm').classList.remove('hidden');
    document.getElementById('headerTitle').textContent = 'Create Driver Account';
    document.getElementById('headerSubtitle').textContent = 'Register as a new driver';
});

document.getElementById('showLogin').addEventListener('click', function () {
    document.getElementById('driverRegisterForm').classList.add('hidden');
    document.getElementById('forgotPasswordForm').classList.add('hidden');
    document.getElementById('driverLoginForm').classList.remove('hidden');
    document.getElementById('headerTitle').textContent = 'Driver Login';
    document.getElementById('headerSubtitle').textContent = 'Access your driver dashboard';
});

document.getElementById('showForgotPassword').addEventListener('click', showForgotPassword);
document.getElementById('backToLogin').addEventListener('click', showLoginFromForgot);

// Password strength indicator
document.getElementById('registerPassword').addEventListener('input', function (e) {
    updatePasswordStrength(e.target.value);
});

// Real-time validation feedback
document.getElementById('registerName').addEventListener('blur', function (e) {
    if (e.target.value && !isValidName(e.target.value)) {
        e.target.classList.add('invalid');
        showError('Please enter full name (First and Last name with only letters)');
    } else {
        e.target.classList.remove('invalid');
    }
});

document.getElementById('registerEmail').addEventListener('blur', function (e) {
    if (e.target.value && !isValidEmail(e.target.value)) {
        e.target.classList.add('invalid');
        showError('Please enter a valid email address');
    } else if (e.target.value && !isAllowedEmailDomain(e.target.value)) {
        e.target.classList.add('invalid');
        showError('Please use an email from Gmail, Yahoo, or Outlook');
    } else {
        e.target.classList.remove('invalid');
    }
});

document.getElementById('registerPhone').addEventListener('blur', function (e) {
    if (e.target.value && !isValidPhone(e.target.value)) {
        e.target.classList.add('invalid');
        showError('Please enter a valid 10-digit phone number');
    } else {
        e.target.classList.remove('invalid');
    }
});

document.getElementById('registerConfirmPassword').addEventListener('input', function (e) {
    const password = document.getElementById('registerPassword').value;
    if (e.target.value && e.target.value !== password) {
        e.target.classList.add('invalid');
    } else {
        e.target.classList.remove('invalid');
    }
});

// Login Form
document.getElementById('driverLoginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const driverId = document.getElementById('loginDriverId').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!driverId || !password) {
        showError('Please enter both Driver ID and password');
        return;
    }

    try {
        const drivers = await getDrivers();
        const driver = drivers.find(d => d.driverId === driverId && d.password === password);

        if (driver) {
            sessionStorage.setItem('currentDriver', JSON.stringify(driver));
            showSuccess('Login successful! Redirecting...');
            setTimeout(() => {
                window.location.href = 'driverdashboard.html';
            }, 1500);
        } else {
            showError('Invalid driver ID or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed. Please try again.');
    }
});

// Registration Form
document.getElementById('driverRegisterForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const license = document.getElementById('registerLicense').value.trim();
    const busId = document.getElementById('registerBusId').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    // Validation
    if (!isValidName(name)) {
        showError('Please enter full name (First and Last name with only letters)');
        return;
    }
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }
    if (!isAllowedEmailDomain(email)) {
        showError('Please use an email from Gmail, Yahoo, or Outlook');
        return;
    }
    if (!isValidPhone(phone)) {
        showError('Please enter a valid 10-digit phone number');
        return;
    }
    if (!isValidLicense(license)) {
        showError('Please enter a valid license number (at least 6 alphanumeric characters)');
        return;
    }
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }

    const { strength } = checkPasswordStrength(password);
    if (strength < 2) {
        showError('Please choose a stronger password');
        return;
    }

    try {
        const drivers = await getDrivers();
        
        if (drivers.some(d => d.email === email)) {
            showError('Email already registered');
            return;
        }

        if (drivers.some(d => d.license === license)) {
            showError('License number already registered');
            return;
        }

        const driverId = generateDriverId();

        const newDriver = {
            driverId: driverId,
            name: name,
            email: email,
            phone: phone,
            license: license,
            busId: busId,
            password: password,
            createdAt: new Date().toISOString()
        };

        const addedDriver = await addDriver(newDriver);

        if (addedDriver) {
            showSuccess('Account created successfully!');
            document.getElementById('driverRegisterForm').reset();
            updatePasswordStrength('');
            
            // Show modal with driver ID
            showDriverIdModal(driverId);
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('Registration failed. Please try again.');
    }
});

// Forgot Password Form
document.getElementById('forgotPasswordForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('forgotEmail').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        showError('Passwords do not match');
        return;
    }

    if (newPassword.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }

    const { strength } = checkPasswordStrength(newPassword);
    if (strength < 2) {
        showError('Please choose a stronger password');
        return;
    }

    try {
        const drivers = await getDrivers();
        const driver = drivers.find(d => d.email === email);

        if (!driver) {
            showError('No account found with this email address');
            return;
        }

        const updated = await updateDriver(driver.id, { password: newPassword });

        if (updated) {
            showSuccess('Password reset successful! You can now login.');
            document.getElementById('forgotPasswordForm').reset();
            setTimeout(() => {
                showLoginFromForgot();
                document.getElementById('loginDriverId').value = driver.driverId;
            }, 2000);
        } else {
            showError('Failed to reset password. Please try again.');
        }
    } catch (error) {
        console.error('Password reset error:', error);
        showError('Password reset failed. Please try again.');
    }
});