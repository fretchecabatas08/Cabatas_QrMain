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
    return { success: false, message: 'Invalid QR code.' };
  }

  const eventCode = payload.eventId || payload.event;

  if (payload.v !== 1 || !eventCode) {
    return {
      success: false,
      message: 'Not an attendance QR code.',
    };
  }

  // Find the existing event. Do not create or update it here.
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, start, end')
    .eq('event_code', eventCode)
    .maybeSingle();

  if (eventError) {
    console.error('Event lookup error:', eventError);
    return {
      success: false,
      message: 'Failed to verify event.',
    };
  }

  if (!event) {
    return {
      success: false,
      message: 'Event not found or invalid QR code.',
    };
  }

  const now = Date.now();
  const start = new Date(event.start).getTime();
  const end = new Date(event.end).getTime();

  if (now < start) {
    return {
      success: false,
      message: 'Event has not started yet.',
      eventTitle: event.title,
    };
  }

  if (now > end) {
    return {
      success: false,
      message: 'Event has already ended.',
      eventTitle: event.title,
    };
  }

  // Save attendance using the actual UUID from events.id.
  const { error: attendanceError } = await supabase
    .from('attendance')
    .insert({
      student_id: studentId,
      event_id: event.id,
      scanned_at: new Date().toISOString(),
    });

  if (attendanceError) {
    if (attendanceError.code === '23505') {
      return {
        success: false,
        message: 'Already registered for this event.',
        eventTitle: event.title,
      };
    }

    console.error('Attendance save error:', attendanceError);

    return {
      success: false,
      message: 'Failed to record attendance.',
      eventTitle: event.title,
    };
  }

  return {
    success: true,
    message: 'Attendance recorded!',
    eventTitle: event.title,
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