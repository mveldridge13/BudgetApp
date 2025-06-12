/* eslint-disable no-unused-vars */
// components/AddGoalModal.js
import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';

const {width: screenWidth} = Dimensions.get('window');

const GOAL_TYPES = [
  {
    id: 'savings',
    label: 'Savings',
    icon: 'dollar-sign',
    description: 'Save money for future purchases',
  },
  {
    id: 'spending',
    label: 'Spending Budget',
    icon: 'credit-card',
    description: 'Track spending in categories',
  },
  {
    id: 'debt',
    label: 'Debt Payment',
    icon: 'trending-down',
    description: 'Pay off loans or credit cards',
  },
];

const CATEGORIES = [
  {id: 'Security', label: 'Emergency Fund', icon: 'shield'},
  {id: 'Debt', label: 'Debt Repayment', icon: 'credit-card'},
  {id: 'Food', label: 'Food', icon: 'coffee'},
  {id: 'Transport', label: 'Transport', icon: 'truck'},
  {id: 'Shopping', label: 'Shopping', icon: 'shopping-bag'},
  {id: 'Entertainment', label: 'Entertainment', icon: 'film'},
  {id: 'Bills', label: 'Bills', icon: 'file-text'},
  {id: 'Health', label: 'Health', icon: 'heart'},
  {id: 'Other', label: 'Other', icon: 'more-horizontal'},
];

const PRIORITIES = [
  {id: 'high', label: 'High', color: '#FF6B85'},
  {id: 'medium', label: 'Medium', color: '#FFB74D'},
  {id: 'low', label: 'Low', color: '#52C788'},
];

const AddGoalModal = ({
  visible,
  onClose,
  onSave,
  editingGoal,
  formatCurrency,
}) => {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
    title: '',
    type: 'savings',
    target: '',
    current: '0',
    originalAmount: '',
    deadline: '',
    category: 'Other',
    priority: 'medium',
    autoContribute: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Track modal visibility state for proper animation control
  const [modalVisible, setModalVisible] = useState(false);

  // Use useRef to persist animation value across renders
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Handle modal opening
  useEffect(() => {
    if (visible && !modalVisible) {
      setModalVisible(true);
      // Reset position before animating in
      slideAnim.setValue(screenWidth);
      fadeAnim.setValue(0);

      // Small delay to ensure modal is mounted before animating
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 50);
    }
  }, [visible, modalVisible, slideAnim, fadeAnim]);

  // Initialize form when editing or modal opens
  useEffect(() => {
    if (visible) {
      if (editingGoal) {
        // Editing existing goal
        setFormData({
          title: editingGoal.title || '',
          type: editingGoal.type || 'savings',
          target: editingGoal.target?.toString() || '',
          current: editingGoal.current?.toString() || '0',
          originalAmount: editingGoal.originalAmount?.toString() || '',
          deadline: editingGoal.deadline || '',
          category: editingGoal.categoryId || 'Other',
          priority: editingGoal.priority || 'medium',
          autoContribute: editingGoal.autoContribute?.toString() || '',
        });
      } else {
        // Creating new goal - reset form
        setFormData({
          title: '',
          type: 'savings',
          target: '',
          current: '0',
          originalAmount: '',
          deadline: '',
          category: 'Other',
          priority: 'medium',
          autoContribute: '',
        });
      }
      setErrors({});
      setSaving(false);
    }
  }, [editingGoal, visible]);

  const handleCloseModal = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenWidth,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After animation completes, hide modal and call onClose
      setModalVisible(false);
      onClose();
    });
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Goal title is required';
    }

    // Different validation logic for debt vs other goals
    if (formData.type === 'debt') {
      // For debt goals, validate originalAmount instead of target
      if (
        !formData.originalAmount ||
        parseFloat(formData.originalAmount) <= 0
      ) {
        newErrors.originalAmount = 'Original debt amount is required';
      }
      if (parseFloat(formData.current) > parseFloat(formData.originalAmount)) {
        newErrors.current = 'Current debt cannot exceed original amount';
      }
    } else {
      // For savings/spending goals, validate target
      if (!formData.target || parseFloat(formData.target) <= 0) {
        newErrors.target = 'Target amount must be greater than 0';
      }
    }

    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required';
    } else {
      // Better date comparison to avoid timezone issues
      const deadlineDate = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      deadlineDate.setHours(0, 0, 0, 0); // Reset time to start of day

      if (deadlineDate <= today) {
        newErrors.deadline = 'Deadline must be in the future';
      }
    }

    if (formData.autoContribute && parseFloat(formData.autoContribute) < 0) {
      newErrors.autoContribute = 'Auto-contribution cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const goalData = {
        title: formData.title.trim(),
        type: formData.type,
        target: formData.type === 'debt' ? 0 : parseFloat(formData.target),
        current: parseFloat(formData.current),
        originalAmount:
          formData.type === 'debt'
            ? parseFloat(formData.originalAmount)
            : undefined,
        deadline: formData.deadline,
        categoryId: formData.category,
        priority: formData.priority,
        autoContribute: formData.autoContribute
          ? parseFloat(formData.autoContribute)
          : 0,
        isActive: true,
      };

      let result;
      try {
        result = await onSave(goalData);
      } catch (error) {
        result = {
          success: false,
          error: error.message || 'Unknown error from parent component',
        };
      }

      // Handle the result
      if (result && result.success) {
        // If successful, close the modal with animation
        handleCloseModal();
      } else {
        const errorMessage =
          result?.error || 'Failed to save goal. Please try again.';
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDateForInput = dateString => {
    if (!dateString) {
      return '';
    }
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatDateForDisplay = dateString => {
    if (!dateString) {
      return 'Select deadline date';
    }
    const date = new Date(dateString);
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  };

  const getDaysInMonth = date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = date => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const today = new Date();
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day,
      );
      const isToday = date.toDateString() === today.toDateString();
      const isPast = date < today && !isToday;
      const isSelected =
        selectedDate && date.toDateString() === selectedDate.toDateString();

      days.push({
        day,
        date,
        isToday,
        isPast,
        isSelected,
      });
    }

    return days;
  };

  const navigateMonth = direction => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const handleDateSelect = dateObj => {
    if (dateObj.isPast) {
      return;
    }

    setSelectedDate(dateObj.date);
    // Ensure we're saving the date at the end of the selected day
    // eslint-disable-next-line no-shadow
    const selectedDate = new Date(dateObj.date);
    selectedDate.setHours(23, 59, 59, 999); // Set to end of day
    updateFormData('deadline', selectedDate.toISOString());
    setShowDateModal(false);
  };

  const openDateModal = () => {
    // Initialize selected date and current month
    if (formData.deadline) {
      const existingDate = new Date(formData.deadline);
      setSelectedDate(existingDate);
      setCurrentMonth(existingDate);
    } else {
      setSelectedDate(null);
      setCurrentMonth(new Date());
    }
    setShowDateModal(true);
  };

  const getSelectedGoalType = () => {
    return GOAL_TYPES.find(type => type.id === formData.type);
  };

  const getSelectedCategory = () => {
    return CATEGORIES.find(cat => cat.id === formData.category);
  };

  return (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="none"
      presentationStyle="overFullScreen"
      onRequestClose={handleCloseModal}>
      <Animated.View
        style={[
          styles.modalOverlayContainer,
          {
            opacity: fadeAnim,
          },
        ]}>
        <Animated.View
          style={[
            styles.animatedContainer,
            {
              transform: [{translateX: slideAnim}],
            },
          ]}>
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            {/* Header */}
            <View style={[styles.header, {paddingTop: insets.top + 20}]}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCloseModal}
                activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {editingGoal ? 'Edit Goal' : 'Add New Goal'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!formData.title || saving) && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                activeOpacity={0.7}
                disabled={!formData.title || saving}>
                <Text
                  style={[
                    styles.saveButtonText,
                    (!formData.title || saving) &&
                      styles.saveButtonTextDisabled,
                  ]}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {/* Goal Type Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Goal Type</Text>
                <View style={styles.typeGrid}>
                  {GOAL_TYPES.map(type => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeCard,
                        formData.type === type.id && styles.typeCardActive,
                      ]}
                      onPress={() => updateFormData('type', type.id)}
                      activeOpacity={0.7}>
                      <Icon
                        name={type.icon}
                        size={20}
                        color={
                          formData.type === type.id
                            ? colors.primary
                            : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.typeLabel,
                          formData.type === type.id && styles.typeLabelActive,
                        ]}>
                        {type.label}
                      </Text>
                      <Text style={styles.typeDescription}>
                        {type.description}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Goal Title */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Goal Title</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    errors.title && styles.textInputError,
                  ]}
                  value={formData.title}
                  onChangeText={text => updateFormData('title', text)}
                  placeholder="e.g., Emergency Fund"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={50}
                />
                {errors.title && (
                  <Text style={styles.errorText}>{errors.title}</Text>
                )}
              </View>

              {/* Target Amount */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {formData.type === 'debt'
                    ? 'Original Debt Amount'
                    : 'Target Amount'}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    (errors.target || errors.originalAmount) &&
                      styles.textInputError,
                  ]}
                  value={
                    formData.type === 'debt'
                      ? formData.originalAmount
                      : formData.target
                  }
                  onChangeText={text =>
                    updateFormData(
                      formData.type === 'debt' ? 'originalAmount' : 'target',
                      text.replace(/[^0-9.]/g, ''),
                    )
                  }
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
                {errors.target && (
                  <Text style={styles.errorText}>{errors.target}</Text>
                )}
                {errors.originalAmount && (
                  <Text style={styles.errorText}>{errors.originalAmount}</Text>
                )}
              </View>

              {/* Current Amount */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {formData.type === 'debt'
                    ? 'Current Debt Remaining'
                    : 'Current Amount'}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    errors.current && styles.textInputError,
                  ]}
                  value={formData.current}
                  onChangeText={text =>
                    updateFormData('current', text.replace(/[^0-9.]/g, ''))
                  }
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
                {errors.current && (
                  <Text style={styles.errorText}>{errors.current}</Text>
                )}
              </View>

              {/* Category */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Category</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}>
                  {CATEGORIES.map(category => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryCard,
                        formData.category === category.id &&
                          styles.categoryCardActive,
                      ]}
                      onPress={() => updateFormData('category', category.id)}
                      activeOpacity={0.7}>
                      <Icon
                        name={category.icon}
                        size={16}
                        color={
                          formData.category === category.id
                            ? colors.primary
                            : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.categoryLabel,
                          formData.category === category.id &&
                            styles.categoryLabelActive,
                        ]}>
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Deadline */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Target Deadline</Text>
                <TouchableOpacity
                  style={[
                    styles.dateInput,
                    errors.deadline && styles.textInputError,
                  ]}
                  onPress={openDateModal}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.dateInputText,
                      !formData.deadline && styles.dateInputPlaceholder,
                    ]}>
                    {formatDateForDisplay(formData.deadline)}
                  </Text>
                  <Icon
                    name="calendar"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                {errors.deadline && (
                  <Text style={styles.errorText}>{errors.deadline}</Text>
                )}
              </View>

              {/* Priority */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Priority</Text>
                <View style={styles.priorityGrid}>
                  {PRIORITIES.map(priority => (
                    <TouchableOpacity
                      key={priority.id}
                      style={[
                        styles.priorityCard,
                        formData.priority === priority.id
                          ? [
                              styles.priorityCardActive,
                              {backgroundColor: priority.color + '20'},
                            ]
                          : {
                              borderColor: priority.color + '40',
                            },
                      ]}
                      onPress={() => updateFormData('priority', priority.id)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.priorityLabel,
                          formData.priority === priority.id && [
                            styles.priorityLabelActive,
                            {color: priority.color},
                          ],
                        ]}>
                        {priority.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Auto Contribution */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {formData.type === 'debt'
                    ? 'Monthly Payment'
                    : 'Monthly Contribution'}{' '}
                  (Optional)
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    errors.autoContribute && styles.textInputError,
                  ]}
                  value={formData.autoContribute}
                  onChangeText={text =>
                    updateFormData(
                      'autoContribute',
                      text.replace(/[^0-9.]/g, ''),
                    )
                  }
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
                <Text style={styles.helperText}>
                  {formData.type === 'debt'
                    ? 'Set a recurring monthly payment amount'
                    : 'Set a recurring monthly contribution amount'}
                </Text>
                {errors.autoContribute && (
                  <Text style={styles.errorText}>{errors.autoContribute}</Text>
                )}
              </View>

              {/* Goal Summary */}
              <View style={styles.summarySection}>
                <Text style={styles.summaryTitle}>Goal Summary</Text>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Type:</Text>
                    <Text style={styles.summaryValue}>
                      {getSelectedGoalType()?.label}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Category:</Text>
                    <Text style={styles.summaryValue}>
                      {getSelectedCategory()?.label}
                    </Text>
                  </View>
                  {(formData.target || formData.originalAmount) && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        {formData.type === 'debt'
                          ? 'Original Amount:'
                          : 'Target:'}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {formatCurrency
                          ? formatCurrency(
                              parseFloat(
                                formData.type === 'debt'
                                  ? formData.originalAmount || '0'
                                  : formData.target || '0',
                              ) || 0,
                            )
                          : '$0'}
                      </Text>
                    </View>
                  )}
                  {formData.current && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        {formData.type === 'debt'
                          ? 'Remaining:'
                          : 'Starting Amount:'}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {formatCurrency
                          ? formatCurrency(parseFloat(formData.current) || 0)
                          : '$0'}
                      </Text>
                    </View>
                  )}
                  {formData.autoContribute && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Monthly:</Text>
                      <Text style={styles.summaryValue}>
                        {formatCurrency
                          ? formatCurrency(
                              parseFloat(formData.autoContribute) || 0,
                            )
                          : '$0'}
                      </Text>
                    </View>
                  )}
                  {formData.deadline && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Deadline:</Text>
                      <Text style={styles.summaryValue}>
                        {new Date(formData.deadline).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Bottom spacing for keyboard */}
              <View style={styles.bottomSpacing} />
            </ScrollView>

            {/* Calendar Modal */}
            <Modal
              visible={showDateModal}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowDateModal(false)}>
              <View style={styles.calendarModalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.calendarContainer}>
                    {/* Calendar Header */}
                    <View style={styles.calendarHeader}>
                      <TouchableOpacity
                        onPress={() => navigateMonth(-1)}
                        style={styles.navButton}>
                        <Text style={styles.navButtonText}>‹</Text>
                      </TouchableOpacity>

                      <View style={styles.monthYearContainer}>
                        <Text style={styles.calendarMonthText}>
                          {currentMonth.toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => navigateMonth(1)}
                        style={styles.navButton}>
                        <Text style={styles.navButtonText}>›</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Day labels */}
                    <View style={styles.dayLabelsContainer}>
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <Text key={index} style={styles.dayLabel}>
                          {day}
                        </Text>
                      ))}
                    </View>

                    {/* Calendar Grid */}
                    <View style={styles.calendarGrid}>
                      {generateCalendarDays().map((dayObj, index) => {
                        const isToday = dayObj?.isToday;
                        const isSelected = dayObj?.isSelected;
                        const isPast = dayObj?.isPast;

                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.dayCell,
                              !dayObj && styles.emptyDayCell,
                              isToday && styles.todayCell,
                              isSelected && styles.selectedCell,
                            ]}
                            disabled={!dayObj || isPast}
                            onPress={() => dayObj && handleDateSelect(dayObj)}>
                            {dayObj && (
                              <Text
                                style={[
                                  styles.dayText,
                                  isToday && styles.todayText,
                                  isSelected && styles.selectedText,
                                  isPast && styles.pastText,
                                ]}>
                                {dayObj.day}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Action buttons */}
                    <View style={styles.calendarActions}>
                      <TouchableOpacity
                        onPress={() => setShowDateModal(false)}
                        style={styles.calendarCancelButton}>
                        <Text style={styles.calendarCancelButtonText}>
                          Cancel
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setShowDateModal(false)}
                        style={styles.doneButton}>
                        <Text style={styles.doneButtonText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </Modal>
          </KeyboardAvoidingView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  animatedContainer: {
    flex: 1,
    width: screenWidth,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.overlayDark,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  saveButtonTextDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  typeGrid: {
    gap: 12,
  },
  typeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  typeLabelActive: {
    color: colors.primary,
  },
  typeDescription: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'System',
    color: colors.text,
  },
  textInputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'System',
    color: colors.danger,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'System',
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  categoryScroll: {
    paddingRight: 20,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 120,
  },
  categoryCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.text,
  },
  categoryLabelActive: {
    color: colors.primary,
  },
  priorityGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  priorityCardActive: {
    borderColor: 'transparent',
  },
  priorityLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text,
  },
  priorityLabelActive: {
    fontWeight: '600',
  },
  summarySection: {
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text,
  },
  dateInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInputText: {
    fontSize: 16,
    fontFamily: 'System',
    color: colors.text,
    flex: 1,
  },
  dateInputPlaceholder: {
    color: colors.textSecondary,
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    margin: 20,
    width: '90%',
    maxWidth: 350,
  },
  calendarContainer: {
    padding: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: colors.overlayLight,
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: '300',
    color: colors.primary,
  },
  monthYearContainer: {
    flex: 1,
    alignItems: 'center',
  },
  calendarMonthText: {
    fontSize: 18,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.text,
    letterSpacing: -0.2,
  },
  dayLabelsContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'center',
    width: '14.28%',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    borderRadius: 20,
  },
  emptyDayCell: {
    backgroundColor: 'transparent',
  },
  todayCell: {
    backgroundColor: colors.primary,
  },
  selectedCell: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.text,
  },
  todayText: {
    color: colors.textWhite,
    fontWeight: '500',
  },
  selectedText: {
    color: colors.textWhite,
    fontWeight: '500',
  },
  pastText: {
    color: colors.textSecondary,
    opacity: 0.4,
  },
  calendarActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.overlayLight,
  },
  calendarCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.overlayLight,
  },
  calendarCancelButtonText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  doneButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  bottomSpacing: {
    height: 50,
  },
});

export default AddGoalModal;
