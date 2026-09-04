/** Minutes the check-in was after the period's scheduled start ("HH:mm"). Negative/zero = on time or early. */
export function minutesLate(slotStart: string, checkInIso: string): number {
  const [h, m] = slotStart.split(':').map(Number);
  const checkIn = new Date(checkInIso);
  const scheduled = new Date(checkIn);
  scheduled.setHours(h, m, 0, 0);
  return Math.round((checkIn.getTime() - scheduled.getTime()) / 60000);
}

export function durationMinutes(checkInIso: string, checkOutIso: string): number {
  return Math.round((new Date(checkOutIso).getTime() - new Date(checkInIso).getTime()) / 60000);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export const LATE_THRESHOLD_MIN = 3;
