
import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isFading, setIsFading] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Sonido ACTIVADO por defecto

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
          NOTA TÉCNICA:
          Al tener sonido activado (muted={false}), es probable que los navegadores bloqueen el 'autoPlay'.
          El video podría quedarse pausado hasta que el usuario interactúe con la página si el navegador tiene políticas estrictas.
      */}
      <video 
        autoPlay 
        playsInline 
        muted={isMuted}
        className="max-w-full max-h-full w-auto h-auto object-contain mx-auto shadow-2xl"
      >
        <source src={videoUrl} type="video/mp4" />
      </video>

      {/* Controles discretos */}
      <div className="absolute bottom-8 right-8 flex flex-col sm:flex-row gap-2 sm:gap-4 z-50 items-end">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="text-white/40 hover:text-white text-[10px] font-medium tracking-[0.2em] uppercase border border-white/10 hover:border-white/50 px-4 py-2 rounded-full transition-all duration-300 backdrop-blur-sm cursor-pointer hover:bg-white/10"
          >
            {isMuted ? 'Activar Sonido' : 'Silenciar'}
          </button>

          <button 
            onClick={handleFinish}
            className="text-white/40 hover:text-white text-[10px] font-medium tracking-[0.2em] uppercase border border-white/10 hover:border-white/50 px-4 py-2 rounded-full transition-all duration-300 backdrop-blur-sm cursor-pointer hover:bg-white/10"
          >
            Saltar Intro
          </button>
      </div>
      
    </div>
  );
};

export default SplashScreen;
