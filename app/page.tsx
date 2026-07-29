'use client';
import { useState, useRef } from 'react';

export default function Home() {
  const [imageMode, setImageMode] = useState<'1' | '2'>('2');
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  
  const [sportDatabase, setSportDatabase] = useState('Sports Cards (All)');
  const [condition, setCondition] = useState('Near Mint (NM)');
  const [startPrice, setStartPrice] = useState('0.99');
  const [skuPrefix, setSkuPrefix] = useState('PCV-');

  const [cardData, setCardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Drag & Drop Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length === 0) return;

    if (imageMode === '1') {
      setFrontFile(files[0]);
      setFrontPreview(URL.createObjectURL(files[0]));
    } else {
      if (files[0]) {
        setFrontFile(files[0]);
        setFrontPreview(URL.createObjectURL(files[0]));
      }
      if (files[1]) {
        setBackFile(files[1]);
        setBackPreview(URL.createObjectURL(files[1]));
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (imageMode === '1') {
      setFrontFile(files[0]);
      setFrontPreview(URL.createObjectURL(files[0]));
    } else {
      if (files[0]) {
        setFrontFile(files[0]);
        setFrontPreview(URL.createObjectURL(files[0]));
      }
      if (files[1]) {
        setBackFile(files[1]);
        setBackPreview(URL.createObjectURL(files[1]));
      }
    }
  };

  const handleScan = async () => {
    if (!frontFile) return alert('Please upload at least 1 card image!');
    
    setLoading(true);
    setCardData(null);

    const formData = new FormData();
    formData.append('image', frontFile);

    try {
      const response = await fetch('/api/identify', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success && data.detections && data.detections.length > 0) {
        setCardData(data.detections[0].card);
      } else {
        alert('Could not identify card details.');
      }
    } catch (error) {
      console.error(error);
      alert('Error scanning card.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Pioneer Card Vault</h1>
            <p className="text-xs text-slate-400">Sports Card Scanner & Automated Lister</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-md font-mono">
            pioneercardvault.com
          </div>
        </div>

        {/* SETUP PANEL */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">SETUP</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Database</label>
              <select 
                value={sportDatabase}
                onChange={(e) => setSportDatabase(e.target.value)}
                className="w-full bg-[#1F2937] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option>Sports Cards (All)</option>
                <option>Baseball</option>
                <option>Basketball</option>
                <option>Football</option>
                <option>Hockey</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Platform</label>
              <select className="w-full bg-[#1F2937] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                <option>eBay Fixed Price</option>
                <option>eBay Auction</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Condition</label>
              <select 
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full bg-[#1F2937] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option>Near Mint (NM)</option>
                <option>Excellent (EX)</option>
                <option>Very Good (VG)</option>
                <option>Graded (Slab)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Start Price ($)</label>
              <input 
                type="text" 
                value={startPrice} 
                onChange={(e) => setStartPrice(e.target.value)}
                placeholder="e.g. 0.99"
                className="w-full bg-[#1F2937] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">SKU Prefix</label>
              <input 
                type="text" 
                value={skuPrefix} 
                onChange={(e) => setSkuPrefix(e.target.value)}
                placeholder="Enter SKU prefix"
                className="w-full bg-[#1F2937] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* UPLOAD & DRAG DROP ZONE */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
          
          {/* Mode Selector Toggle */}
          <div className="flex justify-center">
            <div className="bg-[#1F2937] p-1 rounded-lg flex space-x-1 border border-slate-700 text-xs font-semibold">
              <button 
                onClick={() => setImageMode('1')}
                className={`px-4 py-1.5 rounded-md transition-all ${imageMode === '1' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                1 Image
              </button>
              <button 
                onClick={() => setImageMode('2')}
                className={`px-4 py-1.5 rounded-md transition-all ${imageMode === '2' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                2 Images
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400">
            Current mode: {imageMode === '1' ? 'Front Only' : 'Front and Back'}
          </p>

          {/* Drag & Drop Target Box */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-950/20' 
                : 'border-slate-700 bg-[#172033] hover:border-slate-500'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileInput} 
              multiple={imageMode === '2'}
              accept="image/*" 
              className="hidden" 
            />

            {/* Render Image Previews inside the Dropzone if uploaded */}
            {(frontPreview || backPreview) ? (
              <div className="flex space-x-4 mb-4">
                {frontPreview && (
                  <div className="text-center">
                    <img src={frontPreview} alt="Front" className="h-32 object-contain rounded border border-slate-700" />
                    <span className="text-[10px] text-slate-400 mt-1 block">Front</span>
                  </div>
                )}
                {backPreview && imageMode === '2' && (
                  <div className="text-center">
                    <img src={backPreview} alt="Back" className="h-32 object-contain rounded border border-slate-700" />
                    <span className="text-[10px] text-slate-400 mt-1 block">Back</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <svg className="w-10 h-10 mx-auto text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-semibold text-slate-200">
                  <span className="text-indigo-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500">
                  {imageMode === '1' ? 'Upload 1 front image' : 'Upload 2 images (Front & Back)'}
                </p>
              </div>
            )}
          </div>

          <button 
            onClick={handleScan}
            disabled={loading || !frontFile}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-lg"
          >
            {loading ? 'Processing Images via AI...' : 'Scan & Identify Inventory'}
          </button>
        </div>

        {/* RESULTS PANEL */}
        {cardData && (
          <div className="bg-[#111827] border border-indigo-900/50 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-2">
              Identified Item
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-[#1F2937] p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">Player</span>
                <span className="font-bold text-white text-sm">{cardData.name}</span>
              </div>
              <div className="bg-[#1F2937] p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">Year / Brand</span>
                <span className="font-semibold text-slate-200">{cardData.year} {cardData.manufacturer} {cardData.releaseName}</span>
              </div>
              <div className="bg-[#1F2937] p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">Set</span>
                <span className="font-semibold text-slate-200">{cardData.setName}</span>
              </div>
              <div className="bg-[#1F2937] p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">Card #</span>
                <span className="font-semibold text-slate-200">#{cardData.number}</span>
              </div>
            </div>

            <div className="bg-[#172033] p-4 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Generated Listing Title</span>
              <p className="font-mono text-xs font-bold text-emerald-400">
                {cardData.year} {cardData.manufacturer} {cardData.releaseName} {cardData.name} #{cardData.number} {cardData.setName !== 'Base Set' ? cardData.setName : ''}
              </p>
            </div>

            <button 
              onClick={() => alert(`Listing created! Configured for ${condition} at $${startPrice}`)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-all cursor-pointer shadow"
            >
              Push Listing to eBay
            </button>
          </div>
        )}

      </div>
    </div>
  );
}