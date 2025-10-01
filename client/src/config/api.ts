// API Configuration for different environments
const getApiBaseUrl = (): string => {
  // For production (Vercel deployment), use the environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // For development, use local proxy
  if (import.meta.env.DEV) {
    return '';  // Use relative URLs which will be proxied by Vite
  }
  
  // Fallback to production URL
  return 'https://aiestimagent-api.onrender.com';
};

const getMlBaseUrl = (): string => {
  // For production (Vercel deployment), use the environment variable
  if (import.meta.env.VITE_ML_URL) {
    return import.meta.env.VITE_ML_URL;
  }
  
  // For development, use local ML server
  if (import.meta.env.DEV) {
    return 'http://127.0.0.1:8000';
  }
  
  // Fallback to production URL
  return 'https://aiestimagent.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();
export const ML_BASE_URL = getMlBaseUrl();

// Helper function to create full API URLs
export const createApiUrl = (endpoint: string): string => {
  // If endpoint already starts with http, return as is
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  
  // If we're in development and using proxy, return relative URL
  if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
    return endpoint;
  }
  
  // Otherwise, prepend the base URL
  return `${API_BASE_URL}${endpoint}`;
};

// Helper function to create full ML URLs
export const createMlUrl = (endpoint: string): string => {
  // If endpoint already starts with http, return as is
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  
  return `${ML_BASE_URL}${endpoint}`;
};
