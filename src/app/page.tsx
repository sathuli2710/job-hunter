import Dashboard from "@/components/Dashboard";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 px-4 pt-8 pb-0 md:px-8 flex flex-col justify-between">
      <div className="max-w-6xl mx-auto w-full flex-grow">
        <Dashboard />
      </div>
      <Footer />
    </main>
  );
}

