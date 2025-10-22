export interface UserFormData {
    name: string;
    email: string;
    password?: string;
    role: string;
    publisher?: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    publisher?: string;
    created_at?: string;
}
