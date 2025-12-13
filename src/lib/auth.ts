/**
 * Authentication utilities
 * Simple localStorage-based auth system for personal use
 */

const AUTH_USER_KEY = 'auth_user';
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_LOGGED_IN_KEY = 'auth_logged_in';

/**
 * Generate a simple token (for localStorage-based auth)
 */
function generateToken(): string {
  return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Login with email and password
 * Returns success status and error message if failed
 */
export function login(email: string, password: string): { success: boolean; error?: string } {
  // Validate inputs
  if (!email || email.trim() === '') {
    return { success: false, error: 'El email es requerido' };
  }

  if (!isValidEmail(email)) {
    return { success: false, error: 'El email no es válido' };
  }

  if (!password || password.trim() === '') {
    return { success: false, error: 'La contraseña es requerida' };
  }

  // Check if user exists in localStorage
  const storedUsers = getStoredUsers();
  const user = storedUsers.find(u => u.email === email.trim().toLowerCase());

  if (!user) {
    return { success: false, error: 'Email o contraseña incorrectos' };
  }

  // Verify password (simple comparison for localStorage)
  if (user.password !== password) {
    return { success: false, error: 'Email o contraseña incorrectos' };
  }

  // Create session
  const token = generateToken();
  localStorage.setItem(AUTH_USER_KEY, email.trim().toLowerCase());
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_LOGGED_IN_KEY, 'true');

  return { success: true };
}

/**
 * Register a new user (first time setup)
 */
export function register(email: string, password: string): { success: boolean; error?: string } {
  // Validate inputs
  if (!email || email.trim() === '') {
    return { success: false, error: 'El email es requerido' };
  }

  if (!isValidEmail(email)) {
    return { success: false, error: 'El email no es válido' };
  }

  if (!password || password.trim() === '') {
    return { success: false, error: 'La contraseña es requerida' };
  }

  if (password.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  // Check if user already exists
  const storedUsers = getStoredUsers();
  const normalizedEmail = email.trim().toLowerCase();
  
  if (storedUsers.find(u => u.email === normalizedEmail)) {
    return { success: false, error: 'Este email ya está registrado' };
  }

  // Save new user
  storedUsers.push({
    email: normalizedEmail,
    password: password, // In a real app, this would be hashed
  });
  localStorage.setItem('auth_users', JSON.stringify(storedUsers));

  // Auto login after registration
  const token = generateToken();
  localStorage.setItem(AUTH_USER_KEY, normalizedEmail);
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_LOGGED_IN_KEY, 'true');

  return { success: true };
}

/**
 * Logout and clear session
 */
export function logout(): void {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_LOGGED_IN_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const loggedIn = localStorage.getItem(AUTH_LOGGED_IN_KEY);
  const user = localStorage.getItem(AUTH_USER_KEY);
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  return loggedIn === 'true' && !!user && !!token;
}

/**
 * Get current authenticated user email
 */
export function getCurrentUser(): string | null {
  if (!isAuthenticated()) {
    return null;
  }
  return localStorage.getItem(AUTH_USER_KEY);
}

/**
 * Get stored users from localStorage
 */
function getStoredUsers(): Array<{ email: string; password: string }> {
  try {
    const stored = localStorage.getItem('auth_users');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

