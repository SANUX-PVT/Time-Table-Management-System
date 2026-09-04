import { useEffect, useState } from 'react';
import { CalendarPlus, DoorOpen, X } from 'lucide-react';
import { RoomBookings } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useRefData } from '../context/RefDataContext';
import { EmptyState } from '../components/EmptyState';
import type { RoomBooking } from '../types';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function RoomBookingsPage() {
  const rd = useRefData();
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [roomId, setRoomId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [periodId, setPeriodId] = useState('');
  const [purpose, setPurpose] = useState('');

  const load = () => { RoomBookings.list().then(setBookings); };
  useEffect(load, []);

  const dayPeriods = [...rd.timeSlots].sort((a, b) => a.order - b.order);

  const create = async () => {
    if (!roomId || !date || !periodId || !purpose) {
      alert('Room, date, period and purpose are all required.');
      return;
    }
    try {
      await RoomBookings.create({ roomId, date, periodId, purpose, bookedBy: currentUser?.name ?? 'Unknown' });
      setPurpose('');
      load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Booking failed');
    }
  };

  const cancel = async (id: string) => {
    await RoomBookings.cancel(id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Room & Resource Bookings</h1>
          <p>One-off bookings for shared spaces (auditorium, library, etc.) outside the regular weekly timetable.</p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>New Booking</h3>
          <div className="form-row">
            <label>Room</label>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">Select room…</option>
              {rd.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="form-row"><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="form-row">
            <label>Period</label>
            <select value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
              <option value="">Select period…</option>
              {dayPeriods.map((s) => <option key={s.id} value={s.id}>{s.day} · {s.label} ({s.start}–{s.end})</option>)}
            </select>
          </div>
          <div className="form-row"><label>Purpose</label><input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Inter-house debate rehearsal" /></div>
          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="primary" onClick={create}><CalendarPlus size={14} strokeWidth={2.25} /> Book Room</button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Upcoming Bookings</h3>
          {bookings.length === 0 ? (
            <EmptyState icon={DoorOpen}>No room bookings yet.</EmptyState>
          ) : (
            <table>
              <thead><tr><th>Date</th><th>Room</th><th>Period</th><th>Purpose</th><th>Booked By</th><th></th></tr></thead>
              <tbody>
                {bookings.map((b) => {
                  const slot = rd.timeSlots.find((s) => s.id === b.periodId);
                  return (
                    <tr key={b.id}>
                      <td>{b.date}</td>
                      <td>{rd.roomName(b.roomId)}</td>
                      <td>{slot?.label}</td>
                      <td>{b.purpose}</td>
                      <td>{b.bookedBy}</td>
                      <td><button onClick={() => cancel(b.id)}><X size={13} strokeWidth={2.25} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
