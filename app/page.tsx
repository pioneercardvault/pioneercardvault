import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6">
      <div className="mb-6 relative w-72 h-72 md:w-96 md:h-96">
        <Image
          src="/logo.png"
          alt="Pioneer Card Vault Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
      <h1 className="text-4xl font-bold mb-2 text-center">Pioneer Card Vault</h1>
      <p className="text-slate-400 font-medium text-lg">Coming Soon</p>
    </main>
  );
}