import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/LoginPage/LoginPage';
import { SignupPage } from './pages/SignupPage/SignupPage';
import { OnboardingPage } from './pages/OnboardingPage/OnboardingPage';
import { MainPage } from './pages/MainPage/MainPage';
import { ProfilePage } from './pages/ProfilePage/ProfilePage';
import { AccountPage } from './pages/AccountPage/AccountPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/" element={<MainPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
