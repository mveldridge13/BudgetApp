import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
  Keyboard,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';

const {width: screenWidth} = Dimensions.get('window');

const CategorySelectionOverlay = ({
  visible,
  onClose,
  onBack,
  onCategorySelect,
  allCategories,
  transformCategoriesForUI,
  selectedTransactionType,
  onTransactionTypeChange,
  selectedCategory,
  isLoading,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const keyboardAnim = useRef(new Animated.Value(0)).current;

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
  }, [visible, slideAnim, fadeAnim, keyboardAnim, allCategories, selectedTransactionType]);

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

  // Filter categories based on selected transaction type - MUST be before early return
  const filteredCategories = React.useMemo(() => {
    if (!allCategories || !transformCategoriesForUI) {
      return [];
    }

    return transformCategoriesForUI(allCategories, selectedTransactionType);
  }, [allCategories, transformCategoriesForUI, selectedTransactionType]);

  if (!visible) {
    return null;
  }

  const handleCategoryPress = categoryId => {
    onCategorySelect(categoryId);
    // Don't call onClose() - let the container handle overlay transitions
  };

  const getCategoryIconStyle = color => {
    return {
      ...styles.categoryIcon,
      backgroundColor: `${color}26`,
    };
  };

  const renderCategoryGrid = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      );
    }

    if (!filteredCategories || filteredCategories.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No categories available</Text>
        </View>
      );
    }

    return (
      <View style={styles.categoryGrid}>
        {filteredCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryItem,
                selectedCategory === category.id && styles.selectedCategoryItem,
              ]}
              onPress={() => handleCategoryPress(category.id)}
              activeOpacity={0.7}>
              <View style={getCategoryIconStyle(category.color)}>
                <Icon
                  name={category.icon || 'help-circle-outline'}
                  size={24}
                  color={category.color || colors.textSecondary}
                />
              </View>
              <Text style={styles.categoryName} numberOfLines={2}>
                {category.name || 'Unknown Category'}
              </Text>
              {selectedCategory === category.id && (
                <View style={styles.selectedIndicator}>
                  <Icon name="checkmark" size={16} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
        ))}
      </View>
    );
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
          <Text style={styles.title}>Select Category</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Transaction Type Tabs */}
        <View style={styles.transactionTypeContainer}>
          <TouchableOpacity
            style={[
              styles.transactionTypeTab,
              selectedTransactionType === 'EXPENSE' && styles.activeTab,
            ]}
            onPress={() => onTransactionTypeChange('EXPENSE')}
            activeOpacity={0.7}>
            <Icon
              name="trending-down"
              size={20}
              color={
                selectedTransactionType === 'EXPENSE'
                  ? colors.textWhite
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                selectedTransactionType === 'EXPENSE' && styles.activeTabText,
              ]}>
              Expense
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.transactionTypeTab,
              selectedTransactionType === 'INCOME' && styles.activeTab,
            ]}
            onPress={() => onTransactionTypeChange('INCOME')}
            activeOpacity={0.7}>
            <Icon
              name="trending-up"
              size={20}
              color={
                selectedTransactionType === 'INCOME'
                  ? colors.textWhite
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                selectedTransactionType === 'INCOME' && styles.activeTabText,
              ]}>
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Grid */}
        <View style={styles.scrollContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {renderCategoryGrid()}
          </ScrollView>
        </View>
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
    paddingBottom: 20, // Reduced padding
    width: screenWidth,
    height: '55%', // Reduced to 55%
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
    paddingHorizontal: 24,
    marginBottom: 20,
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
  transactionTypeContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    padding: 4,
  },
  transactionTypeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginLeft: 8,
  },
  activeTabText: {
    color: colors.textWhite,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '30%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlayLight,
    borderRadius: 16,
    marginBottom: 16,
    padding: 12,
    position: 'relative',
  },
  selectedCategoryItem: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
});

export default CategorySelectionOverlay;
