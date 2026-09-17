import { supabase } from './supabase';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
};

type EventPayload = {
  v: number;
  eventId?: string;
  event?: string;
  title?: string;
  start?: string;
  end?: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  let payload: EventPayload;

  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return {
      success: false,
      message: 'Invalid QR code.',
    };
  }

  // Accept both the new "eventId" and old "event" format
  const eventId = payload.eventId || payload.event;

  if (payload.v !== 1 || !eventId) {
    return {
      success: false,
      message: 'Not an attendance QR code.',
    };
  }

  const now = Date.now();

  const start = payload.start
    ? new Date(payload.start).getTime()
    : null;

  const end = payload.end
    ? new Date(payload.end).getTime()
    : null;

  if (start !== null && Number.isNaN(start)) {
    return {
      success: false,
      message: 'Invalid event start time.',
    };
  }

  if (end !== null && Number.isNaN(end)) {
    return {
      success: false,
      message: 'Invalid event end time.',
    };
  }

  if (start !== null && now < start) {
    return {
      success: false,
      message: 'Event has not started yet.',
    };
  }

  if (end !== null && now > end) {
    return {
      success: false,
      message: 'Event has already ended.',
    };
  }

  const title = payload.title || eventId;

  // Save/update the event in Supabase
  const { error: eventError } = await supabase
    .from('events')
    .upsert(
      {
        id: eventId,
        event_code: eventId,
        title,
        start: payload.start || new Date().toISOString(),
        end: payload.end || new Date().toISOString(),
      },
      {
        onConflict: 'event_code',
      }
    );

  if (eventError) {
    console.error('Event save error:', eventError);

    return {
      success: false,
      message: 'Failed to save event.',
      eventTitle: title,
    };
  }

  // Save attendance in Supabase
  const { error: attendanceError } = await supabase
    .from('attendance')
    .insert({
      student_id: studentId,
      event_id: eventId,
      scanned_at: new Date().toISOString(),
    });

  if (attendanceError) {
    // Unique constraint means the student already scanned this event
    if (attendanceError.code === '23505') {
      return {
        success: false,
        message: 'Already registered for this event.',
        eventTitle: title,
      };
    }

    console.error('Attendance save error:', attendanceError);

    return {
      success: false,
      message: 'Failed to record attendance.',
      eventTitle: title,
    };
  }

  return {
    success: true,
    message: 'Attendance recorded!',
    eventTitle: title,
  };
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select(
      `
      id,
      event_id,
      scanned_at,
      events (
        title
      )
      `
    )
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error) {
    console.error('Attendance history error:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    eventId: row.event_id,
    eventTitle: row.events?.title || 'Unknown Event',
    scannedAt: row.scanned_at,
  }));
}

export async function createEvent(event: Event): Promise<void> {
  const { error } = await supabase
    .from('events')
    .upsert(
      {
        id: event.eventId,
        event_code: event.eventId,
        title: event.title,
        start: event.start,
        end: event.end,
      },
      {
        onConflict: 'event_code',
      }
    );

  if (error) {
    console.error('Create event error:', error);
    throw error;
  }
}