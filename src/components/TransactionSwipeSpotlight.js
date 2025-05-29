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

// eslint-disable-next-line no-unused-vars
const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const TransactionSwipeSpotlight = ({
  visible,
  onNext,
  onSkip,
  transactionLayout,
  currentStep,
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

      // Start pulsing animation for the swipe indicator
      const startPulsing = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.05,
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

  if (!visible || !showContent || !transactionLayout) {
    return null;
  }

  // Remove padding around the transaction card for the spotlight
  // const spotlightPadding = 4;
  const cutoutX = transactionLayout.x;
  const cutoutY = transactionLayout.y;
  const cutoutWidth = transactionLayout.width;
  const cutoutHeight = transactionLayout.height;

  // Calculate position for instruction content
  const instructionY = cutoutY + cutoutHeight + 12;
  const useBottomPosition = instructionY > screenHeight - 200;
  const finalInstructionY = useBottomPosition ? cutoutY - 160 : instructionY;

  const handleNext = () => {
    setShowContent(false);
    if (onNext) {
      onNext();
    }
  };
  const handleSkip = () => {
    setShowContent(false);
    if (onSkip) {
      onSkip();
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
        {/* Dimming overlay - covers the whole screen */}
        <View style={styles.dimmingOverlay} pointerEvents="none" />

        {/* Pulsing highlight around transaction card */}
        <Animated.View
          style={[
            styles.cardHighlight,
            {
              left: cutoutX,
              top: cutoutY,
              width: cutoutWidth,
              height: cutoutHeight,
              borderRadius: 16,
              transform: [{scale: pulseAnim}],
            },
          ]}
        />

        {/* Instruction content */}
        <View
          style={[
            styles.instructionContainer,
            {
              top: finalInstructionY,
            },
          ]}>
          <View style={styles.instructionBubble}>
            <Text style={styles.instructionTitle}>Transaction Card</Text>
            <Text style={styles.instructionText}>
              Swipe left to delete and swipe right to edit
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Arrow pointing to the transaction card */}
          {!useBottomPosition ? (
            <View style={styles.arrowUp} />
          ) : (
            <View style={styles.arrowDown} />
          )}
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
  dimmingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cardHighlight: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.textWhite,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 1,
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
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.textWhite,
    alignSelf: 'center',
    marginTop: -1,
    transform: [{translateY: 8}],
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

export default TransactionSwipeSpotlight;
