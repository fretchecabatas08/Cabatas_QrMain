import { supabase } from './supabase';
import { getEventByCode } from './events';
import { parseQRPayload } from './qr';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  attendees: {
    studentId: string;
    scannedAt: string;
  }[];
};

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);

  if (!parsed.ok) {
    return {
      success: false,
      message: parsed.message,
    };
  }

  const payload = parsed.payload;

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

  const title = payload.title || payload.event;

  const foundEvent = await getEventByCode(payload.event);

  if (!foundEvent) {
    return {
      success: false,
      message: 'Event not found.',
      eventTitle: title,
    };
  }

  const { error: attendanceError } = await supabase
    .from('attendance')
    .insert({
      student_id: studentId,
      event_id: foundEvent.id,
      scanned_at: new Date().toISOString(),
    });

  if (attendanceError) {
    if (attendanceError.code === '23505') {
      return {
        success: false,
        message: 'Already registered for this event.',
        eventTitle: foundEvent.title || title,
      };
    }

    console.error('Attendance save error:', attendanceError);

    return {
      success: false,
      message: 'Failed to record attendance.',
      eventTitle: foundEvent.title || title,
    };
  }

  return {
    success: true,
    message: 'Attendance recorded!',
    eventTitle: foundEvent.title || title,
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

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  // Get events created by this teacher
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, start, end')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) {
    console.error('Teacher events error:', eventError);
    return [];
  }

  const eventIds = events.map((event: any) => event.id);

  if (eventIds.length === 0) {
    return [];
  }

  // Get attendance for all of the teacher's events
  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('student_id, scanned_at, event_id')
    .in('event_id', eventIds)
    .order('scanned_at', { ascending: false });

  if (attendanceError || !attendance) {
    console.error('Teacher attendance error:', attendanceError);
    return [];
  }

  // Group attendance by event
  return events.map((event: any) => {
    const rows = attendance.filter(
      (record: any) => record.event_id === event.id
    );

    return {
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start,
      endTime: event.end,
      attendeeCount: rows.length,
      attendees: rows.map((record: any) => ({
        studentId: record.student_id,
        scannedAt: record.scanned_at,
      })),
    };
  });
}

export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) {
    console.error('Teacher event summary error:', eventError);
    return [];
  }

  const eventIds = events.map((event: any) => event.id);

  if (eventIds.length === 0) {
    return [];
  }

  const { data: attRows, error: attError } = await supabase
    .from('attendance')
    .select('event_id')
    .in('event_id', eventIds);

  if (attError || !attRows) {
    console.error('Teacher attendance summary error:', attError);
    return [];
  }

  const counts: Record<string, number> = {};

  attRows.forEach((row: any) => {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  });

  return events.map((event: any) => ({
    eventId: event.id,
    eventCode: event.event_code,
    title: event.title,
    attendeeCount: counts[event.id] ?? 0,
  }));
}