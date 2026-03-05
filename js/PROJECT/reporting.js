const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const toggleIcon = document.querySelector('.toggle-icon');

const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
  body.classList.add('dark-mode');
  if (toggleIcon) toggleIcon.textContent = '☀';
}

if (themeToggle) {
  themeToggle.addEventListener('click', function() {
    body.classList.toggle('dark-mode');

    if (body.classList.contains('dark-mode')) {
      if (toggleIcon) toggleIcon.textContent = '☀';
      localStorage.setItem('theme', 'dark');
    } else {
      if (toggleIcon) toggleIcon.textContent = '🌙';
      localStorage.setItem('theme', 'light');
    }

    if (toggleIcon) {
      toggleIcon.style.transform = 'rotate(360deg)';
      setTimeout(() => {
        toggleIcon.style.transform = 'rotate(0deg)';
      }, 300);
    }
  });
}

document.querySelector('.emergency-btn')?.addEventListener('click', function() {
    document.getElementById('confirmModal').style.display = 'block';
  });

  function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
  }

  function sendEmergencyAlert() {
    closeConfirmModal();

    document.getElementById('successModal').style.display = 'block';
  }

  function closeSuccessModal() {
    document.getElementById('successModal').style.display = 'none';
  }

  window.addEventListener('click', function(event) {
    const confirmModal = document.getElementById('confirmModal');
    const successModal = document.getElementById('successModal');
    
    if (event.target === confirmModal) {
      closeConfirmModal();
    }
    if (event.target === successModal) {
      closeSuccessModal();
    }
  });

let selectedReportType = null;

const reportOptions = document.querySelectorAll('.report-option');
reportOptions.forEach(function(option) {
  option.addEventListener('click', function() {

    reportOptions.forEach(function(opt) {
      opt.classList.remove('selected');
    });

    this.classList.add('selected');

    selectedReportType = this.querySelector('h3').textContent;
    
    console.log('Selected Report Type:', selectedReportType);
  });
});

function validateBusNumber(busNumber) { 
  const pattern = /^[A-Z]{2}-\d{2}-[A-Z]{1,2}-\d{4}$/;
  return pattern.test(busNumber);
}

const busNumberInput = document.getElementById('busNumber');
const busNumberError = document.getElementById('busNumberError');

busNumberInput.addEventListener('input', function() {
  const value = this.value.trim().toUpperCase();
  this.value = value;

  if (value === '') {
    busNumberInput.classList.remove('invalid', 'valid');
    busNumberError.classList.remove('show');
    busNumberError.textContent = '';
    return;
  }

  if (validateBusNumber(value)) {
    busNumberInput.classList.remove('invalid');
    busNumberInput.classList.add('valid');
    busNumberError.classList.remove('show');
    busNumberError.textContent = '';
  } else {
    busNumberInput.classList.remove('valid');
    busNumberInput.classList.add('invalid');
    busNumberError.classList.add('show');
    busNumberError.textContent = 'Invalid format!';
  }
});

document.querySelector('form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  if (!selectedReportType) {
    showMessage('Please select a report type first!', 'error');
    return;
  }

  const busNumber = document.getElementById('busNumber').value;
  if (!validateBusNumber(busNumber)) {
    showMessage('Please enter a valid bus number format', 'error');
    busNumberInput.focus();
    return;
  }

  const formData = {
    reportType: selectedReportType,
    busNumber: busNumber,
    location: document.querySelectorAll('input[type="text"]')[0].value,
    date: document.querySelector('input[type="date"]').value,
    time: document.querySelector('input[type="time"]').value,
    description: document.querySelector('textarea').value,
    severity: document.querySelector('input[name="severity"]:checked')?.id || 'Not specified',
    rating: document.querySelector('input[name="rating"]:checked')?.value || 'Not rated',
  };

  if (!formData.busNumber || !formData.location || 
      !formData.date || !formData.time || !formData.description) {
    showMessage('Please fill all required fields!', 'error');
    return;
  }
  try {
    const response = await fetch('http://localhost:3000/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    console.log('Report saved:', data);
    showMessage('✓ Report submitted successfully!', 'success');

    document.querySelector('form').reset();
    selectedReportType = null;
    document.querySelectorAll('.report-option').forEach(opt => opt.classList.remove('selected'));

    await loadReports();
  } catch (error) {
    console.error('Error:', error);
    showMessage('Failed to submit report. Please try again.', 'error');
  }
});

function showMessage(text, type) {
  const existingMessage = document.querySelector('.form-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = 'form-message ' + type;
  messageDiv.innerText = text;

  const submitBtn = document.querySelector('.submit-btn');
  submitBtn.parentNode.insertBefore(messageDiv, submitBtn.nextSibling);

  setTimeout(function() {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  },8000);
}

function saveToLocalStorage(data) {
  let reports = JSON.parse(localStorage.getItem('busReports')) || [];

  reports.push(data);

  localStorage.setItem('busReports', JSON.stringify(reports));
  
  console.log('Total reports saved:', reports.length);
}

const severityRadios = document.querySelectorAll('input[name="severity"]');

severityRadios.forEach(function(radio) {
  radio.addEventListener('change', function() {
    const selectedSeverity = this.id;
    const formSection = document.querySelector('.form-section');

    formSection.classList.remove('severity-low', 'severity-medium', 'severity-high');

  });
});

async function loadReports() {
  try {
    const response = await fetch('http://localhost:3000/reports');
    const reports = await response.json();
    displayReports(reports);
  } catch (error) {
    console.error('Error loading reports:', error);
  }
}

function displayReports(reports) {
  const container = document.getElementById('reportsContainer');
  if (!container) return;
  
  if (reports.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">No reports yet.</p>';
    return;
  }
  
  container.innerHTML = reports.map(report => `
    <div class="report-card">
      <div class="report-header">
        <span class="report-type">${report.reportType}</span>
        <span class="report-severity severity-${report.severity}">${report.severity}</span>
      </div>
      <div class="report-body">
        <p><strong>Bus:</strong> ${report.busNumber}</p>
        <p><strong>Location:</strong> ${report.location}</p>
        <p><strong>Date:</strong> ${report.date} at ${report.time}</p>
        <p><strong>Description:</strong> ${report.description}</p>
        <p><strong>Rating:</strong> ${report.rating}/5</p>
      </div>
      <button class="delete-btn" data-id="${report.id}">Delete</button>
    </div>
  `).join('');
}

async function deleteReport(id) {
  if (!confirm('Are you sure you want to delete this report?')) return;
  try {
    await fetch(`http://localhost:3000/reports/${id}`, { method: 'DELETE' });
    showMessage('✓ Report deleted successfully!', 'success');
    await loadReports();
  } catch (error) {
    console.error('Error:', error);
    showMessage('Failed to delete report.', 'error');
  }
}


document.addEventListener('click', function(e) {
  if (e.target.classList.contains('delete-btn')) {
    const reportId = e.target.getAttribute('data-id');
    deleteReport(reportId);
  }
});

window.addEventListener('DOMContentLoaded', loadReports);