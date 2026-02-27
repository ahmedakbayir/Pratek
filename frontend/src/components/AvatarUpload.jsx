import { Camera, X } from 'lucide-react';
import { useRef } from 'react';

export default function AvatarUpload({ value, onChange, label }) {
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Backend (server.js) şu an Base64 beklediği için dosyayı dönüştürüyoruz
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result.split(',')[1]; // Data URL kısmını atıp sadece base64'ü alıyoruz

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            data: base64Data
          }),
        });

        if (!res.ok) throw new Error('Yükleme başarısız');

        const data = await res.json();
        onChange(data.url); // Backend'den dönen /uploads/... yolunu state'e kaydeder
      } catch (err) {
        console.error("Yükleme hatası:", err);
        alert('Avatar yüklenemedi: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-2 mb-4">
      <label className="block text-sm font-medium text-surface-700 w-full">{label}</label>
      <div className="relative group">
        <div className="w-20 h-20 rounded-full bg-surface-100 border-2 border-surface-200 overflow-hidden flex items-center justify-center">
          {value ? (
            <img src={value} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-8 h-8 text-surface-400" />
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center text-xs cursor-pointer"
        >
          Değiştir
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-1 -right-1 bg-danger text-white rounded-full p-1 shadow-sm cursor-pointer"
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
    </div>
  );
}