import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'blue',
  valueColor,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub?: string;
  tone?: 'blue' | 'green' | 'red' | 'yellow';
  valueColor?: string;
}) {
  return (
    <motion.div
      className={`stat-tile tone-${tone}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="label">
        <span className={`stat-icon tone-${tone}`}><Icon size={14} strokeWidth={2.25} /></span>
        {label}
      </div>
      <div className="value" style={{ color: valueColor, overflow: 'hidden' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'inline-block' }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      {sub && <div className="sub">{sub}</div>}
    </motion.div>
  );
}
