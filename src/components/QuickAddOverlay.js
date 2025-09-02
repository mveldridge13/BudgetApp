import React, {useEffect, useRef} from 'react';
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

const QuickAddOverlay = ({
  visible,
  onClose,
  onCategoryPress,
  onDatePress,
  selectedDate,
  description,
  onDescriptionChange,
  selectedCategory,
  getCategoryById,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current; // Start 300px below screen
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const keyboardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      // Delay the animation slightly to let main modal start animating
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
      }, 100); // 100ms delay
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
        const height = event.endCoordinates.height;
        Animated.timing(keyboardAnim, {
          toValue: -height + 50, // Move up by keyboard height minus 50px gap
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

  const getCategoryDisplayText = () => {
    if (selectedCategory) {
      const category = getCategoryById(selectedCategory);
      return category ? category.name : 'Select Category';
    }
    return 'Select Category';
  };

  const getCategoryIcon = () => {
    if (selectedCategory) {
      const category = getCategoryById(selectedCategory);
      return category ? category.icon : 'albums-outline';
    }
    return 'albums-outline';
  };

  const getCategoryColor = () => {
    if (selectedCategory) {
      const category = getCategoryById(selectedCategory);
      return category ? category.color : colors.textSecondary;
    }
    return colors.textSecondary;
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
            style={styles.dateIcon}
            onPress={onDatePress}
            activeOpacity={0.7}>
            <Icon name="calendar-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Quick Add</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {/* Description Field */}
          <View style={[styles.field, styles.descriptionField]}>
            <View style={styles.fieldLeft}>
              <View style={styles.iconContainer}>
                <Text style={styles.textIcon}>T</Text>
              </View>
              <TextInput
                style={styles.descriptionInput}
                value={description}
                onChangeText={onDescriptionChange}
                placeholder="Description (optional)"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          {/* Category Field */}
          <TouchableOpacity
            style={[
              styles.field,
              styles.categoryField,
              !selectedCategory && styles.categoryFieldEmpty,
            ]}
            onPress={onCategoryPress}
            activeOpacity={0.7}>
            <View style={styles.fieldLeft}>
              <View
                style={[
                  styles.iconContainer,
                  selectedCategory && {
                    backgroundColor: `${getCategoryColor()}26`,
                  },
                ]}>
                <Icon
                  name={getCategoryIcon()}
                  size={20}
                  color={getCategoryColor()}
                />
              </View>
              <Text
                style={[
                  styles.fieldText,
                  !selectedCategory && styles.placeholderText,
                ]}>
                {getCategoryDisplayText()}
              </Text>
            </View>
            <Icon
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={onClose}
          activeOpacity={0.7}>
          <Text style={styles.skipButtonText}>Use full form instead</Text>
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
    padding: 24,
    paddingBottom: 40,
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
  dateIcon: {
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
  fieldText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    flex: 1,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  descriptionInput: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    flex: 1,
    padding: 0,
  },
  textIcon: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  descriptionField: {
    backgroundColor: '#F5F5F5',
  },
  categoryField: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryFieldEmpty: {
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
});

export default QuickAddOverlay;
