// Ensure the DOM is fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const passwordToggle = document.getElementById('passwordToggle');
  const loginError = document.getElementById('loginError');

  // Check if all required elements are present
  if (!loginForm || !emailInput || !passwordInput || !loginError) {
    console.error('Login script failed: One or more required elements are missing from the DOM.');
    return;
  }

  function showLoginError(message) {
    loginError.textContent = message;
    loginError.hidden = false;
  }

  // --- Password Visibility Toggle ---
  if (passwordToggle) {
    passwordToggle.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
      const icon = passwordToggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-eye', type === 'password');
        icon.classList.toggle('fa-eye-slash', type !== 'password');
      }
    });
  }

  // --- Email Validation Function ---
  function validateEmail(email) {
    // This is a simple regex for client-side validation.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // --- Event Listener for Email Input (real-time feedback) ---
  emailInput.addEventListener('blur', () => {
    const email = emailInput.value;
    if (email.trim() !== '' && !validateEmail(email)) {
      showLoginError('Please enter a valid email address.');
    } else {
      loginError.hidden = true;
    }
  });

  // Clear error as user types
  emailInput.addEventListener('input', () => {
    loginError.hidden = true;
  });
  passwordInput.addEventListener('input', () => {
    loginError.hidden = true;
  });

  // --- Login Form Submission Logic ---
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent default form submission

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Validation checks
    if (email === '' || password === '') {
      showLoginError('Please enter both your email and password.');
      return;
    }

    if (!validateEmail(email)) {
      showLoginError('Please enter a valid email address.');
      return;
    }

    // If all validation passes
    loginError.hidden = true;
    console.log('Login successful! Redirecting to main app...');
    window.location.href = 'index.html';

  });

  // --- Placeholder for other buttons ---
  document.querySelector('.sign-up-btn')?.addEventListener('click', () => {
    window.location.href = 'signup.html';
  });

  document.querySelector('.forgot-password')?.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Forgot Password? This would navigate to a password reset page.');
  });

  document.querySelector('.google-btn')?.addEventListener('click', () => {
    alert('Google Login clicked! This would initiate OAuth.');
  });

  document.querySelector('.facebook-btn')?.addEventListener('click', () => {
    alert('Facebook Login clicked! This would initiate OAuth.');
  });
});