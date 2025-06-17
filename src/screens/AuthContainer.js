import React, {useState} from 'react';
import AuthFlow from './AuthFlow'; // Pure UI component
import AuthService from '../services/AuthService';

const AuthContainer = ({onAuthSuccess}) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const clearErrors = field => {
    if (field) {
      // Clear specific field error
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[field];
        return newErrors;
      });
    } else {
      // Clear all errors
      setErrors({});
    }
  };

  const validateLoginForm = (email, password) => {
    const formErrors = {};

    if (!email) {
      formErrors.email = 'Email is required';
    } else if (!AuthService.validateEmail(email)) {
      formErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      formErrors.password = 'Password is required';
    }

    return formErrors;
  };

  const validateRegistrationForm = userData => {
    const validation = AuthService.validateRegistration(userData);

    if (!validation.isValid) {
      // Convert validation errors to field-specific errors
      const fieldErrors = {};

      validation.errors.forEach(error => {
        if (error.includes('First name')) {
          fieldErrors.firstName = error;
        } else if (error.includes('Last name')) {
          fieldErrors.lastName = error;
        } else if (error.includes('email') || error.includes('Email')) {
          fieldErrors.email = error;
        } else if (error.includes('Password') && error.includes('match')) {
          fieldErrors.confirmPassword = error;
        } else if (error.includes('Password')) {
          fieldErrors.password = error;
        } else {
          // General errors
          fieldErrors.general = error;
        }
      });

      return fieldErrors;
    }

    return {};
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    setErrors({});

    // Client-side validation
    const formErrors = validateLoginForm(email, password);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      setLoading(false);
      return;
    }

    try {
      const result = await AuthService.login(email, password);

      if (result.success) {
        onAuthSuccess?.(result.user);
      } else {
        // Backend returned an error
        setErrors({general: result.error || 'Login failed'});
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({general: 'Network error. Please try again.'});
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async userData => {
    setLoading(true);
    setErrors({});

    // Client-side validation
    const formErrors = validateRegistrationForm(userData);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      setLoading(false);
      return;
    }

    try {
      const result = await AuthService.register(userData);

      if (result.success) {
        onAuthSuccess?.(result.user);
      } else {
        // Backend returned an error
        setErrors({general: result.error || 'Registration failed'});
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({general: 'Network error. Please try again.'});
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFlow
      onLogin={handleLogin}
      onRegister={handleRegister}
      loading={loading}
      errors={errors}
      clearErrors={clearErrors}
    />
  );
};

export default AuthContainer;
