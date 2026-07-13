// components/IncomeSourcesSection.js
// "Additional income sources" management (edit mode of the income setup
// screen). Each source is materialized by the backend as INCOME transactions
// on its pay dates, so the money flows into the period budget automatically.
// Web parity (budget-web-mockup src/components/income/IncomeSourcesSection.tsx)
// — same wording throughout.
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import TrendAPIService from '../services/TrendAPIService';
import CalendarModal from './CalendarModal';

const FREQUENCIES = [
  {id: 'WEEKLY', label: 'Weekly'},
  {id: 'FORTNIGHTLY', label: 'Fortnightly'},
  {id: 'MONTHLY', label: 'Monthly'},
];

const frequencyLabel = frequency =>
  FREQUENCIES.find(f => f.id === frequency)?.label ?? frequency;

const formatDisplayDate = iso =>
  new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const formatDateButtonLabel = date =>
  date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const emptyForm = () => ({
  name: '',
  amount: '',
  frequency: '',
  nextPaymentDate: new Date(),
});

const IncomeSourcesSection = () => {
  const [incomeSources, setIncomeSources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // null = closed, 'new' = adding, otherwise the id of the source being edited
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadSources = useCallback(async () => {
    try {
      const sources = await TrendAPIService.getIncomeSources();
      setIncomeSources(sources);
    } catch (err) {
      console.error('Error loading income sources:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const openAdd = () => {
    setForm(emptyForm());
    setError(null);
    setEditing('new');
  };

  const openEdit = source => {
    setForm({
      name: source.name,
      amount: String(source.amount),
      frequency: source.frequency,
      nextPaymentDate: new Date(source.nextPaymentDate),
    });
    setError(null);
    setEditing(source.id);
  };

  const close = () => {
    setEditing(null);
    setError(null);
  };

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!form.name.trim()) {
      setError('Please enter a name for this income source.');
      return;
    }
    if (!amount || amount <= 0) {
      setError('Please enter an amount greater than zero.');
      return;
    }
    if (!form.frequency) {
      setError('Please choose how often this income arrives.');
      return;
    }

    // Noon local time, matching how the salary pay date is stored
    const nextPaymentDate = new Date(form.nextPaymentDate);
    nextPaymentDate.setHours(12, 0, 0, 0);

    const payload = {
      name: form.name.trim(),
      amount,
      frequency: form.frequency,
      nextPaymentDate: nextPaymentDate.toISOString(),
    };

    setSaving(true);
    setError(null);
    try {
      if (editing === 'new') {
        await TrendAPIService.createIncomeSource(payload);
      } else if (editing) {
        await TrendAPIService.updateIncomeSource(editing, payload);
      }
      await loadSources();
      close();
    } catch (err) {
      setError(err?.message || 'Failed to save income source.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = source => {
    Alert.alert(
      `Delete "${source.name}"?`,
      'Future payments will stop being added automatically; past transactions are kept.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await TrendAPIService.deleteIncomeSource(source.id);
              await loadSources();
              if (editing === source.id) {
                close();
              }
            } catch (err) {
              Alert.alert(
                'Error',
                'Failed to delete income source. Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  const handleToggleActive = async source => {
    try {
      await TrendAPIService.updateIncomeSource(source.id, {
        isActive: !source.isActive,
      });
      await loadSources();
    } catch (err) {
      Alert.alert('Error', 'Failed to update income source. Please try again.');
    }
  };

  const sourceForm = (
    <View style={styles.formCard}>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.textInput}
          value={form.name}
          onChangeText={text => setForm({...form, name: text})}
          placeholder="e.g. Child Support"
          placeholderTextColor="#A0A0A0"
          editable={!saving}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Amount</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={form.amount}
            onChangeText={text => setForm({...form, amount: text})}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#A0A0A0"
            editable={!saving}
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>How often does it arrive?</Text>
        <View style={styles.frequencyRow}>
          {FREQUENCIES.map(frequency => (
            <TouchableOpacity
              key={frequency.id}
              style={[
                styles.frequencyButton,
                form.frequency === frequency.id &&
                  styles.frequencyButtonSelected,
              ]}
              onPress={() => setForm({...form, frequency: frequency.id})}
              disabled={saving}>
              <Text
                style={[
                  styles.frequencyButtonText,
                  form.frequency === frequency.id &&
                    styles.frequencyButtonTextSelected,
                ]}>
                {frequency.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Next Payment Date</Text>
        <TouchableOpacity
          style={[styles.dateButton, saving && styles.disabledButton]}
          onPress={() => !saving && setShowDatePicker(true)}
          disabled={saving}>
          <Text style={styles.dateButtonText}>
            {formatDateButtonLabel(form.nextPaymentDate)}
          </Text>
          <Icon name="calendar-today" size={16} color="#8E8E93" />
        </TouchableOpacity>
        <Text style={styles.helperText}>
          The payment is added to your budget automatically on this date
        </Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.formButtonRow}>
        <TouchableOpacity
          style={[styles.formCancelButton, saving && styles.disabledButton]}
          onPress={close}
          disabled={saving}>
          <Text style={styles.formCancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.formSaveButton, saving && styles.disabledButton]}
          onPress={handleSave}
          disabled={saving}>
          <Text style={styles.formSaveButtonText}>
            {saving
              ? 'Saving...'
              : editing === 'new'
              ? 'Add Source'
              : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>

      <CalendarModal
        visible={showDatePicker}
        selectedDate={form.nextPaymentDate}
        onDateChange={date => {
          setForm({...form, nextPaymentDate: date});
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Additional income sources</Text>
        <Text style={styles.subtitle}>
          Recurring income besides your pay, like child support or government
          payments. Each payment is added to your budget automatically on its
          due date.
        </Text>
      </View>

      {isLoading && incomeSources.length === 0 ? (
        <Text style={styles.loadingText}>Loading…</Text>
      ) : (
        <View style={styles.list}>
          {incomeSources.map(source =>
            editing === source.id ? (
              <View key={source.id}>{sourceForm}</View>
            ) : (
              <View
                key={source.id}
                style={[
                  styles.sourceRow,
                  !source.isActive && styles.sourceRowInactive,
                ]}>
                <View style={styles.sourceInfo}>
                  <View style={styles.sourceNameRow}>
                    <Text style={styles.sourceName} numberOfLines={1}>
                      {source.name}
                    </Text>
                    {!source.isActive && (
                      <View style={styles.pausedBadge}>
                        <Text style={styles.pausedBadgeText}>Paused</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.sourceDetail}>
                    ${source.amount.toFixed(2)}{' '}
                    {frequencyLabel(source.frequency).toLowerCase()}
                    {source.isActive
                      ? ` · next ${formatDisplayDate(source.nextPaymentDate)}`
                      : ''}
                  </Text>
                </View>
                <View style={styles.sourceActions}>
                  <TouchableOpacity
                    style={styles.pauseResumeButton}
                    onPress={() => handleToggleActive(source)}>
                    <Text style={styles.pauseResumeButtonText}>
                      {source.isActive ? 'Pause' : 'Resume'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => openEdit(source)}>
                    <Icon name="edit" size={18} color="#8E8E93" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleDelete(source)}>
                    <Icon name="delete" size={18} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              </View>
            ),
          )}

          {editing === 'new' ? (
            sourceForm
          ) : (
            <TouchableOpacity style={styles.addButton} onPress={openAdd}>
              <Icon name="add" size={18} color="#8E8E93" />
              <Text style={styles.addButtonText}>Add income source</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'System',
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'System',
    color: '#8E8E93',
    lineHeight: 18,
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  list: {
    gap: 12,
  },
  sourceRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceRowInactive: {
    opacity: 0.6,
  },
  sourceInfo: {
    flex: 1,
    marginRight: 12,
  },
  sourceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceName: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'System',
    color: '#1A1A1A',
    flexShrink: 1,
  },
  pausedBadge: {
    backgroundColor: '#F1F1F1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pausedBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'System',
    color: '#8E8E93',
  },
  sourceDetail: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'System',
    color: '#8E8E93',
  },
  sourceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pauseResumeButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  pauseResumeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'System',
    color: '#8E8E93',
  },
  iconButton: {
    padding: 6,
  },
  addButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: '#8E8E93',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 16,
    gap: 16,
  },
  fieldGroup: {},
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'System',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    fontSize: 15,
    fontFamily: 'System',
    color: '#1A1A1A',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  currencySymbol: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'System',
    color: '#1A1A1A',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'System',
    color: '#1A1A1A',
    paddingVertical: 10,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  frequencyButtonSelected: {
    backgroundColor: '#A78BFA',
    borderColor: '#A78BFA',
  },
  frequencyButtonText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'System',
    color: '#1A1A1A',
  },
  frequencyButtonTextSelected: {
    color: '#FFFFFF',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  dateButtonText: {
    fontSize: 15,
    fontFamily: 'System',
    color: '#1A1A1A',
  },
  helperText: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: 'System',
    color: '#8E8E93',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'System',
    color: '#B91C1C',
  },
  formButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  formCancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: '#8E8E93',
  },
  formSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
  },
  formSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default IncomeSourcesSection;
