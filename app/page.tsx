"use client";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function Home() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Modern, Student-Centric Onboarding Terminal */}
      <div className="max-w-xl w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative z-10 space-y-12">
        {/* LOGO & DESCRIPTION */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center mb-8">
            {/* Logo pulls the new file you placed in the public folder */}
            <img
              src="/logo.png"
              alt="TKMCE Academic Tracker Logo"
              className="w-28 h-28 object-contain drop-shadow-[0_0_20px_rgba(79,70,229,0.3)]"
            />
          </div>

          {/* New, Clear Title: Instantly explains the app's use */}
          <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">
            TKMCE <span className="text-indigo-400">Activity Point</span>{" "}
            Tracker
          </h1>
          {/* Pro-level value proposition: Answers "why should I care?" */}
          <p className="text-lg text-slate-300 mt-4 max-w-lg mx-auto leading-relaxed">
            Manage your achievements, track your KTU activity points, and get
            verified seamlessly by your Class Advisor.
          </p>
        </div>

        {/* HOW IT WORKS: Visual onboarding for instant understanding */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center border-t border-b border-white/10 py-10">
          <div className="space-y-3">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-full mx-auto flex items-center justify-center border border-indigo-500/30 text-indigo-400 font-bold text-xl">
              1
            </div>
            <h3 className="text-white font-semibold">Login</h3>
            <p className="text-xs text-slate-400">
              Use your @tkmce.ac.in credentials to get started.
            </p>
          </div>
          <div className="space-y-3">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-full mx-auto flex items-center justify-center border border-indigo-500/30 text-indigo-400 font-bold text-xl">
              2
            </div>
            <h3 className="text-white font-semibold">Upload</h3>
            <p className="text-xs text-slate-400">
              Submit your certificates and event details for review.
            </p>
          </div>
          <div className="space-y-3">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-full mx-auto flex items-center justify-center border border-indigo-500/30 text-indigo-400 font-bold text-xl">
              3
            </div>
            <h3 className="text-white font-semibold">Track</h3>
            <p className="text-xs text-slate-400">
              Watch your points grow as your advisor verifies your submissions.
            </p>
          </div>
        </div>

        {/* GLOWING AUTHENTICATION BUTTON */}
        <div className="space-y-6">
          <button onClick={handleLogin} className="w-full relative group">
            {/* Hover Glow Effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl blur opacity-20 group-hover:opacity-50 transition duration-500"></div>

            <div className="relative flex items-center justify-center gap-3 bg-slate-900 border border-white/10 text-slate-200 font-semibold py-4.5 px-6 rounded-xl group-hover:bg-slate-800 group-hover:text-white transition-all shadow-xl">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Login with TKMCE Account
            </div>
          </button>

          <p className="text-xs text-slate-600 font-mono text-center">
            Strictly restricted to verified @tkmce.ac.in credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
