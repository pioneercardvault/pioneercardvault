'use client';

import { useState, ChangeEvent, FormEvent, DragEvent } from 'react';

export const dynamic = 'force-dynamic';

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

export default function CardListerPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Setup State
  const [database, setDatabase] = useState('Sports Trading Cards');
  const [platform, setPlatform] = useState('eBay Fixed Price');
  const [defaultCondition, setDefaultCondition] = useState('Near Mint (NM)');
  const [startPrice, setStartPrice] = useState('');
  const [skuPrefix, setSkuPrefix] = useState('CS-');

  // Upload State
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Results State
  const [result, setResult] = useState<any>(null);
  const [cardTitle, setCardTitle] = useState('');
  const [listingPrice, setListingPrice] = useState('');
  const [generatedSku, setGeneratedSku] = useState('');
  const [itemSpecifics, setItemSpecifics] = useState<Record<string, string>>({});

  const handleFiles = (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    if (fileList[0]) {
      setFrontFile(fileList[0]);
      setFrontPreview(URL.createObjectURL(fileList[0]));
    }
    if (fileList[1]) {
      setBackFile(fileList[1]);
      setBackPreview(URL.createObjectURL(fileList[1]));
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handleProcessCard = async (e: FormEvent) => {
    e.preventDefault();
    if (!frontFile) {
      alert('Please select or drop at least one card image.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      const compressedFront = await compressImage(frontFile);
      formData.append('front', compressedFront, 'front.jpg');

      if (backFile) {
        const compressedBack = await compressImage(backFile);
        formData.append('back', compressedBack, 'back.jpg');
      }

      const res = await fetch('/api/identify', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.details?.message || data?.error || 'Failed to identify card');
      }

      setResult(data);

      const card = data?.detections?.[0]?.card;
      if (card) {
        // Use AI-generated title and specifics if present, else construct full title
        if (data?.ebayPreFill) {
          setCardTitle(data.ebayPreFill.title || '');
          setItemSpecifics(data.ebayPreFill.itemSpecifics || {});
        } else {
          const fallbackTitle = `${card.year} ${card.manufacturer} ${card.releaseName} ${card.name} #${card.number} Baseball Card`.slice(0, 80);
          setCardTitle(fallbackTitle);
        }

        setListingPrice(startPrice || '0.99');
        setGeneratedSku(`${skuPrefix}${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
      }

      setStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing card.');
    } finally {
      setLoading(false);
    }
  };

  const handleSpecificChange = (key: string, value: string) => {
    setItemSpecifics((prev) => ({ ...prev, [key]: value }));
  };

  const cardMatch = result?.detections?.[0]?.card;
  const searchQuery = cardMatch ? encodeURIComponent(`${cardMatch.year} ${cardMatch.manufacturer} ${cardMatch.name} ${cardMatch.number}`) : '';

  const openEbayActive = () => {
    window.open(`https://www.ebay.com/sch/i.html?_nkw=${searchQuery}`, '_blank');
  };

  const openEbaySold = () => {
    window.open(`https://www.ebay.com/sch/i.html?_nkw=${searchQuery}&LH_Sold=1&LH_Complete=1`, '_blank');
  };

  return (
    <main className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Ungraded Cards Lister</h1>
            <p className="text-slate-400 text-xs mt-1">Upload card images and match them automatically to eBay item specs.</p>
          </div>
          <div className="text-xs text-slate-400">
            Config: <span className="bg-slate-800 px-2 py-1 rounded text-white font-medium">Default</span>
          </div>
        </div>

        {/* 3-Step Wizard Navigation */}
        <div className="flex items-center gap-4 text-sm font-semibold">
          <button
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
              step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-black/30 text-xs">1</span> Configure
          </button>
          <div className="w-8 h-[2px] bg-slate-800"></div>
          <button
            onClick={() => setStep(2)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
              step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-black/30 text-xs">2</span> Upload
          </button>
          <div className="w-8 h-[2px] bg-slate-800"></div>
          <button
            onClick={() => result && setStep(3)}
            disabled={!result}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
              step === 3 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 opacity-50'
            }`}
          >
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-black/30 text-xs">3</span> Results
          </button>
        </div>

        {/* STEP 1: CONFIGURE */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Setup</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Config Page</label>
                  <select className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-sm text-white">
                    <option>Default</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Database</label>
                  <select
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  >
                    <option>Sports Trading Cards</option>
                    <option>English Pokemon</option>
                    <option>Baseball Cards</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  >
                    <option>eBay Fixed Price</option>
                    <option>eBay Auctions</option>
                    <option>Shopify</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Listing Defaults</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Condition</label>
                  <select
                    value={defaultCondition}
                    onChange={(e) => setDefaultCondition(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  >
                    <option>Near Mint (NM)</option>
                    <option>Lightly Played (LP)</option>
                    <option>Moderately Played (MP)</option>
                    <option>Heavily Played (HP)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Price (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 0.99"
                    value={startPrice}
                    onChange={(e) => setStartPrice(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">SKU Prefix</label>
                  <input
                    type="text"
                    value={skuPrefix}
                    onChange={(e) => setSkuPrefix(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-sm transition-colors shadow-lg"
              >
                Next: Upload Cards &rarr;
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: UPLOAD */}
        {step === 2 && (
          <form onSubmit={handleProcessCard} className="space-y-6">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-colors min-h-[260px] ${
                isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-[#111827]'
              }`}
            >
              <label className="cursor-pointer flex flex-col items-center w-full">
                {!frontPreview ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-slate-200 font-semibold text-lg">Drag & drop card images here</p>
                    <p className="text-slate-400 text-sm">Upload front & back together or click to browse</p>
                  </div>
                ) : (
                  <div className="flex gap-6 justify-center items-center">
                    {frontPreview && (
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-slate-400 mb-1">Front Image</span>
                        <img src={frontPreview} alt="Front" className="h-48 object-contain rounded border border-slate-700" />
                      </div>
                    )}
                    {backPreview && (
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-slate-400 mb-1">Back Image</span>
                        <img src={backPreview} alt="Back" className="h-48 object-contain rounded border border-slate-700" />
                      </div>
                    )}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                  className="hidden"
                />
              </label>
            </div>

            {errorMessage && (
              <div className="p-4 bg-red-950/50 border border-red-800 rounded-lg text-red-300 text-sm font-mono">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium"
              >
                &larr; Back to Setup
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 rounded-lg font-semibold text-sm transition-colors shadow-lg"
              >
                {loading ? 'Analyzing Card & Generating Full Specifics...' : 'Process Card & Generate Listing'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: RESULTS & FULL ITEM SPECIFICS */}
        {step === 3 && cardMatch && (
          <div className="space-y-6">
            
            {/* Format Selector Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-semibold">
              <button className="px-3 py-1.5 bg-blue-600 text-white rounded-md">eBay Fixed Price</button>
              <button className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-md hover:bg-slate-700">eBay Auctions</button>
              <button className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-md hover:bg-slate-700">Shopify</button>
              <button className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-md hover:bg-slate-700">TCGPlayer</button>
            </div>

            {/* Main Workstation Card Row */}
            <div className="bg-[#111827] rounded-xl border border-slate-800 p-4 space-y-4">
              
              {/* Title Input (Targeting 80 Chars) */}
              <div className="flex items-center gap-3 bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2">
                <input
                  type="text"
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  maxLength={80}
                  className="w-full bg-transparent text-white text-sm font-semibold focus:outline-none"
                />
                <span className={`text-xs font-mono shrink-0 ${cardTitle.length > 80 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {cardTitle.length}/80
                </span>
              </div>

              {/* Grid: Images, Metadata, Inputs, Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                
                {/* Image Previews */}
                <div className="lg:col-span-3 flex gap-2 justify-center bg-[#0b0f19] p-2 rounded-lg border border-slate-800">
                  {frontPreview && (
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Uploaded</span>
                      <img src={frontPreview} alt="Uploaded" className="h-32 object-contain rounded mt-1" />
                    </div>
                  )}
                  <div className="text-center">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold">Match</span>
                    <img src={frontPreview} alt="Match" className="h-32 object-contain rounded mt-1 border border-emerald-500/30" />
                  </div>
                </div>

                {/* Database Metadata */}
                <div className="lg:col-span-3 space-y-1 text-xs bg-[#0b0f19] p-3 rounded-lg border border-slate-800">
                  <p><span className="text-slate-500">Name:</span> <strong className="text-white">{cardMatch.name}</strong></p>
                  <p><span className="text-slate-500">Manufacturer:</span> {cardMatch.manufacturer}</p>
                  <p><span className="text-slate-500">Set:</span> {cardMatch.releaseName || cardMatch.setName}</p>
                  <p><span className="text-slate-500">Year:</span> {cardMatch.year}</p>
                  <p><span className="text-slate-500">Card #:</span> #{cardMatch.number}</p>
                </div>

                {/* Form Inputs */}
                <div className="lg:col-span-3 grid grid-cols-2 gap-2 bg-[#0b0f19] p-3 rounded-lg border border-slate-800 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Price ($)</label>
                    <input
                      type="text"
                      value={listingPrice}
                      onChange={(e) => setListingPrice(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Condition</label>
                    <select
                      value={defaultCondition}
                      onChange={(e) => setDefaultCondition(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-white"
                    >
                      <option>NM</option>
                      <option>LP</option>
                      <option>MP</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-slate-400 block mb-1">SKU</label>
                    <input
                      type="text"
                      value={generatedSku}
                      onChange={(e) => setGeneratedSku(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 font-mono"
                    />
                  </div>
                </div>

                {/* eBay Comp Actions */}
                <div className="lg:col-span-3 flex flex-col gap-2">
                  <button
                    onClick={openEbayActive}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold text-xs transition-colors"
                  >
                    🔍 View Active Listings
                  </button>
                  <button
                    onClick={openEbaySold}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-xs transition-colors"
                  >
                    💰 View Sold Comps
                  </button>
                  <button
                    onClick={() => {
                      setStep(2);
                      setFrontFile(null);
                      setBackFile(null);
                      setFrontPreview(null);
                      setBackPreview(null);
                    }}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold text-xs"
                  >
                    Scan Next Card
                  </button>
                </div>

              </div>

              {/* Full eBay Item Specifics Grid */}
              {Object.keys(itemSpecifics).length > 0 && (
                <div className="pt-4 border-t border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Prefilled eBay Item Specifics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {Object.entries(itemSpecifics).map(([key, value]) => (
                      <div key={key} className="bg-[#0b0f19] p-2 rounded border border-slate-800">
                        <label className="block text-slate-500 text-[10px] mb-0.5">{key}</label>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleSpecificChange(key, e.target.value)}
                          className="w-full bg-transparent text-white focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </main>
  );
}