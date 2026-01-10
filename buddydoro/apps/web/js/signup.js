// Ensure the DOM is fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  const nameInput = document.getElementById('nameInput');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const confirmPasswordInput = document.getElementById('confirmPasswordInput');
  const passwordToggle = document.getElementById('passwordToggle');
  const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
  const signupError = document.getElementById('signupError');

  // Check if all required elements are present
  if (!signupForm || !nameInput || !emailInput || !passwordInput || !confirmPasswordInput || !signupError) {
    console.error('Sign-up script failed: One or more required elements are missing from the DOM.');
    return;
  }

  function showSignupError(message) {
    signupError.textContent = message;
    signupError.hidden = false;
  }

  // --- Password Visibility Toggle (for MAIN password) ---
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

  // --- Password Visibility Toggle (for CONFIRM password) ---
  if (confirmPasswordToggle) {
    confirmPasswordToggle.addEventListener('click', () => {
      const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      confirmPasswordInput.setAttribute('type', type);
      
      const icon = confirmPasswordToggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-eye', type === 'password');
        icon.classList.toggle('fa-eye-slash', type !== 'password');
      }
    });
  }

  // --- Email Validation Function ---
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Clear error as user types
  nameInput.addEventListener('input', () => signupError.hidden = true);
  emailInput.addEventListener('input', () => signupError.hidden = true);
  passwordInput.addEventListener('input', () => signupError.hidden = true);
  confirmPasswordInput.addEventListener('input', () => signupError.hidden = true);

  // --- Sign Up Form Submission Logic ---
  signupForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent default form submission

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    // --- Validation Checks ---
    if (!name || !email || !password || !confirmPassword) {
      showSignupError('Please fill out all fields.');
      return;
    }

    if (!validateEmail(email)) {
      showSignupError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      showSignupError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      showSignupError('Passwords do not match.');
      return;
    }

    // --- If all validation passes ---
    signupError.hidden = true;
    console.log('Sign-up successful! Redirecting to login page...');
    
    // Redirect to the login page
    window.location.href = 'login.html';
  });
});