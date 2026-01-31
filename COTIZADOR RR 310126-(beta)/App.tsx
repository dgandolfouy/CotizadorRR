
/** @copyright 2026 Daniel Gandolfo - Todos los derechos reservados */

import React, { useState } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { User, UserRole } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import QuoteList from './components/QuoteList';
import QuoteDetail from './components/QuoteDetail';
import QuoteForm from './components/QuoteForm';
import AdminPanel from './components/AdminPanel';
import StatsDashboard from './components/StatsDashboard';
import StockDashboard from './components/StockDashboard';

interface ProtectedRouteProps {
  user: User | null;
  children: React.ReactNode;
  requireAdmin?: boolean;
  allowedRoles?: UserRole[]; // Nueva prop para filtrar por array de roles
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user, children, requireAdmin, allowedRoles }) => {
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Check Admin flag
  if (requireAdmin && user.role !== UserRole.Admin && user.role !== UserRole.Director) {
      // Permitir acceso a Director como si fuera Admin para rutas administrativas
      return <Navigate to="/" replace />;
  }

  // Check specific allowed roles list
  if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const handleLogin = (user: User) => {
    setLoggedInUser(user);
    navigate('/');
  };

  const handleLogout = () => {
    setLoggedInUser(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route
          path="/"
          element={
            <ProtectedRoute user={loggedInUser}>
              <Dashboard user={loggedInUser!} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route index element={<QuoteList />} />
          <Route path="new" element={<QuoteForm />} />
          <Route path="edit/:quoteId" element={<QuoteForm />} /> 
          <Route path="quote/:quoteId" element={<QuoteDetail />} />
          <Route path="stats" element={<StatsDashboard />} />
          
          {/* RUTA PROTEGIDA: SOLO COTIZADOR, ADMIN O DIRECTOR */}
          <Route 
            path="stock" 
            element={
                <ProtectedRoute user={loggedInUser} allowedRoles={[UserRole.Admin, UserRole.Cotizador, UserRole.Director]}>
                    <StockDashboard />
                </ProtectedRoute>
            } 
          />
          
          <Route 
            path="admin" 
            element={
                <ProtectedRoute user={loggedInUser} requireAdmin={true}>
                    <AdminPanel />
                </ProtectedRoute>
            } 
          />
        </Route>
        <Route path="*" element={<Navigate to={loggedInUser ? "/" : "/login"} replace />} />
      </Routes>
    </div>
  );
};

export default App;
