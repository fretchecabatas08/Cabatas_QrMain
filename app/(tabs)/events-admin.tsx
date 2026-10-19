import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/docs/lib/auth';
import { supabase } from '@/docs/lib/supabase';
import { buildQRPayload } from '@/docs/lib/qr';

type EventRow = {
  id: string;
  event_code: string;
  title: string;
  start: string;
  end: string;
  created_by: string | null;
  created_at: string;
  venue?: string | null;
  description?: string | null;
  status?: string | null;
};

type PickerTarget = 'start' | 'end';

const quickEnds = [
  { label: '+30 min', ms: 1_800_000 },
  { label: '+1 hour', ms: 3_600_000 },
  { label: '+2 hours', ms: 7_200_000 },
];

const dateLabel = (value: string | Date) =>
  new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

// React Native Web does not render the community DateTimePicker reliably.
// Use native HTML date/time inputs on web, while keeping the native picker on Android/iOS.
const WebInput = TextInput as any;

const formatDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTimeInput = (value: Date) =>
  `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

const updateDatePart = (current: Date, value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date(current);
  const next = new Date(current);
  next.setFullYear(year, month - 1, day);
  return next;
};

const updateTimePart = (current: Date, value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return new Date(current);
  const next = new Date(current);
  next.setHours(hours, minutes, 0, 0);
  return next;
};

export default function AdminEventsScreen() {
  const { role, user } = useAuth();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState(new Date(Date.now() + 5 * 60_000));
  const [end, setEnd] = useState(new Date(Date.now() + 65 * 60_000));

  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [viewEvent, setViewEvent] = useState<EventRow | null>(null);
  const [confirmClose, setConfirmClose] = useState<EventRow | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (role !== 'admin') {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents((data ?? []) as EventRow[]);
    } catch (error) {
      console.error('[EVENT LOAD ERROR]', error);
      Alert.alert(
        'Could not load events',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [role]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const reset = () => {
    setEditingId(null);
    setTitle('');
    setCode('');
    setVenue('');
    setDescription('');
    setStart(new Date(Date.now() + 5 * 60_000));
    setEnd(new Date(Date.now() + 65 * 60_000));
    setQrPayload(null);
    setNotice('');
  };

  const edit = (ev: EventRow) => {
    setEditingId(ev.id);
    setTitle(ev.title);
    setCode(ev.event_code);
    setVenue(ev.venue ?? '');
    setDescription(ev.description ?? '');
    setStart(new Date(ev.start));
    setEnd(new Date(ev.end));
    setQrPayload(null);
    setNotice(`Editing event: ${ev.event_code}`);
  };

  const openPicker = (target: PickerTarget) => {
    setPicker(target);
    setPickerMode('date');
  };

  const changePicker = (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {
    if (event.type === 'dismissed' || !selected) {
      setPicker(null);
      setPickerMode('date');
      return;
    }

    const current = picker === 'start' ? start : end;
    const next = new Date(current);

    if (Platform.OS === 'android' && pickerMode === 'date') {
      next.setFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate(),
      );
      if (picker === 'start') setStart(next);
      else setEnd(next);
      setPickerMode('time');
      return;
    }

    if (Platform.OS === 'android') {
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    } else {
      next.setTime(selected.getTime());
    }

    if (picker === 'start') {
      setStart(next);
      if (end <= next) setEnd(new Date(next.getTime() + 3_600_000));
    } else {
      setEnd(next);
    }

    setPicker(null);
    setPickerMode('date');
  };

  const save = async () => {
    if (!title.trim() || !code.trim() || !venue.trim()) {
      Alert.alert(
        'Missing details',
        'Event title, event code, and venue are required.',
      );
      return;
    }

    if (end <= start) {
      Alert.alert(
        'Invalid schedule',
        'The end date and time must be after the start date and time.',
      );
      return;
    }

    setSaving(true);
    setNotice('');

    try {
      const payload = {
        title: title.trim(),
        event_code: code.trim().toUpperCase(),
        venue: venue.trim(),
        description: description.trim() || null,
        start: start.toISOString(),
        end: end.toISOString(),
      };

      const result = editingId
        ? await supabase
            .from('events')
            .update(payload)
            .eq('id', editingId)
            .select('id')
        : await supabase
            .from('events')
            .insert({
              ...payload,
              created_by: user?.id,
              status: 'open',
            })
            .select('id');

      if (result.error) throw result.error;

      if (!result.data || result.data.length === 0) {
        throw new Error(
          'No event was returned after saving. Check your database permissions and policies.',
        );
      }

      const successMessage = editingId
        ? 'Event updated successfully.'
        : 'Event created successfully.';

      reset();
      await load();
      setNotice(successMessage);
    } catch (error) {
      console.error('[EVENT SAVE ERROR]', error);
      Alert.alert(
        'Could not save event',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (ev: EventRow) => {
    setConfirmClose(ev);
  };

  const confirmToggleStatus = async () => {
    if (!confirmClose) return;

    const eventToUpdate = confirmClose;
    const nextStatus =
      eventToUpdate.status === 'closed' ? 'open' : 'closed';

    setSaving(true);
    setNotice('');

    try {
      const { error } = await supabase
        .from('events')
        .update({ status: nextStatus })
        .eq('id', eventToUpdate.id);

      if (error) throw error;

      setConfirmClose(null);
      await load();
      setNotice(
        nextStatus === 'closed'
          ? 'Event closed successfully.'
          : 'Event reopened successfully.',
      );
    } catch (error) {
      console.error('[EVENT STATUS ERROR]', error);
      Alert.alert(
        'Could not update event',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (role !== 'admin') {
    return (
      <View style={s.center}>
        <Ionicons
          name="lock-closed-outline"
          size={42}
          color={COLORS.primary}
        />
        <Text style={s.title}>Administrators Only</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>Event Management</Text>
      <Text style={s.subtitle}>
        Create and manage events across the attendance system.
      </Text>

      {notice ? <Text style={s.notice}>{notice}</Text> : null}

      <View style={s.formCard}>
        <Text style={s.formTitle}>
          {editingId ? 'Edit Event' : 'Create Event QR'}
        </Text>

        <Text style={s.label}>Event Title</Text>
        <TextInput
          style={s.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Founders Day Assembly"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={s.label}>Event Code</Text>
        <TextInput
          style={s.input}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          placeholder="e.g. EVT-2026-0002"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={s.label}>Venue</Text>
        <TextInput
          style={s.input}
          value={venue}
          onChangeText={setVenue}
          placeholder="e.g. School Gymnasium"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={s.label}>Description</Text>
        <TextInput
          style={[s.input, s.multiline]}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          placeholder="Enter event details..."
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={s.label}>Starts</Text>
        {Platform.OS === 'web' ? (
          <View style={s.webDateTimeRow}>
            <View style={s.webDateTimeField}>
              <Text style={s.webInputLabel}>Date</Text>
              <WebInput
                type="date"
                style={s.webInput}
                value={formatDateInput(start)}
                onChangeText={(value: string) => {
                  const next = updateDatePart(start, value);
                  setStart(next);
                  if (end <= next) setEnd(new Date(next.getTime() + 3_600_000));
                }}
              />
            </View>
            <View style={s.webDateTimeField}>
              <Text style={s.webInputLabel}>Time</Text>
              <WebInput
                type="time"
                style={s.webInput}
                value={formatTimeInput(start)}
                onChangeText={(value: string) => {
                  const next = updateTimePart(start, value);
                  setStart(next);
                  if (end <= next) setEnd(new Date(next.getTime() + 3_600_000));
                }}
              />
            </View>
          </View>
        ) : (
          <Pressable style={s.dateButton} onPress={() => openPicker('start')}>
            <Ionicons name="sunny-outline" size={20} color={COLORS.primaryDark} />
            <Text style={s.dateText}>{dateLabel(start)}</Text>
            <Ionicons name="calendar-outline" size={21} color={COLORS.textSecondary} />
          </Pressable>
        )}

        <Text style={s.label}>Ends</Text>
        {Platform.OS === 'web' ? (
          <View style={s.webDateTimeRow}>
            <View style={s.webDateTimeField}>
              <Text style={s.webInputLabel}>Date</Text>
              <WebInput
                type="date"
                style={s.webInput}
                value={formatDateInput(end)}
                onChangeText={(value: string) => setEnd(updateDatePart(end, value))}
              />
            </View>
            <View style={s.webDateTimeField}>
              <Text style={s.webInputLabel}>Time</Text>
              <WebInput
                type="time"
                style={s.webInput}
                value={formatTimeInput(end)}
                onChangeText={(value: string) => setEnd(updateTimePart(end, value))}
              />
            </View>
          </View>
        ) : (
          <Pressable style={s.dateButton} onPress={() => openPicker('end')}>
            <Ionicons name="moon-outline" size={20} color={COLORS.primaryDark} />
            <Text style={s.dateText}>{dateLabel(end)}</Text>
            <Ionicons name="calendar-outline" size={21} color={COLORS.textSecondary} />
          </Pressable>
        )}

        {picker && Platform.OS !== 'web' ? (
          <DateTimePicker
            value={picker === 'start' ? start : end}
            mode={Platform.OS === 'ios' ? 'datetime' : pickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={changePicker}
          />
        ) : null}

        {picker && Platform.OS === 'android' ? (
          <Text style={s.hint}>Choose the date and then the time.</Text>
        ) : null}

        <View style={s.quickRow}>
          {quickEnds.map((quickEnd) => (
            <Pressable
              key={quickEnd.label}
              style={s.quickButton}
              onPress={() =>
                setEnd(new Date(start.getTime() + quickEnd.ms))
              }
            >
              <Text style={s.quickText}>{quickEnd.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.hint}>
          Choose a quick end time or set the date and time above.
        </Text>

        <Pressable
          disabled={saving}
          style={[s.primaryButton, saving && s.disabledButton]}
          onPress={save}
        >
          <Ionicons
            name={editingId ? 'save-outline' : 'add-circle-outline'}
            size={22}
            color="#FFFFFF"
          />
          <Text style={s.primaryText}>
            {saving
              ? 'Saving...'
              : editingId
                ? 'Save Changes'
                : 'Create Event'}
          </Text>
        </Pressable>

        {editingId ? (
          <Pressable style={s.cancelButton} onPress={reset}>
            <Text style={s.cancelText}>Cancel Editing</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={s.sectionRow}>
        <View>
          <Text style={s.sectionTitle}>All Events</Text>
          <Text style={s.subtitleSmall}>
            Events created by administrators and teachers.
          </Text>
        </View>
        <Pressable style={s.refresh} onPress={() => void load()}>
          <Ionicons
            name="refresh-outline"
            size={22}
            color={COLORS.primaryDark}
          />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ margin: 25 }}
        />
      ) : events.length === 0 ? (
        <View style={s.empty}>
          <Ionicons
            name="calendar-outline"
            size={40}
            color={COLORS.textSecondary}
          />
          <Text style={s.cardTitle}>No events yet</Text>
          <Text style={s.hint}>
            Create the first event using the form above.
          </Text>
        </View>
      ) : (
        events.map((ev) => (
          <View key={ev.id} style={s.eventCard}>
            <View style={s.eventHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{ev.title}</Text>
                <Text style={s.muted}>{ev.event_code}</Text>
              </View>
              <Text
                style={[
                  s.status,
                  ev.status === 'closed' ? s.closed : s.open,
                ]}
              >
                {(ev.status ?? 'open').toUpperCase()}
              </Text>
            </View>

            {ev.venue ? (
              <Text style={s.meta}>
                <Ionicons
                  name="location-outline"
                  size={15}
                  color={COLORS.textSecondary}
                />{' '}
                {ev.venue}
              </Text>
            ) : null}

            <Text style={s.meta}>
              <Ionicons
                name="time-outline"
                size={15}
                color={COLORS.textSecondary}
              />{' '}
              Starts: {dateLabel(ev.start)}
            </Text>
            <Text style={s.meta}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color={COLORS.textSecondary}
              />{' '}
              Ends: {dateLabel(ev.end)}
            </Text>

            <View style={s.eventActions}>
              <Pressable
                style={s.actionButton}
                onPress={() => setViewEvent(ev)}
              >
                <Ionicons
                  name="eye-outline"
                  size={17}
                  color={COLORS.primaryDark}
                />
                <Text style={s.actionText}>View</Text>
              </Pressable>

              <Pressable
                style={s.actionButton}
                onPress={() => edit(ev)}
              >
                <Ionicons
                  name="create-outline"
                  size={17}
                  color={COLORS.primaryDark}
                />
                <Text style={s.actionText}>Edit</Text>
              </Pressable>

              <Pressable
                style={s.actionButton}
                onPress={() =>
                  setQrPayload(
                    buildQRPayload({
                      eventId: ev.event_code,
                      title: ev.title,
                      start: ev.start,
                      end: ev.end,
                    }),
                  )
                }
              >
                <Ionicons
                  name="qr-code-outline"
                  size={17}
                  color={COLORS.primaryDark}
                />
                <Text style={s.actionText}>QR</Text>
              </Pressable>

              <Pressable
                style={s.actionButton}
                onPress={() => toggleStatus(ev)}
                disabled={saving}
              >
                <Ionicons
                  name={
                    ev.status === 'closed'
                      ? 'lock-open-outline'
                      : 'lock-closed-outline'
                  }
                  size={17}
                  color={COLORS.warning}
                />
                <Text style={[s.actionText, { color: COLORS.warning }]}>
                  {ev.status === 'closed' ? 'Reopen' : 'Close'}
                </Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <Modal
        visible={qrPayload !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setQrPayload(null)}
      >
        <View style={s.qrOverlay}>
          <ScrollView
            style={s.modalScroll}
            contentContainerStyle={s.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={s.qrCard}>
              <Pressable style={s.closeQr} onPress={() => setQrPayload(null)} accessibilityRole="button">
                <Ionicons name="close-circle" size={27} color={COLORS.textSecondary} />
              </Pressable>
              <Text style={s.formTitle}>Event QR Code</Text>
              <Text style={s.hint}>Students can scan this code to record attendance during the event.</Text>
              {qrPayload !== null ? (
                <View style={s.qrCodeFrame}>
                  <QRCode value={qrPayload} size={210} />
                </View>
              ) : null}
              <Pressable style={s.primaryButton} onPress={() => setQrPayload(null)}>
                <Text style={s.primaryText}>Done</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={viewEvent !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewEvent(null)}
      >
        <View style={s.qrOverlay}>
          <ScrollView
            style={s.modalScroll}
            contentContainerStyle={s.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {viewEvent ? (
              <View style={s.qrCard}>
                <Pressable style={s.closeQr} onPress={() => setViewEvent(null)} accessibilityRole="button">
                  <Ionicons name="close-circle" size={27} color={COLORS.textSecondary} />
                </Pressable>
                <Text style={s.formTitle}>{viewEvent.title}</Text>
                <Text style={s.meta}>Event Code: {viewEvent.event_code}</Text>
                <Text style={s.meta}>Venue: {viewEvent.venue || 'Not specified'}</Text>
                <Text style={s.meta}>Description: {viewEvent.description || 'No description provided.'}</Text>
                <Text style={s.meta}>Starts: {dateLabel(viewEvent.start)}</Text>
                <Text style={s.meta}>Ends: {dateLabel(viewEvent.end)}</Text>
                <Text style={s.meta}>Status: {(viewEvent.status ?? 'open').toUpperCase()}</Text>
                <Pressable style={s.primaryButton} onPress={() => setViewEvent(null)}>
                  <Text style={s.primaryText}>Done</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={confirmClose !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmClose(null)}
      >
        <View style={s.qrOverlay}>
          <ScrollView
            style={s.modalScroll}
            contentContainerStyle={s.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {confirmClose ? (
              <View style={s.qrCard}>
                <Pressable style={s.closeQr} onPress={() => setConfirmClose(null)} accessibilityRole="button">
                  <Ionicons name="close-circle" size={27} color={COLORS.textSecondary} />
                </Pressable>
                <Text style={s.formTitle}>
                  {confirmClose.status === 'closed' ? 'Reopen Event?' : 'Close Event?'}
                </Text>
                <Text style={s.modalCopy}>
                  {confirmClose.title} will be marked {confirmClose.status === 'closed' ? 'open' : 'closed'}.
                </Text>
                <Pressable
                  disabled={saving}
                  style={[s.primaryButton, saving && s.disabledButton]}
                  onPress={() => void confirmToggleStatus()}
                >
                  <Text style={s.primaryText}>{saving ? 'Updating...' : 'Confirm'}</Text>
                </Pressable>
                <Pressable disabled={saving} style={s.cancelButton} onPress={() => setConfirmClose(null)}>
                  <Text style={s.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 17, paddingBottom: 36 },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    marginTop: 5,
    marginBottom: 18,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 25,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 7,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    minHeight: 49,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  multiline: { minHeight: 88 },
  dateButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    minHeight: 54,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  dateText: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  webDateTimeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  webDateTimeField: { flex: 1, minWidth: 0 },
  webInputLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 5 },
  webInput: {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 49,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  quickButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
  },
  quickText: { fontSize: 12, fontWeight: '700', color: COLORS.primaryDark },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 7,
  },
  notice: {
    backgroundColor: '#E7F8EF',
    color: '#16794B',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  primaryButton: {
    marginTop: 15,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  primaryText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  disabledButton: { opacity: 0.6 },
  cancelButton: { padding: 12, alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700' },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 21, fontWeight: '800', color: COLORS.textPrimary },
  subtitleSmall: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  refresh: { padding: 10, backgroundColor: COLORS.surface, borderRadius: 12 },
  eventCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 9,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  muted: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  status: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  open: { backgroundColor: '#E7F8EF', color: '#16794B' },
  closed: { backgroundColor: '#FDEBED', color: COLORS.danger },
  eventActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 13,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
  },
  actionText: { fontSize: 11, fontWeight: '800', color: COLORS.primaryDark },
  empty: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 25,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 25, 48, 0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  modalScroll: { width: '100%', maxWidth: 560, flexGrow: 0, maxHeight: '100%' },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 4 },
  qrCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 20,
    width: '100%',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 10,
  },
  closeQr: { alignSelf: 'flex-end' },
  qrCodeFrame: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
    marginVertical: 16,
  },
  modalCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
