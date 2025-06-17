import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles/colors';

const AuthFlow = ({onLogin, onRegister, loading, errors, clearErrors}) => {
  const insets = useSafeAreaInsets();
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login' or 'register'
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  // Registration form state
  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Animate screen transition
  const animateToScreen = screen => {
    const toValue = screen === 'register' ? -1 : 0;

    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setCurrentScreen(screen);
    clearErrors?.();
  };

  const handleLogin = () => {
    // Clear any previous errors
    clearErrors?.();

    // Call parent's login handler with form data
    onLogin?.(loginForm.email.trim(), loginForm.password);
  };

  const handleRegister = () => {
    // Clear any previous errors
    clearErrors?.();

    // Call parent's register handler with form data
    onRegister?.({
      firstName: registerForm.firstName.trim(),
      lastName: registerForm.lastName.trim(),
      email: registerForm.email.trim(),
      password: registerForm.password,
      confirmPassword: registerForm.confirmPassword,
    });
  };

  const handleInputChange = (form, field, value) => {
    if (form === 'login') {
      setLoginForm(prev => ({...prev, [field]: value}));
    } else {
      setRegisterForm(prev => ({...prev, [field]: value}));
    }

    // Clear field-specific errors when user starts typing
    if (errors?.[field]) {
      clearErrors?.(field);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.logoContainer}>
          <Icon name="trending-up" size={32} color={colors.primary} />
          <Text style={styles.logoText}>Trend</Text>
        </View>
        <Text style={styles.headerTitle}>
          {currentScreen === 'login' ? 'Welcome back' : 'Create account'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {currentScreen === 'login'
            ? 'Sign in to continue tracking your expenses'
            : 'Join Trend and take control of your finances'}
        </Text>
      </View>
    </View>
  );

  const renderLoginForm = () => (
    <View style={styles.formContainer}>
      {errors?.general && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{errors.general}</Text>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <View
          style={[styles.inputContainer, errors?.email && styles.inputError]}>
          <Icon name="mail" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.textInput}
            placeholder="Enter your email"
            placeholderTextColor={colors.textSecondary}
            value={loginForm.email}
            onChangeText={text => handleInputChange('login', 'email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>
        {errors?.email && <Text style={styles.fieldError}>{errors.email}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Password</Text>
        <View
          style={[
            styles.inputContainer,
            errors?.password && styles.inputError,
          ]}>
          <Icon name="lock" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.textInput}
            placeholder="Enter your password"
            placeholderTextColor={colors.textSecondary}
            value={loginForm.password}
            onChangeText={text => handleInputChange('login', 'password', text)}
            secureTextEntry
            editable={!loading}
          />
        </View>
        {errors?.password && (
          <Text style={styles.fieldError}>{errors.password}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.disabledButton]}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.8}>
        {loading ? (
          <ActivityIndicator color={colors.textWhite} />
        ) : (
          <Text style={styles.primaryButtonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <View style={styles.switchContainer}>
        <Text style={styles.switchText}>Don't have an account? </Text>
        <TouchableOpacity
          onPress={() => animateToScreen('register')}
          disabled={loading}>
          <Text style={[styles.switchLink, loading && styles.disabledText]}>
            Sign up
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRegisterForm = () => (
    <View style={styles.formContainer}>
      {errors?.general && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{errors.general}</Text>
        </View>
      )}

      <View style={styles.nameRow}>
        <View style={styles.firstNameInput}>
          <Text style={styles.inputLabel}>First Name</Text>
          <View
            style={[
              styles.inputContainer,
              errors?.firstName && styles.inputError,
            ]}>
            <Icon name="user" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.textInput}
              placeholder="First name"
              placeholderTextColor={colors.textSecondary}
              value={registerForm.firstName}
              onChangeText={text =>
                handleInputChange('register', 'firstName', text)
              }
              autoCapitalize="words"
              editable={!loading}
            />
          </View>
          {errors?.firstName && (
            <Text style={styles.fieldError}>{errors.firstName}</Text>
          )}
        </View>

        <View style={styles.lastNameInput}>
          <Text style={styles.inputLabel}>Last Name</Text>
          <View
            style={[
              styles.inputContainer,
              errors?.lastName && styles.inputError,
            ]}>
            <Icon name="user" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.textInput}
              placeholder="Last name"
              placeholderTextColor={colors.textSecondary}
              value={registerForm.lastName}
              onChangeText={text =>
                handleInputChange('register', 'lastName', text)
              }
              autoCapitalize="words"
              editable={!loading}
            />
          </View>
          {errors?.lastName && (
            <Text style={styles.fieldError}>{errors.lastName}</Text>
          )}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <View
          style={[styles.inputContainer, errors?.email && styles.inputError]}>
          <Icon name="mail" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.textInput}
            placeholder="Enter your email"
            placeholderTextColor={colors.textSecondary}
            value={registerForm.email}
            onChangeText={text => handleInputChange('register', 'email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>
        {errors?.email && <Text style={styles.fieldError}>{errors.email}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Password</Text>
        <View
          style={[
            styles.inputContainer,
            errors?.password && styles.inputError,
          ]}>
          <Icon name="lock" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.textInput}
            placeholder="Create a password"
            placeholderTextColor={colors.textSecondary}
            value={registerForm.password}
            onChangeText={text =>
              handleInputChange('register', 'password', text)
            }
            secureTextEntry
            editable={!loading}
          />
        </View>
        {errors?.password && (
          <Text style={styles.fieldError}>{errors.password}</Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Confirm Password</Text>
        <View
          style={[
            styles.inputContainer,
            errors?.confirmPassword && styles.inputError,
          ]}>
          <Icon name="lock" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.textInput}
            placeholder="Confirm your password"
            placeholderTextColor={colors.textSecondary}
            value={registerForm.confirmPassword}
            onChangeText={text =>
              handleInputChange('register', 'confirmPassword', text)
            }
            secureTextEntry
            editable={!loading}
          />
        </View>
        {errors?.confirmPassword && (
          <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.disabledButton]}
        onPress={handleRegister}
        disabled={loading}
        activeOpacity={0.8}>
        {loading ? (
          <ActivityIndicator color={colors.textWhite} />
        ) : (
          <Text style={styles.primaryButtonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      <View style={styles.switchContainer}>
        <Text style={styles.switchText}>Already have an account? </Text>
        <TouchableOpacity
          onPress={() => animateToScreen('login')}
          disabled={loading}>
          <Text style={[styles.switchLink, loading && styles.disabledText]}>
            Sign in
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <ScrollView
        style={[styles.scrollView, {paddingTop: insets.top}]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View style={styles.centeredContent}>
          {renderHeader()}

          <View style={styles.formsWrapper}>
            <Animated.View
              style={[
                styles.formsContainer,
                {
                  transform: [
                    {
                      translateX: slideAnim.interpolate({
                        inputRange: [-1, 0],
                        outputRange: [0, 0],
                      }),
                    },
                  ],
                  opacity: slideAnim.interpolate({
                    inputRange: [-1, 0],
                    outputRange: [1, 1],
                  }),
                },
              ]}>
              {currentScreen === 'login'
                ? renderLoginForm()
                : renderRegisterForm()}
            </Animated.View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  formsWrapper: {
    flex: 1,
    paddingHorizontal: 32,
  },
  formsContainer: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '10',
    borderColor: colors.error + '30',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginLeft: 8,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.error + '05',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  fieldError: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  firstNameInput: {
    flex: 1,
    marginRight: 8,
    marginBottom: 20,
  },
  lastNameInput: {
    flex: 1,
    marginLeft: 8,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  disabledText: {
    opacity: 0.5,
  },
});

export default AuthFlow;
