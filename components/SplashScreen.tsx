
import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isFading, setIsFading] = useState(false);

  // Usamos el enlace directo MP4 para tener control total del diseño y evitar la interfaz del player de Cloudinary.
  const videoUrl = "https://res.cloudinary.com/dfgiqtp8l/video/upload/v1769696359/RR_-_Hecho_con_Clipchamp_1769694991722_ds5o7b.mp4";

  const handleFinish = () => {
    if (isFading) return; 
    setIsFading(true);
    setTimeout(() => {
        onFinish();
    }, 700);
  };

  useEffect(() => {
    // 5 Segundos exactos y pasa al login
    const autoSkipTimer = setTimeout(() => {
        handleFinish();
    }, 5000);

    return () => clearTimeout(autoSkipTimer);
  }, []);

  return (
    <div className={`fixed inset-0 w-full h-full bg-black z-[100] flex items-center justify-center transition-opacity duration-700 ${isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      
      {/* 
          CAMBIOS CLAVE PARA CELULAR/DESKTOP:
          1. max-h-full y max-w-full: El video nunca excederá el tamaño de la ventana.
          2. object-contain: Esto es MÁGICO. Ajusta el video para que se vea COMPLETO dentro de la pantalla 
             sin recortar nada y sin estirarse ("reventarse").
          3. El contenedor padre (div) tiene bg-black, por lo que el espacio sobrante será negro automáticamente.
      */}
      <video 
        autoPlay 
        muted 
        playsInline 
        className="max-w-full max-h-full w-auto h-auto object-contain mx-auto"
      >
        <source src={videoUrl} type="video/mp4" />
      </video>

      <button 
        onClick={handleFinish}
        className="absolute bottom-8 right-8 text-white/40 hover:text-white text-[10px] font-medium tracking-[0.2em] uppercase border border-white/10 hover:border-white/50 px-4 py-2 rounded-full transition-all duration-300 backdrop-blur-sm z-50"
      >
        Saltar Intro
      </button>
      
    </div>
  );
};

export default SplashScreen;
