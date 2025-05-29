/* eslint-disable react-native/no-inline-styles */
import React, {useRef, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import {colors} from '../styles';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const BalanceCardSpotlight = ({
  visible,
  onNext,
  onSkip,
  balanceCardLayout,
  incomeData,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowContent(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Start pulsing animation for the pencil icon area
      const startPulsing = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.3,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ).start();
      };

      // Start pulsing after a small delay
      setTimeout(startPulsing, 400);
    } else {
      // Stop all animations when closing
      pulseAnim.stopAnimation();
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowContent(false));
    }
  }, [visible, fadeAnim, pulseAnim]);

  if (!visible || !showContent || !balanceCardLayout) {
    return null;
  }

  // Add some padding around the balance card for the spotlight
  const spotlightPadding = 15;
  const cutoutX = balanceCardLayout.x - spotlightPadding;
  const cutoutY = balanceCardLayout.y - spotlightPadding;
  const cutoutWidth = balanceCardLayout.width + spotlightPadding * 2;
  const cutoutHeight = balanceCardLayout.height + spotlightPadding * 2;

  // Position for the pencil icon highlight (bottom right of balance card)
  // Adjust positioning to better target the actual pencil icon
  const pencilHighlightX = balanceCardLayout.x + balanceCardLayout.width - 20; // moved more to the right
  const pencilHighlightY = balanceCardLayout.y + balanceCardLayout.height - 22; // moved slightly up

  // Generate dynamic message based on pay frequency
  const getPeriodText = () => {
    if (!incomeData) {
      return 'today'; // fallback
    }

    // Check multiple possible property names for pay frequency
    const payFreq =
      incomeData.payFrequency ||
      incomeData.frequency ||
      incomeData.paymentFrequency;

    if (!payFreq) {
      return 'today'; // fallback
    }

    switch (payFreq) {
      case 'weekly':
        return 'the week';
      case 'fortnightly':
        return 'the fortnight';
      case 'monthly':
        return 'the month';
      case 'sixmonths':
        return 'the six months';
      case 'yearly':
        return 'the year';
      default:
        return 'today';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}>
      <Animated.View
        style={[styles.overlay, {opacity: fadeAnim}]}
        pointerEvents="box-none">
        {/* Create overlay using 4 rectangles around the cutout */}
        {/* Top rectangle */}
        <View
          style={[
            styles.overlaySection,
            styles.topOverlay,
            {
              width: screenWidth,
              height: cutoutY,
            },
          ]}
          pointerEvents="none"
        />

        {/* Bottom rectangle */}
        <View
          style={[
            styles.overlaySection,
            {
              top: cutoutY + cutoutHeight,
              left: 0,
              width: screenWidth,
              height: Math.max(0, screenHeight - (cutoutY + cutoutHeight)),
            },
          ]}
          pointerEvents="none"
        />

        {/* Left rectangle */}
        <View
          style={[
            styles.overlaySection,
            {
              top: cutoutY,
              left: 0,
              width: Math.max(0, cutoutX),
              height: cutoutHeight,
            },
          ]}
          pointerEvents="none"
        />

        {/* Right rectangle */}
        <View
          style={[
            styles.overlaySection,
            {
              top: cutoutY,
              left: cutoutX + cutoutWidth,
              width: Math.max(0, screenWidth - (cutoutX + cutoutWidth)),
              height: cutoutHeight,
            },
          ]}
          pointerEvents="none"
        />

        {/* Pulsing pencil icon highlight */}
        <Animated.View
          style={[
            styles.pencilHighlight,
            {
              left: pencilHighlightX - 15,
              top: pencilHighlightY - 13,
              transform: [{scale: pulseAnim}],
            },
          ]}
          pointerEvents="none"
        />

        {/* Compact instruction content - positioned near the balance card */}
        <View
          style={[
            styles.instructionContainer,
            {
              top: cutoutY + cutoutHeight + 20, // Position right below the spotlight
            },
          ]}>
          <View style={styles.instructionBubble}>
            <Text style={styles.instructionTitle}>Balance Card</Text>
            <Text style={styles.instructionText}>
              This shows your remaining budget for {getPeriodText()}. Use the
              pencil icon in the bottom-right to edit your setup.
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.nextButton} onPress={onNext}>
                <Text style={styles.nextButtonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Arrow pointing up to the balance card */}
          <View style={styles.arrowUp} />
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlaySection: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  topOverlay: {
    top: 0,
    left: 0,
  },
  pencilHighlight: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 2,
    borderColor: colors.textWhite,
  },
  instructionContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instructionBubble: {
    backgroundColor: colors.textWhite,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  arrowUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.textWhite,
    alignSelf: 'center',
    marginBottom: -1,
    transform: [{translateY: -8}],
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.textWhite,
    marginTop: -1,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 13,
    fontFamily: 'System',
    color: colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 12,
    fontFamily: 'System',
    color: colors.textSecondary,
    fontWeight: '500',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 12,
    fontFamily: 'System',
    color: colors.textWhite,
    fontWeight: '600',
  },
});

export default BalanceCardSpotlight;
