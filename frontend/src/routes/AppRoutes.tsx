// src/routes/AppRoutes.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { FC, ReactElement } from 'react';
import Layout from '../components/layout/Layout';
import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import QuestionList from '../pages/questions/QuestionList';
import AddQuestion from '../pages/questions/AddQuestion';
import GameList from '../pages/games/GameList';
import GameDetail from '../pages/games/GameDetail';
import ExportList from '../pages/exports/ExportList';
import CreateExport from '../pages/exports/CreateExport';
import Settings from '../pages/settings/Settings'
import Advertisements from '../pages/advertisements/Advertisements'; // Yeni reklam sayfası import'u
import QuestionGroupList from '../pages/question-groups/QuestionGroupList';
import AddQuestionGroup from '../pages/question-groups/AddQuestionGroup';
import QuestionGroupDetail from '../pages/question-groups/QuestionGroupDetail';
import EditQuestionGroup from '../pages/question-groups/EditQuestionGroup';
import CategoryList from '../pages/categories/CategoryList';
import AddEditCategory from '../pages/categories/AddEditCategory';
import UserManagement from "../pages/user-management/UserManagement.tsx";
import UserAddEdit from "../pages/user-management/UserAddEdit.tsx";
import GradeList from "../pages/grades/GradeList.tsx";
import AddEditGrade from "../pages/grades/AddEditGrade.tsx";
import SubjectList from "../pages/subjects/SubjectList.tsx";
import AddEditSubject from "../pages/subjects/AddEditSubject.tsx";
import UnitList from "../pages/units/UnitList.tsx";
import AddEditUnit from "../pages/units/AddEditUnit.tsx";
import TopicList from "../pages/topics/TopicList.tsx";
import AddEditTopic from "../pages/topics/AddEditTopic.tsx";
import TopluSoruEkleme from "../pages/questions/TopluSoruEkleme.tsx";
import ExcelSoruImport from "../pages/questions/ExcelSoruImport.tsx";
import PublisherList from '../pages/publishers/PublisherList.tsx';
import RoleGuard from '../components/auth/RoleGuard'; // Yeni eklenen

// AuthGuard: Kimlik doğrulama gerektiren rotalar için koruma
interface AuthGuardProps {
    children: ReactElement;
}

const AuthGuard: FC<AuthGuardProps> = ({ children }) => {
    const isAuthenticated = !!localStorage.getItem('auth_token');

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return children;
};

// GuestGuard: Sadece kimlik doğrulama yapmamış kullanıcılar için
interface GuestGuardProps {
    children: ReactElement;
}

const GuestGuard: FC<GuestGuardProps> = ({ children }) => {
    const isAuthenticated = !!localStorage.getItem('auth_token');

    if (isAuthenticated) {
        return <Navigate to="/" />;
    }

    return children;
};

const AppRoutes = () => {
    return (
        <Routes>
            {/* Public routes */}
            <Route
                path="/login"
                element={
                    <GuestGuard>
                        <Login />
                    </GuestGuard>
                }
            />

            {/* Protected routes */}
            <Route
                path="/"
                element={
                    <AuthGuard>
                        <Layout />
                    </AuthGuard>
                }
            >
                <Route index element={<Dashboard />} />
                <Route path="questions" element={<QuestionList />} />
                <Route path="questions/add" element={<AddQuestion />} />
                <Route path="questions/:id/edit" element={<AddQuestion />} />
                <Route path="/questions/bulk-add" element={<TopluSoruEkleme />} />
                <Route path="/questions/excel-import" element={<ExcelSoruImport />} />
                <Route path="games" element={<GameList />} />
                <Route path="games/:id" element={<GameDetail />} />
                <Route path="exports" element={<ExportList />} />
                <Route path="exports/create" element={<CreateExport />} />
                <Route path="settings" element={<Settings />} />
                <Route path="advertisements" element={<Advertisements />} /> {/* Yeni reklam sayfası */}
                <Route path="question-groups" element={<QuestionGroupList />} />
                <Route path="question-groups/add" element={<AddQuestionGroup />} />
                <Route path="question-groups/:id" element={<QuestionGroupDetail />} />
                <Route path="question-groups/:id/edit" element={<EditQuestionGroup />} />
                <Route path="categories" element={<CategoryList />} />
                <Route path="categories/add" element={<AddEditCategory />} />
                <Route path="categories/:id/edit" element={<AddEditCategory />} />

                {/* USER MANAGEMENT - Sadece editor rolü erişebilir */}
                <Route
                    path="/user-management"
                    element={
                        <RoleGuard allowedRoles={['editor']}>
                            <UserManagement />
                        </RoleGuard>
                    }
                />
                <Route
                    path="/user-management/add"
                    element={
                        <RoleGuard allowedRoles={['editor']}>
                            <UserAddEdit />
                        </RoleGuard>
                    }
                />
                <Route
                    path="/user-management/edit/:id"
                    element={
                        <RoleGuard allowedRoles={['editor']}>
                            <UserAddEdit />
                        </RoleGuard>
                    }
                />

                <Route path="/grades" element={<GradeList />} />
                <Route path="/grades/add" element={<AddEditGrade />} />
                <Route path="/grades/edit/:id" element={<AddEditGrade />} />
                <Route path="/subjects" element={<SubjectList />} />
                <Route path="/subjects/add" element={<AddEditSubject />} />
                <Route path="/subjects/edit/:id" element={<AddEditSubject />} />
                <Route path="/units" element={<UnitList />} />
                <Route path="/units/add" element={<AddEditUnit />} />
                <Route path="/units/edit/:id" element={<AddEditUnit />} />
                <Route path="/topics" element={<TopicList />} />
                <Route path="/topics/add" element={<AddEditTopic />} />
                <Route path="/topics/edit/:id" element={<AddEditTopic />} />
                <Route path="/publishers" element={<PublisherList />} />
                {/* Other protected routes will go here */}
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
};

export default AppRoutes;