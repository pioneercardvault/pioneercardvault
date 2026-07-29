'use client';

import { useState, ChangeEvent, FormEvent, DragEvent } from 'react';

export const dynamic = 'force-dynamic';

// Compress image to 1200px max dimension for clear resolution without payload errors
const compressImage = (file: File, maxDimension = 1200, quality = 0.8): Promise<Blob> => {
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
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'1' | '2'>('2');

  const handleFiles = (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    if (fileList[0]) {
      setFrontFile(fileList[0]);
      setFrontPreview(URL.createObjectURL(fileList[0]));
    }

    if (fileList[1] && mode === '2') {
      setBackFile(fileList[1]);
      setBackPreview(URL.createObjectURL(fileList[1]));
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const clearImages = () => {
    setFrontFile(null);
    setBackFile(null);
    setFrontPreview(null);
    setBackPreview(null);
    setErrorMessage(null);
    setResult(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!frontFile) {
      alert('Please upload at least one image.');
      return;
    }

    setLoading(true);
    setResult(null);
    setErrorMessage(null);

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
        const detailStr = typeof data?.details === 'object' ? JSON.stringify(data.details, null, 2) : data?.details;
        throw new Error(`${data?.error || 'Scan failed'}${detailStr ? `\nDetails: ${detailStr}` : ''}`);
      }

      setResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error scanning card.');
    } finally {
      setLoading(false);
    }
  };

  const cardMatch = result?.detections?.[0]?.card;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Pioneer Card Scanner</h1>
          <p className="text-slate-400 mt-1">
            {mode === '2' ? 'Drag & drop front and back images together' : 'Drag & drop card image'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900 p-6 rounded-xl border border-slate-800">
          <div className="flex justify-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => {
                setMode('1');
                setBackFile(null);
                setBackPreview(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                mode === '1' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              1 Image Mode
            </button>
            <button
              type="button"
              onClick={() => setMode('2')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                mode === '2' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              2 Image Mode (Front & Back)
            </button>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition-colors min-h-[220px] ${
              isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-950/50'
            }`}
          >
            <label className="cursor-pointer flex flex-col items-center w-full">
              {!frontPreview ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-slate-300 font-medium">
                    Drag & drop {mode === '2' ? 'both card images' : 'card image'} here
                  </p>
                  <p className="text-slate-500 text-sm">
                    or <span className="text-blue-400 underline font-medium">click to browse</span>
                  </p>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center space-y-4">
                  <div className="flex gap-6 justify-center items-center flex-wrap">
                    {frontPreview && (
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-slate-400 mb-1 font-semibold uppercase">Front</span>
                        <img src={frontPreview} alt="Front preview" className="h-44 object-contain rounded-md border border-slate-700" />
                      </div>
                    )}
                    {backPreview && (
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-slate-400 mb-1 font-semibold uppercase">Back</span>
                        <img src={backPreview} alt="Back preview" className="h-44 object-contain rounded-md border border-slate-700" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Click or drop new files to replace</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                multiple={mode === '2'}
                onChange={handleFileInputChange}
                className="hidden"
              />
            </label>
          </div>

          {(frontPreview || backPreview) && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={clearImages}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors"
              >
                Clear Images
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-red-950/50 border border-red-800 rounded-lg text-red-300 text-sm whitespace-pre-wrap font-mono">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 rounded-lg font-semibold transition-colors shadow-lg"
          >
            {loading ? 'Processing Images via AI...' : 'Scan Card'}
          </button>
        </form>

        {/* Formatted Card Detection View */}
        {cardMatch && (
          <div className="bg-slate-900 p-6 rounded-xl border border-emerald-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-emerald-400">Card Identified!</h2>
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold">
                High Confidence
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-400 text-xs">Player / Card Name</p>
                <p className="font-semibold text-white text-base">{cardMatch.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Year</p>
                <p className="font-semibold text-white text-base">{cardMatch.year || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Manufacturer</p>
                <p className="font-semibold text-white text-base">{cardMatch.manufacturer || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Release</p>
                <p className="font-semibold text-white text-base">{cardMatch.releaseName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Set Name</p>
                <p className="font-semibold text-white text-base">{cardMatch.setName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Card Number</p>
                <p className="font-semibold text-white text-base">#{cardMatch.number || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Raw Response Log */}
        {result && (
          <details className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
            <summary className="cursor-pointer font-medium text-slate-400 hover:text-slate-200">
              View Raw API Response JSON
            </summary>
            <pre className="mt-3 bg-slate-950 p-4 rounded-lg overflow-x-auto text-emerald-400 font-mono">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </main>
  );
}