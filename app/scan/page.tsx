'use client';

import { useState, ChangeEvent, FormEvent } from 'react';

// Force dynamic rendering so Vercel never caches old frontend code
export const dynamic = 'force-dynamic';

const compressImage = (file: File, maxDimension = 1024, quality = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Image compression failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function ScanPage() {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [mode, setMode] = useState<'1' | '2'>('2');

  const handleFrontChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFrontFile(file);
      setFrontPreview(URL.createObjectURL(file));
    }
  };

  const handleBackChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBackFile(file);
      setBackPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!frontFile) {
      alert('Please select a front image.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();

      const compressedFront = await compressImage(frontFile);
      formData.append('front', compressedFront, 'front.jpg');

      if (mode === '2' && backFile) {
        const compressedBack = await compressImage(backFile);
        formData.append('back', compressedBack, 'back.jpg');
      }

      const res = await fetch('/api/identify', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.details?.message || data?.error || 'Failed to scan card.');
      }

      setResult(data);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error scanning card.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Card Scanner</h1>
          <p className="text-slate-400 mt-1">Upload card images to identify</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900 p-6 rounded-xl border border-slate-800">
          <div className="flex justify-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => setMode('1')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                mode === '1' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              1 Image
            </button>
            <button
              type="button"
              onClick={() => setMode('2')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                mode === '2' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              2 Images
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-lg p-4 bg-slate-950/50">
              <label className="cursor-pointer flex flex-col items-center w-full">
                <span className="text-sm font-semibold mb-2">Front Image</span>
                {frontPreview ? (
                  <img src={frontPreview} alt="Front preview" className="max-h-48 object-contain rounded-md" />
                ) : (
                  <div className="py-8 text-slate-500 text-center">Click to upload Front</div>
                )}
                <input type="file" accept="image/*" onChange={handleFrontChange} className="hidden" />
              </label>
            </div>

            {mode === '2' && (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-lg p-4 bg-slate-950/50">
                <label className="cursor-pointer flex flex-col items-center w-full">
                  <span className="text-sm font-semibold mb-2">Back Image</span>
                  {backPreview ? (
                    <img src={backPreview} alt="Back preview" className="max-h-48 object-contain rounded-md" />
                  ) : (
                    <div className="py-8 text-slate-500 text-center">Click to upload Back</div>
                  )}
                  <input type="file" accept="image/*" onChange={handleBackChange} className="hidden" />
                </label>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 rounded-lg font-semibold transition-colors shadow-lg"
          >
            {loading ? 'Processing Images via AI...' : 'Scan Card'}
          </button>
        </form>

        {result && (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
            <h2 className="text-xl font-bold">Scan Results</h2>
            <pre className="bg-slate-950 p-4 rounded-lg overflow-x-auto text-xs text-green-400">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}