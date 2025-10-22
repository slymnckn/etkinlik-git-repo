import { useEffect, useState } from 'react';
import {
    getGrades,
    getSubjects,
    getUnits,
    getTopics,
} from '../services/education.service';
import {Grade, Subject, Topic, Unit} from "../types/education.ts";

export const useEducationStructure = () => {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [gradeRes, subjectRes, unitRes, topicRes] = await Promise.all([
                    getGrades(),
                    getSubjects(),
                    getUnits(),
                    getTopics(),
                ]);

                setGrades(gradeRes.data);
                setSubjects(subjectRes.data);
                setUnits(unitRes.data);
                setTopics(topicRes.data);
            } catch (err) {
                console.error('Eğitim verileri alınamadı:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, []);

    return {
        grades,
        subjects,
        units,
        topics,
        loading,
    };
};
