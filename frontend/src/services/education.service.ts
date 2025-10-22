import api from './api';
import { Grade, Subject, Unit, Topic } from '../types/education';

// 🎓 GRADES
export const getGrades = () => api.get<Grade[]>('/grades');
export const createGrade = (data: { name: string }) => api.post('/grades', data);
export const updateGrade = (id: number, data: { name: string }) =>
    api.put(`/grades/${id}`, data);
export const deleteGrade = (id: number) => api.delete(`/grades/${id}`);

// SUBJECTS
export const getSubjects = () => api.get<Subject[]>('/subjects');
export const createSubject = (data: { name: string }) => api.post('/subjects', data);
export const updateSubject = (id: number, data: { name: string }) =>
    api.put(`/subjects/${id}`, data);
export const deleteSubject = (id: number) => api.delete(`/subjects/${id}`);

//  UNITS
export const getUnits = () => api.get<Unit[]>('/units');
export const createUnit = (data: { name: string; grade_id: number; subject_id: number }) =>
    api.post('/units', data);
export const updateUnit = (
    id: number,
    data: { name: string; grade_id: number; subject_id: number }
) => api.put(`/units/${id}`, data);
export const deleteUnit = (id: number) => api.delete(`/units/${id}`);

//  TOPICS
export const getTopics = () => api.get<Topic[]>('/topics');
export const createTopic = (data: { name: string; unit_id: number }) =>
    api.post('/topics', data);
export const updateTopic = (id: number, data: { name: string; unit_id: number }) =>
    api.put(`/topics/${id}`, data);
export const deleteTopic = (id: number) => api.delete(`/topics/${id}`);
