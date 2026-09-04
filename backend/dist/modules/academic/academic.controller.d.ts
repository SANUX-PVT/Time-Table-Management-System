import { StoreService } from '../../store/store.service.js';
import { Grade, GradeSubjectConfig, Room, SchoolClass, Subject } from '../../common/types.js';
export declare class AcademicController {
    private store;
    constructor(store: StoreService);
    listGrades(): Grade[];
    createGrade(body: Partial<Grade>): Grade;
    updateGrade(id: string, body: Partial<Grade>): Grade;
    deleteGrade(id: string): {
        success: boolean;
    };
    listClasses(): SchoolClass[];
    createClass(body: Partial<SchoolClass>): SchoolClass;
    updateClass(id: string, body: Partial<SchoolClass>): SchoolClass;
    deleteClass(id: string): {
        success: boolean;
    };
    listSubjects(): Subject[];
    createSubject(body: Partial<Subject>): Subject;
    updateSubject(id: string, body: Partial<Subject>): Subject;
    deleteSubject(id: string): {
        success: boolean;
    };
    listGradeSubjects(): GradeSubjectConfig[];
    createGradeSubject(body: Partial<GradeSubjectConfig>): GradeSubjectConfig;
    updateGradeSubject(id: string, body: Partial<GradeSubjectConfig>): GradeSubjectConfig;
    deleteGradeSubject(id: string): {
        success: boolean;
    };
    listRooms(): Room[];
    createRoom(body: Partial<Room>): Room;
    updateRoom(id: string, body: Partial<Room>): Room;
    deleteRoom(id: string): {
        success: boolean;
    };
}
