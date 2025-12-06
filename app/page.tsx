import DebateView from "@/components/DebateView";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Perpetual Dialectic Machine
          </h1>
          <p className="text-gray-400 text-sm">
            Watch two AI agents engage in endless philosophical combat
          </p>
        </header>
        <DebateView />
      </div>
    </main>
  );
}
