
import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isFading, setIsFading] = useState(false);

  // Enlace directo al video MP4
  const videoUrl = "https://res.cloudinary.com/dfgiqtp8l/video/upload/v1769696359/RR_-_Hecho_con_Clipchamp_1769694991722_ds5o7b.mp4";

  const handleFinish = () => {
    if (isFading) return; 
    setIsFading(true);
    // Pequeño delay para la transición de opacidad
    setTimeout(() => {
        onFinish();
    }, 700);
  };

  useEffect(() => {
    // 5 Segundos exactos y pasa al login automáticamente
    const autoSkipTimer = setTimeout(() => {
        handleFinish();
    }, 5000);

    return () => clearTimeout(autoSkipTimer);
  }, []);

  return (
    <div className={`fixed inset-0 w-full h-full bg-black z-[100] flex items-center justify-center transition-opacity duration-700 ${isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      
      {/* 
          CONFIGURACIÓN DE VIDEO:
          1. object-contain: Mantiene la proporción del video. Si sobra espacio, se verá el fondo negro (letterboxing).
          2. SIN atributo 'muted': Esto permite que suene el audio.
             NOTA: Si el navegador bloquea el autoplay con sonido, el usuario deberá interactuar con la página primero en futuras visitas,
             pero esta es la configuración correcta para solicitar sonido.
      */}
      <video 
        autoPlay 
        playsInline 
        className="max-w-full max-h-full w-auto h-auto object-contain mx-auto shadow-2xl"
      >
        <source src={videoUrl} type="video/mp4" />
      </video>

      {/* Botón discreto para saltar */}
      <button 
        onClick={handleFinish}
        className="absolute bottom-8 right-8 text-white/40 hover:text-white text-[10px] font-medium tracking-[0.2em] uppercase border border-white/10 hover:border-white/50 px-4 py-2 rounded-full transition-all duration-300 backdrop-blur-sm z-50 cursor-pointer hover:bg-white/10"
      >
        Saltar Intro
      </button>
      
    </div>
  );
};

export default SplashScreen;
