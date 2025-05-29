import React, {useRef, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import {colors} from '../styles';

const AddTransactionSpotlight = ({
  visible,
  onNext,
  onSkip,
  floatingButtonLayout,
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

      // Start pulsing animation for the + button
      const startPulsing = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
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

  if (!visible || !showContent || !floatingButtonLayout) {
    return null;
  }

  // Position for the pulsing highlight (center of the floating button)
  const buttonHighlightX =
    floatingButtonLayout.x + floatingButtonLayout.width / 2;
  const buttonHighlightY =
    floatingButtonLayout.y + floatingButtonLayout.height / 2;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}>
      <Animated.View
        style={[styles.overlay, {opacity: fadeAnim}]}
        pointerEvents="box-none">
        {/* Just dim everything - NO cutout. The button will be highlighted with the pulsing ring */}
        <View style={styles.dimmingOverlay} pointerEvents="none" />

        {/* Pulsing button highlight ring - this draws attention to the undimmed button */}
        <Animated.View
          style={[
            styles.buttonHighlight,
            {
              left: buttonHighlightX - 35,
              top: buttonHighlightY - 35,
              transform: [{scale: pulseAnim}],
            },
          ]}
          pointerEvents="none"
        />

        {/* Instruction content */}
        <View
          style={[
            styles.instructionContainer,
            {
              top: floatingButtonLayout.y - 120,
            },
          ]}>
          <View style={styles.instructionBubble}>
            <Text style={styles.instructionTitle}>
              Add Your First Transaction
            </Text>
            <Text style={styles.instructionText}>
              Tap the + button to record your first expense or income.
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.nextButton} onPress={onNext}>
                <Text style={styles.nextButtonText}>Let's do it!</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  dimmingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Lighter dimming so button is still visible
  },
  buttonHighlight: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: colors.textWhite,
    shadowColor: colors.textWhite,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  instructionContainer: {
    position: 'absolute',
    left: 0,
    right: 40,
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

export default AddTransactionSpotlight;
