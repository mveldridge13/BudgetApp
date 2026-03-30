import React from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {colors} from '../styles';

const CustomToggle = ({value, onValueChange, activeColor = '#4CAF50', disabled = false}) => {
  return (
    <TouchableOpacity
      onPress={() => !disabled && onValueChange(!value)}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View style={[styles.toggle, value && styles.toggleActive, value && {backgroundColor: activeColor}, disabled && styles.toggleDisabled]}>
        <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleDisabled: {
    opacity: 0.5,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.textWhite,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
});

export default CustomToggle;
