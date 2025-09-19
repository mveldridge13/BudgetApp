import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Animated,
  Keyboard,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';

const {width: screenWidth} = Dimensions.get('window');

const AmountEntryOverlay = ({
  visible,
  onClose,
  onBack,
  onSave,
  amount,
  onAmountChange,
  description,
  selectedCategory,
  selectedSubcategory,
  getCategoryById,
  selectedDate,
  selectedTransactionType,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const keyboardAnim = useRef(new Animated.Value(0)).current;
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
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
      }, 100);
    } else {
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
      keyboardAnim.setValue(0);
    }
  }, [visible, slideAnim, fadeAnim, keyboardAnim]);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      event => {
        const keyboardHeight = event.endCoordinates.height;
        Animated.timing(keyboardAnim, {
          toValue: -keyboardHeight + 50,
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

  if (!visible) {
    return null;
  }

  const categoryData = getCategoryById(selectedCategory);
  const subcategoryData = selectedSubcategory
    ? categoryData?.subcategories?.find(sub => sub.id === selectedSubcategory)
    : null;

  const formatDate = date => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isSameDay = (date1, date2) => {
      return date1.toDateString() === date2.toDateString();
    };

    if (isSameDay(date, today)) {
      return 'Today';
    } else if (isSameDay(date, yesterday)) {
      return 'Yesterday';
    } else if (isSameDay(date, tomorrow)) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  const getCategoryIconStyle = color => {
    return {
      ...styles.categoryIcon,
      backgroundColor: `${color}26`,
    };
  };

  const isValidAmount = amount && parseFloat(amount) > 0;

  const handleSave = () => {
    if (isValidAmount) {
      onSave();
    }
  };

  return (
    <Animated.View style={[styles.overlayContainer, {opacity: fadeAnim}]}>
      <TouchableOpacity
        style={styles.backdrop}
        onPress={onClose}
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack || onClose}
            activeOpacity={0.7}>
            <Icon name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Transaction</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Transaction Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <View style={getCategoryIconStyle(categoryData?.color)}>
                <Icon
                  name={
                    subcategoryData?.icon ||
                    categoryData?.icon ||
                    'albums-outline'
                  }
                  size={20}
                  color={categoryData?.color || colors.textSecondary}
                />
              </View>
              <View style={styles.summaryTextContainer}>
                <Text style={styles.categoryText}>
                  {subcategoryData?.name || categoryData?.name || 'Category'}
                </Text>
                {description ? (
                  <Text style={styles.descriptionText}>{description}</Text>
                ) : null}
              </View>
            </View>
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>
            {selectedTransactionType === 'INCOME'
              ? 'Income Amount'
              : 'Expense Amount'}
          </Text>
          <View
            style={[
              styles.amountInputContainer,
              isAmountFocused && styles.amountInputFocused,
            ]}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={onAmountChange}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              onFocus={() => setIsAmountFocused(true)}
              onBlur={() => setIsAmountFocused(false)}
              autoFocus={true}
            />
          </View>
        </View>

        {/* Add Transaction Button */}
        <TouchableOpacity
          style={[styles.addButton, !isValidAmount && styles.addButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.7}
          disabled={!isValidAmount}>
          <Icon
            name="add-circle"
            size={20}
            color={isValidAmount ? colors.textWhite : colors.textSecondary}
          />
          <Text
            style={[
              styles.addButtonText,
              !isValidAmount && styles.addButtonTextDisabled,
            ]}>
            Add Transaction
          </Text>
        </TouchableOpacity>
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
    paddingTop: 24,
    paddingBottom: 60,
    paddingHorizontal: 24,
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
  backButton: {
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
  placeholder: {
    width: 32,
  },
  summaryContainer: {
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryTextContainer: {
    flex: 1,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  descriptionText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginTop: 2,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  amountContainer: {
    marginBottom: 32,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  amountInputFocused: {
    borderColor: colors.primary,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
    padding: 0,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  addButtonDisabled: {
    backgroundColor: colors.overlayLight,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textWhite,
    marginLeft: 8,
  },
  addButtonTextDisabled: {
    color: colors.textSecondary,
  },
});

export default AmountEntryOverlay;
