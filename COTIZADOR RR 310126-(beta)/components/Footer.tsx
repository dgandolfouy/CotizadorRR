
import React, { useState } from 'react';

const Footer: React.FC = () => {
    const [showLicense, setShowLicense] = useState(false);

    return (
        <footer className="w-full py-4 text-center mt-auto border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Desarrollado por <span className="font-semibold text-gray-700 dark:text-gray-300">Daniel Gandolfo</span> como proyecto personal. 
                <button 
                    onClick={() => setShowLicense(true)}
                    className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline focus:outline-none"
                >
                    Software Libre bajo licencia MIT
                </button>
            </p>

            {showLicense && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Información de Licencia</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                            Esta aplicación fue desarrollada e ideada por <strong>Daniel Gandolfo</strong> de forma independiente. 
                            Se otorga una licencia de uso gratuito y perpetuo a RR Etiquetas Uruguay S.A. para su operación interna. 
                            El código fuente base permanece como propiedad intelectual del autor bajo licencia MIT.
                        </p>
                        <div className="flex justify-end">
                            <button 
                                onClick={() => setShowLicense(false)}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm text-gray-800 dark:text-gray-200 font-medium"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </footer>
    );
};

export default Footer;
