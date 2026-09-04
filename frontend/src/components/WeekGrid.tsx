import { Fragment } from 'react';
import { useRefData } from '../context/RefDataContext';
import type { Day, MasterTimetableEntry, TimeSlot } from '../types';
import { colorFor, SLOT_TYPE_COLOR } from '../utils/colors';

const DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const DAY_LABEL: Record<Day, string> = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday' };

export function WeekGrid({
  entries,
  showClass = false,
  onCellClick,
}: {
  entries: MasterTimetableEntry[];
  showClass?: boolean;
  onCellClick?: (day: Day, slot: TimeSlot, entry: MasterTimetableEntry | null) => void;
}) {
  const rd = useRefData();

  // The Time Slot Engine's structure is the shared template for every class.
  // Days can carry different slots (e.g. Monday's Assembly, Friday's shorter
  // day), so rows are aligned by clock start-time across the week rather than
  // by raw index.
  const slotsByDay: Record<Day, TimeSlot[]> = {} as any;
  for (const day of DAYS) {
    slotsByDay[day] = rd.timeSlots.filter((s) => s.day === day).sort((a, b) => a.order - b.order);
  }
  const rowStarts = Array.from(new Set(DAYS.flatMap((d) => slotsByDay[d].map((s) => s.start)))).sort();

  const entryFor = (slotId: string) => entries.find((e) => e.periodId === slotId) ?? null;

  return (
    <div className="timetable-grid" style={{ gridTemplateColumns: `70px repeat(${DAYS.length}, 1fr)` }}>
      <div className="tt-cell head"></div>
      {DAYS.map((d) => <div key={d} className="tt-cell head">{DAY_LABEL[d]}</div>)}

      {rowStarts.map((start) => (
        <Fragment key={start}>
          <div className="tt-cell head">{start}</div>
          {DAYS.map((day) => {
            const slot = slotsByDay[day].find((s) => s.start === start);
            if (!slot) return <div key={day + start} className="tt-cell" />;
            const entry = entryFor(slot.id);
            const isLesson = entry && (entry.type === 'LESSON' || entry.type === 'ACTIVITY');
            const tone = entry ? (isLesson ? colorFor(entry.subjectId) : SLOT_TYPE_COLOR[entry.type]) : null;
            return (
              <div key={day + start} className="tt-cell">
                {entry ? (
                  <div
                    className="tt-lesson"
                    style={{ '--bg': tone!.bg, '--fg': tone!.fg, '--ring': tone!.ring, cursor: onCellClick ? 'pointer' : undefined } as any}
                    onClick={onCellClick ? () => onCellClick(day, slot, entry) : undefined}
                  >
                    {isLesson ? (
                      <>
                        <div className="subj">{rd.subjectName(entry.subjectId)}</div>
                        <div className="meta">
                          {showClass ? rd.className(entry.classId) : rd.teacherName(entry.teacherId)}
                          {entry.roomId ? ` · ${rd.roomName(entry.roomId)}` : ''}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="subj">{entry.type.charAt(0) + entry.type.slice(1).toLowerCase()}</div>
                        <div className="meta">{slot.label}</div>
                      </>
                    )}
                  </div>
                ) : (
                  <div
                    className="tt-lesson free"
                    style={{ cursor: onCellClick ? 'pointer' : undefined }}
                    onClick={onCellClick ? () => onCellClick(day, slot, null) : undefined}
                  >
                    {onCellClick ? '+ Add' : 'Free'}
                  </div>
                )}
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
