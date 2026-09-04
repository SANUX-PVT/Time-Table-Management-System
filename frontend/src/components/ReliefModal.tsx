import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCcw, UserPlus } from 'lucide-react';
import { Daily } from '../api/client';
import { EmptyState } from './EmptyState';
import { backdropMotion, listItemMotion, modalMotion } from '../utils/motion';
import type { ReliefCandidate } from '../types';

export function ReliefModal({
  dailyEntryId,
  actorName,
  onClose,
  onAssigned,
}: {
  dailyEntryId: string;
  actorName: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [candidates, setCandidates] = useState<ReliefCandidate[] | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    Daily.reliefCandidates(dailyEntryId).then(setCandidates);
  }, [dailyEntryId]);

  const assign = async (teacherId: string) => {
    setAssigning(teacherId);
    try {
      await Daily.assignRelief({ dailyEntryId, reliefTeacherId: teacherId, assignedBy: actorName });
      onAssigned();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to assign relief teacher');
    } finally {
      setAssigning(null);
    }
  };

  return (
    <motion.div className="modal-backdrop" onClick={onClose} {...backdropMotion}>
      <motion.div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 520 }} {...modalMotion}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><RefreshCcw size={18} strokeWidth={2.25} /> Find Relief Teacher</h2>
        {!candidates && <p>Searching for available teachers…</p>}
        {candidates && candidates.length === 0 && <EmptyState>No available teachers found for this period.</EmptyState>}
        {candidates?.map((c, i) => (
          <motion.div className="candidate-row" key={c.teacherId} {...listItemMotion(i)}>
            <div>
              <div className="name">{c.name}</div>
              <div className="tags">
                {c.subjectQualified && <span className="badge blue">Subject qualified</span>}
                {c.gradeExperience && <span className="badge green">Grade experience</span>}
                {c.lowWorkload && <span className="badge gray">Low workload</span>}
                <span className="badge gray">{c.weeklyLoad}/{c.maxPeriodsPerWeek} periods/wk</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div className="score-pill" style={{ color: c.score >= 80 ? 'var(--green)' : c.score >= 55 ? 'var(--yellow)' : 'var(--red)' }}>
                  {c.score}%
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{c.recommendation}</div>
              </div>
              <button className="primary" disabled={assigning === c.teacherId} onClick={() => assign(c.teacherId)}>
                <UserPlus size={13} strokeWidth={2.25} /> {assigning === c.teacherId ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </motion.div>
        ))}
        <div className="modal-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
