
/** @copyright 2026 Daniel Gandolfo - Todos los derechos reservados */

import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { USERS } from '../constants';
import { EyeIcon, EyeOffIcon } from './IconComponents';
import RRLogoFullIcon from './RRLogoFullIcon';
import SplashScreen from './SplashScreen';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  // Estado para controlar la intro. Usamos sessionStorage para que salga solo 1 vez por sesión.
  const [showIntro, setShowIntro] = useState(() => {
      return !sessionStorage.getItem('rr_has_seen_intro');
  });
  
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
      if (USERS.length > 0 && !selectedUserId) {
          setSelectedUserId(USERS[0].id);
      }
  }, [selectedUserId]);

  const handleIntroFinish = () => {
      sessionStorage.setItem('rr_has_seen_intro', 'true');
      setShowIntro(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const user = USERS.find(u => u.id === selectedUserId);

    if (!user) {
        setError('Usuario no encontrado.');
        return;
    }

    if (user.password !== password) {
        setError('Contraseña incorrecta.');
        return;
    }

    onLogin(user);
  };
  
  const Asistentes = USERS.filter(u => u.role === UserRole.AsistenteComercial);
  const OtrosRoles = USERS.filter(u => u.role !== UserRole.AsistenteComercial);

  // Si la intro está activa, mostramos el SplashScreen en lugar del Login
  if (showIntro) {
      return <SplashScreen onFinish={handleIntroFinish} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors animate-fade-in">
      <div className="flex-grow flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 sm:p-8 space-y-6 sm:space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-transform duration-500 ease-out transform translate-y-0 opacity-100">
            <div className="flex flex-col items-center text-center">
                <RRLogoFullIcon className="h-32 sm:h-40 w-auto mb-6" />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Iniciar Sesión</h2>
                <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
                      Sistema RR Etiquetas
                    </p>
                </div>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              
              <div>
                <label htmlFor="user-select" className="block text-lg font-medium text-gray-700 dark:text-gray-300">
                  Seleccione su Usuario
                </label>
                <select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="mt-1 block w-full p-3 sm:p-4 text-lg border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 focus:ring-orange-500 focus:border-orange-500 text-gray-900 dark:text-white"
                >
                <option value="" disabled>-- Seleccionar --</option>
                <optgroup label="Asistentes Comerciales">
                    {Asistentes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </optgroup>
                <optgroup label="Otros Roles">
                    {OtrosRoles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </optgroup>
                </select>
              </div>

              <div>
                <label htmlFor="password"className="block text-lg font-medium text-gray-700 dark:text-gray-300">
                  Contraseña
                </label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full p-3 sm:p-4 text-lg border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 focus:ring-orange-500 focus:border-orange-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 pr-10"
                    placeholder="Contraseña..."
                  />
                   <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                    >
                      {showPassword ? <EyeOffIcon className="h-6 w-6" /> : <EyeIcon className="h-6 w-6" />}
                    </button>
                </div>
              </div>

               {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md text-base font-medium animate-pulse">
                    {error}
                </div>
            )}

              <div className="mt-6">
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 sm:py-4 px-4 border border-transparent text-lg font-bold rounded-md shadow-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all transform hover:scale-[1.02]"
                >
                  Ingresar
                </button>
              </div>
            </form>
          </div>
      </div>
    </div>
  );
};

export default Login;
