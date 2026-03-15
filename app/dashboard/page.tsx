"use client";

import { useEffect, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression"; // NEW: Compression Engine

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface Certificate {
  id: string;
  title: string;
  category: string;
  level: string;
  file_url: string;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [department, setDepartment] = useState("Computer Science (CSE)");

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Workshop");
  const [level, setLevel] = useState("College");
  const [uploading, setUploading] = useState(false);

  const [myCertificates, setMyCertificates] = useState<Certificate[]>([]);

  const fetchMyHistory = async (userId: string) => {
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .eq("student_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMyCertificates(data);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/");
        return;
      }
      setUser(session.user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "admin") {
        router.push("/admin");
        return;
      }

      if (!profile || !profile.roll_number) {
        setNeedsProfile(true);
      } else {
        await fetchMyHistory(session.user.id);
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      roll_number: rollNumber,
      department: department,
      role: "student",
    });

    if (!error) {
      setNeedsProfile(false);
      await fetchMyHistory(user.id);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;
    setUploading(true);

    try {
      let fileToUpload = file;

      // --- THE COMPRESSION ENGINE ---
      if (file.type.startsWith("image/")) {
        const options = {
          maxSizeMB: 0.1, // Forces the image to be around 100 KB
          maxWidthOrHeight: 1920, // Keeps it HD
          useWebWorker: true, // Speeds up compression
        };

        try {
          console.log("Compressing image...");
          fileToUpload = await imageCompression(file, options);
        } catch (compressError) {
          console.error("Error compressing image:", compressError);
        }
      }
      // ------------------------------

      const fileExt = fileToUpload.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(filePath, fileToUpload);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("certificates")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("certificates").insert({
        student_id: user.id,
        title: title,
        category: category,
        level: level,
        file_url: publicUrlData.publicUrl,
        status: "pending",
      });

      if (dbError) throw dbError;

      alert("Certificate uploaded successfully!");

      setFile(null);
      setTitle("");
      await fetchMyHistory(user.id);
    } catch (error) {
      alert("Error uploading: " + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // Sleek Loading Screen
  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  // --- FUTURISTIC ONBOARDING FORM ---
  if (needsProfile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden text-slate-200">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-xl w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 space-y-6 relative z-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              System Initialization
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Link your TKM coordinates to continue.
            </p>
          </div>
          <form onSubmit={saveProfile} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Operative Name
              </label>
              <input
                required
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-600 transition-all"
                placeholder="John Doe"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Internal Roll Code
                </label>
                <input
                  required
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-600 uppercase transition-all"
                  placeholder="B25 CS B 45"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Assigned Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white [&>option]:bg-slate-900 transition-all"
                >
                  <option>Computer Science (CSE)</option>
                  <option>Mechanical (ME)</option>
                  <option>Civil (CE)</option>
                  <option>Electrical & Electronics (EEE)</option>
                  <option>Electronics & Comm (ECE)</option>
                  <option>Chemical (CH)</option>
                  <option>Architecture (B.Arch)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] border border-indigo-500/50"
            >
              Establish Link
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- FUTURISTIC MAIN DASHBOARD ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 relative overflow-hidden">
      {/* Background Ambient Effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        {/* Header Glass Panel */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 flex justify-between items-center shadow-xl">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,1)]"></div>
              Student Terminal
            </h1>
            <p className="text-sm text-slate-400 mt-1 font-mono">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all"
          >
            Disconnect
          </button>
        </div>

        {/* Upload Form Glass Panel */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            Upload Node
          </h2>
          <form onSubmit={handleUpload} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Data Title
                </label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. AI Hackathon 2026"
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-600 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Encrypted File (PDF/IMG)
                </label>
                <input
                  required
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-xl outline-none text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30 cursor-pointer transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Classification
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white [&>option]:bg-slate-900 transition-all"
                >
                  <option>Workshop</option>
                  <option>Hackathon</option>
                  <option>NPTEL Course</option>
                  <option>Internship</option>
                  <option>Sports/Arts</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Clearance Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white [&>option]:bg-slate-900 transition-all"
                >
                  <option>College</option>
                  <option>State</option>
                  <option>National</option>
                  <option>International</option>
                </select>
              </div>
            </div>
            <button
              disabled={uploading}
              type="submit"
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] border border-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "Transmitting Data..." : "Transmit to HOD Server"}
            </button>
          </form>
        </div>

        {/* Database Readout Panel */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-6">
            Database Readout
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-slate-300 text-sm border-b border-white/10">
                  <th className="p-4 font-medium">Event String</th>
                  <th className="p-4 font-medium">Class/Level</th>
                  <th className="p-4 font-medium">Timestamp</th>
                  <th className="p-4 font-medium">Network Status</th>
                  <th className="p-4 font-medium">Payload</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {myCertificates.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-12 text-center text-slate-500 font-mono"
                    >
                      No datalogs found in system.
                    </td>
                  </tr>
                ) : (
                  myCertificates.map((cert) => (
                    <tr
                      key={cert.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4 font-medium text-white">
                        {cert.title}
                      </td>
                      <td className="p-4">
                        <span className="block text-slate-300">
                          {cert.category}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {cert.level}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 font-mono text-xs">
                        {new Date(cert.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        {/* Futuristic Neon Badges */}
                        <span
                          className={`px-3 py-1 text-[11px] font-bold tracking-wider rounded-md border 
                          ${
                            cert.status === "verified"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                              : cert.status === "rejected"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                          }`}
                        >
                          {cert.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4">
                        <a
                          href={cert.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors hover:shadow-[0_0_10px_rgba(129,140,248,0.5)]"
                        >
                          [ACCESS]
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
