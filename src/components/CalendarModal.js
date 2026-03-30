import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
  const [pickerMode, setPickerMode] = useState('calendar'); // 'calendar' or 'monthYear'
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  // Sync displayMonth when modal opens or selectedDate changes
  useEffect(() => {
    if (visible && selectedDate) {
      setDisplayMonth(new Date(selectedDate));
      setPickerYear(new Date(selectedDate).getFullYear());
      setPickerMode('calendar');
    }
  }, [visible, selectedDate]);

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

  const monthsShort = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
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

  const handleMonthYearPress = () => {
    setPickerYear(displayMonth.getFullYear());
    setPickerMode('monthYear');
  };

  const handleMonthSelect = monthIndex => {
    const newDate = new Date(pickerYear, monthIndex, 1);
    setDisplayMonth(newDate);
    setPickerMode('calendar');
  };

  const goToPreviousYear = () => {
    setPickerYear(pickerYear - 1);
  };

  const goToNextYear = () => {
    setPickerYear(pickerYear + 1);
  };

  const days = getDaysInMonth(displayMonth);

  const renderCalendarView = () => (
    <>
      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          onPress={goToPreviousMonth}
          style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.monthYearButton}
          onPress={handleMonthYearPress}
          activeOpacity={0.7}>
          <Text style={styles.calendarMonthText}>
            {months[displayMonth.getMonth()]} {displayMonth.getFullYear()}
          </Text>
        </TouchableOpacity>

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
    </>
  );

  const renderMonthYearPicker = () => (
    <>
      {/* Year Header */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          onPress={goToPreviousYear}
          style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.monthYearContainer}>
          <Text style={styles.calendarMonthText}>{pickerYear}</Text>
        </View>

        <TouchableOpacity
          onPress={goToNextYear}
          style={styles.navButton}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Month Grid */}
      <View style={styles.monthGrid}>
        {monthsShort.map((month, index) => {
          const isCurrentMonth =
            index === currentDate.getMonth() &&
            pickerYear === currentDate.getFullYear();
          const isSelectedMonth =
            index === displayMonth.getMonth() &&
            pickerYear === displayMonth.getFullYear();

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.monthCell,
                isCurrentMonth && styles.currentMonthCell,
                isSelectedMonth && styles.selectedMonthCell,
              ]}
              onPress={() => handleMonthSelect(index)}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.monthCellText,
                  isSelectedMonth && styles.selectedMonthText,
                  isCurrentMonth && styles.currentMonthText,
                ]}>
                {month}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Action buttons */}
      <View style={styles.calendarActions}>
        <TouchableOpacity
          onPress={() => setPickerMode('calendar')}
          style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={styles.doneButton}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.calendarContainer}>
                {pickerMode === 'calendar'
                  ? renderCalendarView()
                  : renderMonthYearPicker()}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
    backgroundColor: safeColors.background,
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
  monthYearButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: safeColors.primary,
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
  // Month/Year Picker styles
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthCell: {
    width: '30%',
    paddingVertical: 16,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: safeColors.overlayLight,
    alignItems: 'center',
  },
  currentMonthCell: {
    backgroundColor: safeColors.primary,
  },
  selectedMonthCell: {
    borderWidth: 2,
    borderColor: safeColors.primary,
  },
  monthCellText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: safeColors.textPrimary,
  },
  currentMonthText: {
    color: safeColors.textWhite,
  },
  selectedMonthText: {
    color: safeColors.primary,
  },
});

export default CalendarModal;
