import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Animated,
  Platform,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';

const {width: screenWidth} = Dimensions.get('window');

const DebtPaymentOverlay = ({visible, onClose, onSave, onDueDatePress, selectedDueDate, skipEntryAnimation}) => {
  const [step, setStep] = useState(1); // Step 1: Name + Date, Step 2: Amounts
  const [debtName, setDebtName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  const slideAnim = useRef(new Animated.Value(skipEntryAnimation ? 0 : 300)).current;
  const fadeAnim = useRef(new Animated.Value(skipEntryAnimation ? 1 : 0)).current;
  const keyboardAnim = useRef(new Animated.Value(0)).current;
  const totalAmountInputRef = useRef(null);
  const wasCompleteRef = useRef(false);

  // Auto-advance to step 2 when debt name and due date are both provided
  useEffect(() => {
    if (!visible || step !== 1) {
      wasCompleteRef.current = false;
      return;
    }

    const isComplete = debtName.trim() && selectedDueDate;

    if (isComplete && !wasCompleteRef.current) {
      wasCompleteRef.current = true;
      // Brief delay for user to see their selection registered
      const timer = setTimeout(() => {
        setStep(2);
        setTimeout(() => {
          totalAmountInputRef.current?.focus();
        }, 100);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [visible, step, debtName, selectedDueDate]);

  useEffect(() => {
    if (visible) {
      if (skipEntryAnimation) {
        // Instant appearance
        slideAnim.setValue(0);
        fadeAnim.setValue(1);
      } else {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      slideAnim.setValue(skipEntryAnimation ? 0 : 300);
      fadeAnim.setValue(skipEntryAnimation ? 1 : 0);
      keyboardAnim.setValue(0);
      // Reset form
      setTimeout(() => {
        setStep(1);
        setDebtName('');
        setTotalAmount('');
        setPaymentAmount('');
        wasCompleteRef.current = false;
      }, 100);
    }
  }, [visible, slideAnim, fadeAnim, keyboardAnim, skipEntryAnimation]);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      event => {
        const height = event.endCoordinates.height;
        Animated.timing(keyboardAnim, {
          toValue: -height + 90, // Move up less - leave 90px gap
          duration: Platform.OS === 'ios' ? event.duration : 300,
          useNativeDriver: true,
        }).start();
      },
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      event => {
        Animated.timing(keyboardAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? event.duration : 300,
          useNativeDriver: true,
        }).start();
      },
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [keyboardAnim]);

  const handleClose = () => {
    // Instant transition back
    onClose();
  };

  if (!visible) {
    return null;
  }

  const handleSave = () => {
    if (!debtName.trim() || !totalAmount || parseFloat(totalAmount) <= 0) {
      return;
    }

    const debtData = {
      name: debtName.trim(),
      totalAmount: parseFloat(totalAmount),
      paymentAmount: paymentAmount ? parseFloat(paymentAmount) : 0,
      dueDate: selectedDueDate || null,
    };

    onSave(debtData);
  };

  const getDueDateDisplayText = () => {
    if (selectedDueDate) {
      return selectedDueDate.toLocaleDateString();
    }
    return 'Select Due Date';
  };

  const handleBack = () => {
    setStep(1);
    wasCompleteRef.current = false;
  };

  // Step 2: Can save if total amount is valid
  const canSave = totalAmount && parseFloat(totalAmount) > 0;

  return (
    <Animated.View style={[styles.overlayContainer, {opacity: fadeAnim}]}>
      <TouchableOpacity
        style={styles.backdrop}
        onPress={handleClose}
        activeOpacity={1}
      />

      <Animated.View
        style={[
          styles.overlayContent,
          {
            transform: [{translateY: slideAnim}, {translateY: keyboardAnim}],
          },
        ]}>
        <View style={styles.header}>
          {step === 2 ? (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Icon name="chevron-back" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
          <Text style={styles.title}>
            {step === 1 ? 'Debt Details' : 'Payment Amounts'}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {step === 1 ? (
            // Step 1: Debt Name + Due Date
            <>
              {/* Debt Name Field */}
              <View style={[styles.field, styles.inputField]}>
                <View style={styles.fieldLeft}>
                  <View style={[styles.iconContainer, {backgroundColor: '#FF6B8526'}]}>
                    <Icon
                      name="trending-down-outline"
                      size={20}
                      color="#FF6B85"
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={debtName}
                    onChangeText={setDebtName}
                    placeholder="Debt name (e.g., Credit Card)"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Due Date Field */}
              <TouchableOpacity
                style={[
                  styles.field,
                  styles.dueDateField,
                  !selectedDueDate && styles.fieldEmpty,
                ]}
                onPress={onDueDatePress}
                activeOpacity={0.7}>
                <View style={styles.fieldLeft}>
                  <View style={styles.iconContainer}>
                    <Icon
                      name="calendar-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.fieldText,
                      !selectedDueDate && styles.placeholderText,
                    ]}>
                    {getDueDateDisplayText()}
                  </Text>
                </View>
                <Icon
                  name="chevron-forward"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </>
          ) : (
            // Step 2: Total Amount + Payment Amount
            <>
              {/* Total Debt Amount Field */}
              <View style={[styles.field, styles.inputField]}>
                <View style={styles.fieldLeft}>
                  <View style={styles.iconContainer}>
                    <Icon
                      name="cash-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </View>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    ref={totalAmountInputRef}
                    style={[styles.input, styles.inputWithCurrency]}
                    value={totalAmount}
                    onChangeText={text => setTotalAmount(text.replace(/[^0-9.]/g, ''))}
                    placeholder="Total debt amount"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Payment Amount Field (Optional) */}
              <View style={[styles.field, styles.inputField]}>
                <View style={styles.fieldLeft}>
                  <View style={styles.iconContainer}>
                    <Icon
                      name="card-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </View>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={[styles.input, styles.inputWithCurrency]}
                    value={paymentAmount}
                    onChangeText={text => setPaymentAmount(text.replace(/[^0-9.]/g, ''))}
                    placeholder="Payment amount (optional)"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {step === 2 && (
          <TouchableOpacity
            style={[styles.saveButton, canSave && styles.saveButtonActive]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.7}>
            <Text style={[styles.saveButtonText, canSave && styles.saveButtonTextActive]}>
              Create Debt Goal
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  overlayContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 24,
    paddingBottom: 90,
    width: screenWidth,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconPlaceholder: {
    width: 32,
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  backButton: {
    padding: 4,
    width: 32,
    alignItems: 'center',
  },
  form: {
    marginBottom: 20,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fieldEmpty: {
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: colors.overlayLight,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginRight: 4,
  },
  input: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    flex: 1,
    padding: 0,
  },
  inputWithCurrency: {
    marginLeft: 0,
  },
  inputField: {
    backgroundColor: '#F5F5F5',
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  fieldText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  dueDateField: {
    // Specific styling for due date field if needed
  },
  saveButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonActive: {
    backgroundColor: '#FF6B85',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  saveButtonTextActive: {
    color: colors.textWhite,
  },
});

export default DebtPaymentOverlay;
