import { useState, useRef, useCallback } from 'react';
import { Camera, X, ZoomIn, ZoomOut } from 'lucide-react';
import Cropper from 'react-easy-crop';

// Resim yükleme ve kırpma (crop) için yardımcı fonksiyonlar
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL('image/jpeg', 0.92);
}

function readFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result), false);
    reader.readAsDataURL(file);
  });
}

export default function AvatarUpload({ value, onChange, label }) {
  const fileInputRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [uploading, setUploading] = useState(false);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      setIsCropping(true);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      e.target.value = ''; // Aynı dosyayı tekrar seçebilmek için input'u sıfırla
    }
  };

  const handleCropSave = async () => {
    try {
      setUploading(true);
      // Kırpılmış görüntüyü canvas üzerinden al
      const croppedImageBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
      const base64Data = croppedImageBase64.split(',')[1]; // Sadece data kısmını al

      // API'ye gönder
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: `avatar-${Date.now()}.jpg`,
          data: base64Data
        }),
      });

      if (!res.ok) throw new Error('Yükleme başarısız');

      const data = await res.json();
      onChange(data.url);
      setIsCropping(false);
      setImageSrc(null);
    } catch (err) {
      console.error(err);
      alert('Avatar yüklenemedi: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 mb-4">
      <label className="block text-sm font-medium text-surface-700 w-full">{label}</label>
      
      {/* Profil/Logo Önizleme Çemberi */}
      <div className="relative group">
        <div className="w-20 h-20 rounded-full bg-surface-100 border-2 border-surface-200 overflow-hidden flex items-center justify-center shadow-sm">
          {value ? (
            <img src={value} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-8 h-8 text-surface-400" />
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center text-xs font-medium cursor-pointer backdrop-blur-[1px]"
        >
          Değiştir
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-1 -right-1 bg-danger text-white rounded-full p-1 shadow-md cursor-pointer z-10 hover:bg-red-600 hover:scale-110 transition-all"
            title="Kaldır"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Resim Kırpma (Crop) Modalı */}
      {isCropping && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !uploading && setIsCropping(false)} />
          <div className="relative bg-surface-0 rounded-xl border border-surface-200 shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-surface-50/50">
              <h3 className="text-base font-semibold text-surface-900">Resmi Ayarla</h3>
              <button 
                type="button"
                onClick={() => setIsCropping(false)} 
                disabled={uploading}
                className="p-1 text-surface-400 hover:text-surface-600 rounded transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Kırpma Alanı (react-easy-crop) */}
            <div className="relative w-full h-72 bg-surface-900/10">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}          // Kare/Daire oranı (1:1)
                cropShape="round"   // Yuvarlak maske
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            {/* Modal Footer / Kontroller */}
            <div className="px-6 py-5 bg-surface-0 space-y-5">
              <div className="flex items-center gap-3">
                <ZoomOut className="w-5 h-5 text-surface-400" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.05}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 bg-surface-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <ZoomIn className="w-5 h-5 text-surface-400" />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-surface-100">
                <button 
                  type="button" 
                  onClick={() => setIsCropping(false)} 
                  disabled={uploading} 
                  className="btn-secondary"
                >
                  İptal
                </button>
                <button 
                  type="button" 
                  onClick={handleCropSave} 
                  disabled={uploading} 
                  className="btn-primary min-w-[140px] justify-center"
                >
                  {uploading ? 'Kaydediliyor...' : 'Uygula ve Kaydet'}
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}