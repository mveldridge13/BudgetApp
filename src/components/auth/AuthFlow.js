/* eslint-disable no-unused-vars */
// src/components/auth/AuthFlow.js
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../../styles/colors';

const {width} = Dimensions.get('window');

const AuthFlow = ({onAuthComplete, authManager}) => {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0); // 0: Welcome, 1: Login, 2: Register, 3: Verification
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [loginForm, setLoginForm] = useState({email: '', password: ''});
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [verificationForm, setVerificationForm] = useState({
    email: '',
    code: '',
  });

  const slides = [
    {
      type: 'welcome',
      title: 'Welcome to Trend',
      subtitle: 'Your smart expense companion',
      description:
        'Track your spending, know your daily budget, and stay financially confident.',
      icon: 'trending-up',
      iconColor: colors.primary,
    },
    {
      type: 'login',
      title: 'Welcome Back',
      subtitle: 'Sign in to your account',
      description: 'Continue managing your finances with Trend',
      icon: 'log-in',
      iconColor: '#4CAF50',
    },
    {
      type: 'register',
      title: 'Join Trend',
      subtitle: 'Create your account',
      description: 'Start your journey to better financial habits',
      icon: 'user-plus',
      iconColor: '#2196F3',
    },
    {
      type: 'verification',
      title: 'Verify Your Email',
      subtitle: 'Check your inbox',
      description: 'Enter the verification code we sent to your email',
      icon: 'mail',
      iconColor: '#FF9800',
    },
  ];

  const handleLogin = async () => {
    if (!authManager) {
      Alert.alert('Error', 'Authentication not initialized');
      return;
    }

    if (!loginForm.email || !loginForm.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await authManager.login({
        email: loginForm.email,
        password: loginForm.password,
      });
      onAuthComplete();
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!authManager) {
      Alert.alert('Error', 'Authentication not initialized');
      return;
    }

    if (
      !registerForm.email ||
      !registerForm.password ||
      !registerForm.displayName
    ) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (registerForm.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    try {
      await authManager.register({
        email: registerForm.email,
        password: registerForm.password,
        displayName: registerForm.displayName,
      });

      setVerificationForm({...verificationForm, email: registerForm.email});
      setCurrentStep(3); // Go to verification
      Alert.alert('Success', 'Please check your email for a verification code');
    } catch (error) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!authManager) {
      Alert.alert('Error', 'Authentication not initialized');
      return;
    }

    if (!verificationForm.code) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      await authManager.confirmRegistration(
        verificationForm.email,
        verificationForm.code,
      );
      Alert.alert('Success', 'Email verified! You can now sign in.', [
        {text: 'OK', onPress: () => setCurrentStep(1)},
      ]);
    } catch (error) {
      Alert.alert('Verification Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!authManager) {
      Alert.alert('Error', 'Authentication not initialized');
      return;
    }

    setIsLoading(true);
    try {
      await authManager.resendConfirmationCode(verificationForm.email);
      Alert.alert('Success', 'Verification code resent to your email');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    setLoginForm({email: '', password: ''});
    setCurrentStep(1);
  };

  const goToRegister = () => {
    setRegisterForm({
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
    });
    setCurrentStep(2);
  };

  const goBack = () => {
    setLoginForm({email: '', password: ''});
    setRegisterForm({
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
    });
    setVerificationForm({email: '', code: ''});
    setCurrentStep(0);
  };

  const handleGoogleSignIn = async () => {
    if (!authManager) {
      Alert.alert('Error', 'Authentication not initialized');
      return;
    }

    setIsLoading(true);
    try {
      await authManager.federatedSignIn({provider: 'Google'});
      onAuthComplete();
    } catch (error) {
      Alert.alert('Google Sign In Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderWelcomeSlide = slide => (
    <View style={styles.slideContent}>
      <View
        style={[
          styles.illustrationContainer,
          {backgroundColor: slide.iconColor + '20'},
        ]}>
        <Icon name={slide.icon} size={48} color={slide.iconColor} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      <View style={styles.authButtonsContainer}>
        <TouchableOpacity
          style={[styles.googleButton, isLoading && styles.disabledButton]}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
          activeOpacity={0.8}>
          {isLoading ? (
            <ActivityIndicator color="#3c4043" />
          ) : (
            <>
              <View style={styles.googleIcon}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={goToLogin}
          activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Sign In with Email</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={goToRegister}
          activeOpacity={0.8}>
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLoginSlide = slide => (
    <View style={styles.slideContent}>
      <TouchableOpacity style={styles.backButton} onPress={goBack}>
        <Icon name="arrow-left" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.formOnlyContainer}>
        <View
          style={[
            styles.smallIllustrationContainer,
            {backgroundColor: slide.iconColor + '20'},
          ]}>
          <Icon name={slide.icon} size={32} color={slide.iconColor} />
        </View>

        <View style={styles.compactTextContainer}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Icon
              name="mail"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              value={loginForm.email}
              onChangeText={text => setLoginForm({...loginForm, email: text})}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon
              name="lock"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              value={loginForm.password}
              onChangeText={text =>
                setLoginForm({...loginForm, password: text})
              }
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}>
            {isLoading ? (
              <ActivityIndicator color={colors.textWhite} />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={goToRegister} style={styles.linkButton}>
            <Text style={styles.linkText}>
              Don't have an account? Create one
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderRegisterSlide = slide => (
    <View style={styles.slideContent}>
      <TouchableOpacity style={styles.backButton} onPress={goBack}>
        <Icon name="arrow-left" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.formOnlyContainer}>
        <View
          style={[
            styles.smallIllustrationContainer,
            {backgroundColor: slide.iconColor + '20'},
          ]}>
          <Icon name={slide.icon} size={32} color={slide.iconColor} />
        </View>

        <View style={styles.compactTextContainer}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Icon
              name="user"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Full Name"
              placeholderTextColor={colors.textSecondary}
              value={registerForm.displayName}
              onChangeText={text =>
                setRegisterForm({...registerForm, displayName: text})
              }
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon
              name="mail"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              value={registerForm.email}
              onChangeText={text =>
                setRegisterForm({...registerForm, email: text})
              }
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon
              name="lock"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Password (8+ characters)"
              placeholderTextColor={colors.textSecondary}
              value={registerForm.password}
              onChangeText={text =>
                setRegisterForm({...registerForm, password: text})
              }
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon
              name="lock"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Confirm Password"
              placeholderTextColor={colors.textSecondary}
              value={registerForm.confirmPassword}
              onChangeText={text =>
                setRegisterForm({...registerForm, confirmPassword: text})
              }
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}>
            {isLoading ? (
              <ActivityIndicator color={colors.textWhite} />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={goToLogin} style={styles.linkButton}>
            <Text style={styles.linkText}>
              Already have an account? Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderVerificationSlide = slide => (
    <View style={styles.slideContent}>
      <View
        style={[
          styles.illustrationContainer,
          {backgroundColor: slide.iconColor + '20'},
        ]}>
        <Icon name={slide.icon} size={48} color={slide.iconColor} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
        <Text style={styles.description}>
          We sent a verification code to {verificationForm.email}
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Icon
            name="hash"
            size={20}
            color={colors.textSecondary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.textInput}
            placeholder="Verification Code"
            placeholderTextColor={colors.textSecondary}
            value={verificationForm.code}
            onChangeText={text =>
              setVerificationForm({...verificationForm, code: text})
            }
            keyboardType="numeric"
            editable={!isLoading}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.disabledButton]}
          onPress={handleVerification}
          disabled={isLoading}
          activeOpacity={0.8}>
          {isLoading ? (
            <ActivityIndicator color={colors.textWhite} />
          ) : (
            <Text style={styles.primaryButtonText}>Verify Email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResendCode} style={styles.linkButton}>
          <Text style={styles.linkText}>Didn't receive code? Resend</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSlide = (slide, index) => {
    switch (slide.type) {
      case 'welcome':
        return renderWelcomeSlide(slide);
      case 'login':
        return renderLoginSlide(slide);
      case 'register':
        return renderRegisterSlide(slide);
      case 'verification':
        return renderVerificationSlide(slide);
      default:
        return renderWelcomeSlide(slide);
    }
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.slide}>
        {renderSlide(slides[currentStep], currentStep)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slide: {
    flex: 1,
    width: width,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 32,
    padding: 8,
    zIndex: 10,
  },
  illustrationContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  smallIllustrationContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  compactTextContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  formOnlyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: width * 0.8,
  },
  authButtonsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    height: '100%',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '80%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textWhite,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '80%',
    marginBottom: 16,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dadce0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '80%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3c4043',
    fontFamily: 'Roboto',
  },
  googleIcon: {
    width: 18,
    height: 18,
    borderRadius: 2,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#EA4335',
    fontFamily: 'Product Sans',
  },
  buttonIcon: {
    marginRight: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default AuthFlow;
