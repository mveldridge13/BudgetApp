import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles/colors';

// eslint-disable-next-line no-unused-vars
const {width, height} = Dimensions.get('window');

const WelcomeFlow = ({onComplete}) => {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const steps = [
    {
      title: 'Welcome to Squirrel! 🐿️',
      subtitle: 'Your smart daily budget companion',
      description:
        'Squirrel helps you stay on track with your daily spending by showing exactly how much you have left to spend each day.',
      icon: 'heart',
      iconColor: colors.primary,
    },
    {
      title: 'Know Your Daily Budget',
      subtitle: 'Income ÷ Days = Daily allowance',
      description:
        "We'll calculate how much you can spend each day based on your income and expenses. No complex budgeting categories needed!",
      icon: 'calendar',
      iconColor: '#4CAF50',
    },
    {
      title: 'Track Daily & Recurring',
      subtitle: 'One-off purchases vs regular bills',
      description:
        'Add your coffee purchases, groceries, and fun spending as daily transactions. Set up recurring bills like rent and subscriptions separately.',
      icon: 'edit-3',
      iconColor: '#FF9800',
    },
    {
      title: 'See Your Balance Live',
      subtitle: 'Spend smart, not stressed',
      description:
        "Your daily balance updates instantly as you add expenses. Green means you're good, amber means slow down, red means you've overspent.",
      icon: 'trending-up',
      iconColor: '#2196F3',
    },
  ];

  const handleScroll = Animated.event(
    [{nativeEvent: {contentOffset: {x: scrollX}}}],
    {
      useNativeDriver: false,
      listener: event => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        const roundIndex = Math.round(index);
        setCurrentStep(roundIndex);
      },
    },
  );

  const handleSkip = () => {
    onComplete();
  };

  const handleGetStarted = () => {
    onComplete();
  };

  const isLastStep = currentStep === steps.length - 1;

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      {/* Skip Button */}
      {!isLastStep && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Carousel Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
        bounces={false}
        decelerationRate="fast">
        {steps.map((step, index) => (
          <View key={index} style={styles.slide}>
            {/* Icon Illustration */}
            <View
              style={[
                styles.illustrationContainer,
                {backgroundColor: step.iconColor + '20'},
              ]}>
              <Icon name={step.icon} size={48} color={step.iconColor} />
            </View>

            {/* Text Content */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.subtitle}>{step.subtitle}</Text>
              <Text style={styles.description}>{step.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Section */}
      <View
        style={[styles.bottomContainer, {paddingBottom: insets.bottom + 20}]}>
        {/* Progress Indicators */}
        <View style={styles.progressContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentStep && styles.progressDotActive,
                index < currentStep && styles.progressDotCompleted,
              ]}
            />
          ))}
        </View>

        {/* Action Button Container - Always present to maintain consistent spacing */}
        <View style={styles.actionButtonContainer}>
          {isLastStep ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleGetStarted}
              activeOpacity={0.8}>
              <Text style={styles.actionButtonText}>Let's Get Started!</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.swipeHint}>Swipe to continue</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  carousel: {
    flex: 1,
  },
  carouselContent: {
    alignItems: 'center',
  },
  slide: {
    width: width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  illustrationContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
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
  bottomContainer: {
    paddingHorizontal: 32,
    paddingTop: 20,
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: colors.primary + '60',
  },
  actionButtonContainer: {
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: 200,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
  },
  swipeHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default WelcomeFlow;
