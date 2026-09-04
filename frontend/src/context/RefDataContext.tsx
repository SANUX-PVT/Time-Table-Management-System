import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Academic, Config, Teachers } from '../api/client';
import type { Grade, GradeSubjectConfig, Room, SchoolClass, SchoolConfig, Subject, Teacher, TimeSlot } from '../types';

interface RefData {
  schoolConfig: SchoolConfig | null;
  grades: Grade[];
  classes: SchoolClass[];
  subjects: Subject[];
  gradeSubjects: GradeSubjectConfig[];
  rooms: Room[];
  teachers: Teacher[];
  timeSlots: TimeSlot[];
  loading: boolean;
  refresh: () => void;
  gradeName: (id?: string) => string;
  className: (id?: string) => string;
  subjectName: (id?: string) => string;
  teacherName: (id?: string) => string;
  roomName: (id?: string) => string;
}

const Ctx = createContext<RefData>({} as RefData);

export function RefDataProvider({ children }: { children: ReactNode }) {
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeSubjects, setGradeSubjects] = useState<GradeSubjectConfig[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      Config.get(),
      Academic.grades(),
      Academic.classes(),
      Academic.subjects(),
      Academic.gradeSubjects(),
      Academic.rooms(),
      Teachers.list(),
      Config.timeSlots(),
    ]).then(([cfg, g, c, s, gs, r, t, ts]) => {
      setSchoolConfig(cfg);
      setGrades(g);
      setClasses(c);
      setSubjects(s);
      setGradeSubjects(gs);
      setRooms(r);
      setTeachers(t);
      setTimeSlots(ts);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tick]);

  const gradeName = (id?: string) => grades.find((g) => g.id === id)?.name ?? '—';
  const className = (id?: string) => classes.find((c) => c.id === id)?.name ?? '—';
  const subjectName = (id?: string) => subjects.find((s) => s.id === id)?.name ?? '—';
  const teacherName = (id?: string) => teachers.find((t) => t.id === id)?.name ?? '—';
  const roomName = (id?: string) => rooms.find((r) => r.id === id)?.name ?? '—';

  return (
    <Ctx.Provider
      value={{
        schoolConfig,
        grades,
        classes,
        subjects,
        gradeSubjects,
        rooms,
        teachers,
        timeSlots,
        loading,
        refresh: () => setTick((t) => t + 1),
        gradeName,
        className,
        subjectName,
        teacherName,
        roomName,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useRefData = () => useContext(Ctx);
