const USER_API = "http://localhost:3000/users";

function getCurrentUserId() {
  const userId = localStorage.getItem('currentUserId') || 
                 sessionStorage.getItem('currentUserId') ||
                 localStorage.getItem('userId') ||
                 sessionStorage.getItem('userId');
  
  const userDataStr = localStorage.getItem('currentUser') || 
                      sessionStorage.getItem('currentUser') ||
                      localStorage.getItem('userData') ||
                      sessionStorage.getItem('userData');
  
  if (userDataStr) {
    try {
      const userData = JSON.parse(userDataStr);
      return userData.id || userData.userId;
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }
  
  return userId;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function formatPhone(phone) {
 
  if (phone.length === 10) {
    return `+91 ${phone.substring(0, 5)} ${phone.substring(5)}`;
  }
  return phone;
}

function showLoginRequired() {
 
  const loadingElements = document.querySelectorAll('.loading');
  loadingElements.forEach(el => {
    el.style.display = 'none';
  });
  
  const profileSection = document.querySelector('.profile-section');
  if (profileSection) {
   
    let errorDiv = profileSection.querySelector('.profile-error');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'profile-error';
      errorDiv.innerHTML = 'Please log in to view your profile';
      
     
      const profileStats = profileSection.querySelector('.profile-stats');
      if (profileStats) {
        profileStats.after(errorDiv);
      } else {
        profileSection.appendChild(errorDiv);
      }
    }
  }
 
  document.getElementById('profileName').textContent = 'User';
  document.getElementById('userEmail').textContent = 'Please log in';
  document.getElementById('userPhone').textContent = 'Please log in';
  document.getElementById('userId').textContent = 'N/A';
  document.getElementById('memberSince').textContent = 'N/A';
}

async function loadUserProfile() {
  try {
    const currentUserId = getCurrentUserId();
    
    if (!currentUserId) {
      console.log('No user logged in');
      showLoginRequired();
      return;
    }

    document.getElementById('profileName').textContent = 'Loading...';
    
    const response = await fetch(USER_API);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const users = await response.json();
    
    const currentUser = users.find(user => 
      user.id === currentUserId || 
      user.userId === currentUserId ||
      user.id === String(currentUserId) ||
      user.userId === String(currentUserId)
    );
    
    if (!currentUser) {
      throw new Error('User not found in database');
    }
    
    updateProfileUI(currentUser);
    
   
    const errorDiv = document.querySelector('.profile-error');
    if (errorDiv) {
      errorDiv.remove();
    }
    
  } catch (error) {
    console.error('Error loading user profile:', error);
    displayError('Failed to load profile information. Please try again.');
  }
}


function updateProfileUI(user) {
 
  const profileName = document.getElementById('profileName');
  if (profileName) {
    profileName.textContent = user.name;
    profileName.classList.remove('loading');
  }
  
  const userEmail = document.getElementById('userEmail');
  if (userEmail) {
    userEmail.textContent = user.email;
    userEmail.classList.remove('loading');
  }
  
  const userPhone = document.getElementById('userPhone');
  if (userPhone) {
    userPhone.textContent = formatPhone(user.phone);
    userPhone.classList.remove('loading');
  }
  

  const userId = document.getElementById('userId');
  if (userId) {
    userId.textContent = user.userId;
    userId.classList.remove('loading');
  }
  
  
  const memberSince = document.getElementById('memberSince');
  if (memberSince) {
    memberSince.textContent = formatDate(user.createdAt);
    memberSince.classList.remove('loading');
  }
  

  updateStats(user);
}


function updateStats(user) {
  
  document.getElementById('busesCount').textContent = '3';
  document.getElementById('reportsCount').textContent = '2';
  document.getElementById('reportsHandled').textContent = '2';
  document.getElementById('reportsResolved').textContent = '1';
  document.getElementById('reportsProgress').textContent = '1';
  document.getElementById('criticalAlerts').textContent = '0';
}


function displayError(message) {
  const profileSection = document.querySelector('.profile-section');
  
  if (profileSection) {
    let errorDiv = profileSection.querySelector('.profile-error');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'profile-error';
      profileSection.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadUserProfile();
});

window.refreshUserProfile = function() {
  loadUserProfile();
};