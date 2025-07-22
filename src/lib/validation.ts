import DOMPurify from 'dompurify';

// Input sanitization utilities
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // Remove HTML tags and sanitize content
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [] 
  }).trim();
};

// Validate and sanitize text with length limits
export const validateText = (text: string, maxLength: number = 500): { 
  isValid: boolean; 
  sanitized: string; 
  error?: string; 
} => {
  if (!text) {
    return { isValid: false, sanitized: '', error: 'This field is required' };
  }
  
  const sanitized = sanitizeInput(text);
  
  if (sanitized.length === 0) {
    return { isValid: false, sanitized: '', error: 'Invalid content detected' };
  }
  
  if (sanitized.length > maxLength) {
    return { 
      isValid: false, 
      sanitized, 
      error: `Text must be ${maxLength} characters or less` 
    };
  }
  
  return { isValid: true, sanitized };
};

// Validate email format
export const validateEmail = (email: string): { 
  isValid: boolean; 
  sanitized: string; 
  error?: string; 
} => {
  const sanitized = sanitizeInput(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    return { isValid: false, sanitized, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true, sanitized };
};

// Validate password strength
export const validatePassword = (password: string): { 
  isValid: boolean; 
  error?: string; 
} => {
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long' };
  }
  
  return { isValid: true };
};

// Rate limiting helper (client-side)
const rateLimitMap = new Map<string, number[]>();

export const checkRateLimit = (key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const attempts = rateLimitMap.get(key) || [];
  
  // Remove attempts outside the time window
  const validAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
  
  if (validAttempts.length >= maxAttempts) {
    return false; // Rate limit exceeded
  }
  
  // Add current attempt
  validAttempts.push(now);
  rateLimitMap.set(key, validAttempts);
  
  return true; // Within rate limit
};