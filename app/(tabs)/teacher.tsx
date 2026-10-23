
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { buildQRPayload } from '@/docs/lib/qr';
import QRCode from 'react-native-qrcode-svg';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/docs/lib/auth';
import { supabase } from '@/docs/lib/supabase';

function toLocalISO(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
  );
}

function formatDateInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTimeInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function updateDatePart(current: Date, value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return current;
  const [, year, month, day] = match;
  const next = new Date(current);
  next.setFullYear(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(next.getTime()) ? current : next;
}

function updateTimePart(current: Date, value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return current;
  const [, hours, minutes] = match;
  const h = Number(hours);
  const m = Number(minutes);
  if (h > 23 || m > 59) return current;
  const next = new Date(current);
  next.setHours(h, m, 0, 0);
  return next;
}

function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });

  return `${month} ${pad(date.getDate())}, ${date.getFullYear()} at ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

const QUICK_END_OPTIONS = [
  { label: '+30 min', ms: 30 * 60 * 1000 },
  { label: '+1 hour', ms: 60 * 60 * 1000 },
  { label: '+2 hours', ms: 2 * 60 * 60 * 1000 },
];

type EditTarget = 'start' | 'end';

export default function TeacherScreen() {
  const { role, user } = useAuth();

  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(
    () => new Date(Date.now() + 60 * 60 * 1000)
  );
  const [startDateText, setStartDateText] = useState('');
  const [startTimeText, setStartTimeText] = useState('');
  const [endDateText, setEndDateText] = useState('');
  const [endTimeText, setEndTimeText] = useState('');
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');
  const [payload, setPayload] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isAndroid = Platform.OS === 'android';

  const openPicker = (target: EditTarget) => {
    setMessage(null);
    setEditTarget(target);
    setEditingPart('date');
  };

  const onPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (!editTarget) return;

    if (event.type === 'dismissed' || !selected) {
      setEditTarget(null);
      setEditingPart('date');
      return;
    }

    const current = editTarget === 'start' ? startDate : endDate;
    const next = new Date(current);

    next.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate()
    );

    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);

    if (editTarget === 'start') {
      setStartDate(next);
    } else {
      setEndDate(next);
    }

    if (isAndroid && editingPart === 'date') {
      setEditingPart('time');
    } else {
      setEditTarget(null);
      setEditingPart('date');
    }
  };

  const handleQuickEnd = (ms: number) => {
    setMessage(null);
    setEndDate(new Date(startDate.getTime() + ms));
  };

  const handleCreateEvent = () => {
    const event = {
      eventId: eventId.trim(),
      title: title.trim(),
      start: toLocalISO(startDate),
      end: toLocalISO(endDate),
    };

    if (!event.eventId || !event.title) {
      setMessage('Event title and code are required.');
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setMessage('End time must be after start time.');
      return;
    }

    if (!venue.trim()) {
      setMessage('Event venue is required.');
      return;
    }

    if (!user?.id) {
      setMessage('Your session could not be verified. Please sign out and sign in again.');
      return;
    }

    setMessage(null);

    void (async () => {
      try {
        const { error } = await supabase.from('events').insert({
          event_code: event.eventId,
          title: event.title,
          venue: venue.trim(),
          description: description.trim() || null,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          created_by: user.id,
          status: 'open',
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        setMessage('Event saved! Scan the QR with the Scan tab to test it.');
        setPayload(buildQRPayload(event));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not create event.');
      }
    })();
  };

  if (role === null) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />

        <Text style={styles.loadingText}>
          Checking your account...
        </Text>
      </View>
    );
  }

  if (role !== 'teacher') {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons
          name="lock-closed-outline"
          size={48}
          color={COLORS.textSecondary}
        />

        <Text style={styles.lockTitle}>Teachers Only</Text>

        <Text style={styles.lockSubtitle}>
          Only teacher accounts can create events.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="qr-code-outline" size={34} color="#FFD166" />
        </View>
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroEyebrow}>TEACHER DASHBOARD</Text>
          <Text style={styles.heroTitle}>Create Event <Text style={styles.heroGold}>QR</Text></Text>
          <Text style={styles.heroSubtitle}>Set up your campus event and generate an attendance QR code.</Text>
        </View>
        <View style={styles.stepBadge}><Text style={styles.stepNumber}>1</Text><Text style={styles.stepLabel}>DETAILS</Text></View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}><Ionicons name="document-text-outline" size={21} color={COLORS.primary} /></View>
          <View style={styles.sectionHeadingText}>
            <Text style={styles.cardHeading}>Event Details</Text>
            <Text style={styles.cardSubheading}>Provide the basic information about your event.</Text>
          </View>
        </View>

        <Text style={styles.label}>Event Title <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Founders Day Assembly"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.label}>Event Code <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={eventId}
          onChangeText={setEventId}
          placeholder="e.g. EVT-2026-0002"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Venue <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={venue}
          onChangeText={setVenue}
          placeholder="e.g. School Gymnasium"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          placeholder="Enter event details..."
          placeholderTextColor={COLORS.textSecondary}
        />
      </View>

      <View style={styles.formCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}><Ionicons name="calendar-outline" size={21} color={COLORS.primary} /></View>
          <View style={styles.sectionHeadingText}>
            <Text style={styles.cardHeading}>Event Schedule</Text>
            <Text style={styles.cardSubheading}>Set the start and end date and time.</Text>
          </View>
        </View>
        <Text style={styles.label}>Starts <Text style={styles.required}>*</Text></Text>

      {Platform.OS === 'web' ? (
        <View style={styles.webDateRow}>
          <View style={styles.webDateInputWrap}>
            <Text style={styles.webInputCaption}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={startDateText || formatDateInput(startDate)}
              onChangeText={setStartDateText}
              onEndEditing={() => {
                setStartDate((current) => updateDatePart(current, startDateText));
                setStartDateText('');
              }}
              placeholder="2026-10-18"
              accessibilityLabel="Event start date"
            />
          </View>
          <View style={styles.webDateInputWrap}>
            <Text style={styles.webInputCaption}>Time (HH:mm)</Text>
            <TextInput
              style={styles.input}
              value={startTimeText || formatTimeInput(startDate)}
              onChangeText={setStartTimeText}
              onEndEditing={() => {
                setStartDate((current) => updateTimePart(current, startTimeText));
                setStartTimeText('');
              }}
              placeholder="17:00"
              accessibilityLabel="Event start time"
            />
          </View>
        </View>
      ) : (
        <PickerField
          value={formatDateTime(startDate)}
          icon="sunny-outline"
          onPress={() => openPicker('start')}
        />
      )}

      <Text style={styles.label}>Ends <Text style={styles.required}>*</Text></Text>

      {Platform.OS === 'web' ? (
        <View style={styles.webDateRow}>
          <View style={styles.webDateInputWrap}>
            <Text style={styles.webInputCaption}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={endDateText || formatDateInput(endDate)}
              onChangeText={setEndDateText}
              onEndEditing={() => {
                setEndDate((current) => updateDatePart(current, endDateText));
                setEndDateText('');
              }}
              placeholder="2026-10-18"
              accessibilityLabel="Event end date"
            />
          </View>
          <View style={styles.webDateInputWrap}>
            <Text style={styles.webInputCaption}>Time (HH:mm)</Text>
            <TextInput
              style={styles.input}
              value={endTimeText || formatTimeInput(endDate)}
              onChangeText={setEndTimeText}
              onEndEditing={() => {
                setEndDate((current) => updateTimePart(current, endTimeText));
                setEndTimeText('');
              }}
              placeholder="19:00"
              accessibilityLabel="Event end time"
            />
          </View>
        </View>
      ) : (
        <PickerField
          value={formatDateTime(endDate)}
          icon="moon-outline"
          onPress={() => openPicker('end')}
        />
      )}

      <View style={styles.chipRow}>
        {QUICK_END_OPTIONS.map((option) => (
          <Pressable
            key={option.label}
            style={styles.chip}
            onPress={() => handleQuickEnd(option.ms)}
          >
            <Text style={styles.chipText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.hint}>
        Quick set end time from start:
      </Text>

      {message && <Text style={styles.message}>{message}</Text>}

      <View style={styles.createButtonWrap}>
        <AppButton
          theme="primary"
          title="Create Event & Generate QR"
          icon="add-circle-outline"
          onPress={handleCreateEvent}
        />
      </View>
      </View>

      {editTarget && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={editTarget === 'start' ? startDate : endDate}
            mode={isAndroid ? editingPart : 'datetime'}
            display={isAndroid ? 'default' : 'spinner'}
            onChange={onPickerChange}
          />
        </View>
      )}

      {payload && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>
            Scan this QR code with the Scan tab:
          </Text>

          <View style={styles.qrBox}>
            <QRCode value={payload} size={200} />
          </View>

          <Text style={styles.payloadText}>{payload}</Text>
        </View>
      )}
    </ScrollView>
  );
}

type PickerFieldProps = {
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function PickerField({ value, icon, onPress }: PickerFieldProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pickerField,
        pressed && styles.pickerFieldPressed,
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={COLORS.primary} />

      <Text style={styles.pickerValue}>{value}</Text>

      <Ionicons
        name="calendar-outline"
        size={18}
        color={COLORS.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6FB' },
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 42, maxWidth: 1180, width: '100%', alignSelf: 'center' },
  centeredContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loadingText: { fontSize: 15, color: COLORS.textSecondary, marginTop: 12 },
  lockTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginTop: 16, marginBottom: 6 },
  lockSubtitle: { fontSize: 15, lineHeight: 21, color: COLORS.textSecondary, textAlign: 'center' },
  heroCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#123968', borderRadius: 20, padding: 22, marginBottom: 18, overflow: 'hidden', gap: 15 },
  heroIcon: { width: 60, height: 60, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  heroTextWrap: { flex: 1, minWidth: 0 },
  heroEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: '#D5E3F5', marginBottom: 5 },
  heroTitle: { fontSize: 27, fontWeight: '900', color: '#FFFFFF' },
  heroGold: { color: '#FFD166' },
  heroSubtitle: { fontSize: 13, lineHeight: 19, color: '#E0EAF7', marginTop: 4 },
  stepBadge: { alignItems: 'center', justifyContent: 'center', minWidth: 55 },
  stepNumber: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', backgroundColor: '#FFD166', color: '#123968', fontWeight: '900', fontSize: 16, paddingTop: 7 },
  stepLabel: { color: '#FFD166', fontSize: 9, fontWeight: '900', marginTop: 6, letterSpacing: 1 },
  formCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E9F3', borderRadius: 20, padding: 21, marginBottom: 18, shadowColor: '#183B64', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
  sectionIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: '#EAF1FC', alignItems: 'center', justifyContent: 'center' },
  sectionHeadingText: { flex: 1 },
  cardHeading: { fontSize: 18, fontWeight: '900', color: '#123968' },
  cardSubheading: { fontSize: 12, lineHeight: 17, color: '#6A7D97', marginTop: 2 },
  label: { fontSize: 13, fontWeight: '800', color: '#17385F', marginBottom: 7, marginTop: 12 },
  required: { color: '#C68B10' },
  optional: { fontSize: 11, fontWeight: '500', color: '#8290A4' },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#DCE5F0', paddingHorizontal: 14, paddingVertical: 13, minHeight: 48, fontSize: 14, color: '#183653' },
  multiline: { minHeight: 92, textAlignVertical: 'top' },
  webDateRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  webDateInputWrap: { flex: 1, minWidth: 0 },
  webInputCaption: { color: '#6A7D97', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  pickerField: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#DCE5F0', paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
  pickerFieldPressed: { backgroundColor: '#EDF3FC' },
  pickerValue: { flex: 1, fontSize: 14, fontWeight: '600', color: '#183653', marginHorizontal: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 11, gap: 8 },
  chip: { backgroundColor: '#EDF3FC', borderWidth: 1, borderColor: '#DCE8FA', borderRadius: 999, paddingHorizontal: 15, paddingVertical: 9, marginRight: 0 },
  chipText: { fontSize: 12, fontWeight: '800', color: '#174778' },
  hint: { fontSize: 12, color: '#6A7D97', marginTop: 8, lineHeight: 17 },
  createButtonWrap: { marginTop: 14 },
  message: { fontSize: 13, color: '#174778', backgroundColor: '#EDF3FC', borderRadius: 10, padding: 11, textAlign: 'center', marginTop: 12 },
  pickerContainer: {
    marginTop: 12,
    alignItems: 'center',
  },

  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },

  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },

  payloadText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
