import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import {colors} from '../styles';

const {width: screenWidth} = Dimensions.get('window');

// Add fallback colors to prevent crashes
const safeColors = {
  background: colors?.background || '#f8fafc',
  primary: colors?.primary || '#6366f1',
  textPrimary: colors?.textPrimary || '#1f2937',
  textSecondary: colors?.textSecondary || '#6b7280',
  textWhite: colors?.textWhite || '#ffffff',
  overlayLight: colors?.overlayLight || 'rgba(255, 255, 255, 0.2)',
};

const CalendarModal = ({visible, onClose, selectedDate, onDateChange}) => {
  const currentDate = new Date();
  const [displayMonth, setDisplayMonth] = useState(new Date(selectedDate));

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const goToPreviousMonth = () => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setDisplayMonth(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setDisplayMonth(newDate);
  };

  const goToCurrentMonth = () => {
    setDisplayMonth(new Date());
    onDateChange(new Date());
  };

  const getDaysInMonth = date => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const days = getDaysInMonth(displayMonth);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.calendarContainer}>
            {/* Calendar Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                onPress={goToPreviousMonth}
                style={styles.navButton}>
                <Text style={styles.navButtonText}>‹</Text>
              </TouchableOpacity>

              <View style={styles.monthYearContainer}>
                <Text style={styles.calendarMonthText}>
                  {months[displayMonth.getMonth()]} {displayMonth.getFullYear()}
                </Text>
              </View>

              <TouchableOpacity
                onPress={goToNextMonth}
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
              {days.map((day, index) => {
                const isToday =
                  day === currentDate.getDate() &&
                  displayMonth.getMonth() === currentDate.getMonth() &&
                  displayMonth.getFullYear() === currentDate.getFullYear();

                const isSelected =
                  day === selectedDate.getDate() &&
                  displayMonth.getMonth() === selectedDate.getMonth() &&
                  displayMonth.getFullYear() === selectedDate.getFullYear();

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCell,
                      day === null && styles.emptyDayCell,
                      isToday && styles.todayCell,
                      isSelected && styles.selectedCell,
                    ]}
                    disabled={day === null}
                    onPress={() => {
                      if (day) {
                        const newDate = new Date(displayMonth);
                        newDate.setDate(day);
                        onDateChange(newDate);
                      }
                    }}>
                    {day && (
                      <Text
                        style={[
                          styles.dayText,
                          isToday && styles.todayText,
                          isSelected && styles.selectedText,
                        ]}>
                        {day}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Action buttons */}
            <View style={styles.calendarActions}>
              <TouchableOpacity
                onPress={goToCurrentMonth}
                style={styles.todayButton}>
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: safeColors.background, // Using safe fallback
    borderRadius: 20,
    margin: 20,
    width: screenWidth - 40,
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
    backgroundColor: safeColors.overlayLight,
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: '300',
    color: safeColors.primary,
  },
  monthYearContainer: {
    flex: 1,
    alignItems: 'center',
  },
  calendarMonthText: {
    fontSize: 18,
    fontWeight: '400',
    fontFamily: 'System',
    color: safeColors.textPrimary,
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
    color: safeColors.textSecondary,
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
    backgroundColor: safeColors.primary,
  },
  selectedCell: {
    backgroundColor: safeColors.primary,
    opacity: 0.4,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: safeColors.textPrimary,
  },
  todayText: {
    color: safeColors.textWhite,
    fontWeight: '500',
  },
  selectedText: {
    color: safeColors.textWhite,
    fontWeight: '500',
  },
  calendarActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: safeColors.overlayLight,
  },
  todayButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: safeColors.overlayLight,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: safeColors.textSecondary,
  },
  doneButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: safeColors.primary,
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: safeColors.textWhite,
  },
});

export default CalendarModal;
