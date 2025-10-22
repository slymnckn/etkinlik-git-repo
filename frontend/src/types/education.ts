export interface Grade {
    id: number;
    name: string;
}

export interface Subject {
    id: number;
    name: string;
}

export interface Unit {
    id: number;
    name: string;
    grade_id: number;
    subject_id: number;
}

export interface Topic {
    id: number;
    name: string;
    unit_id: number;
}
