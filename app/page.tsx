import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6">
      <h1 className="text-4xl font-bold mb-4">Pioneer Card Vault</h1>
      <p className="text-slate-400 mb-8 font-medium">Sports Card Vault & Scanner Tools</p>
      <Link 
        href="/scan" 
        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors shadow-lg"
      >
        Go to Card Scanner
      </Link>
    </main>
  );
}