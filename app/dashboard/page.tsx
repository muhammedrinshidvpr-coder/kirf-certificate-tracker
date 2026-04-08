"use client";

import { useEffect, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";

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

  // Profile State
  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [semester, setSemester] = useState("");

  // Certificate Form State
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [institution, setInstitution] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("Workshop");
  const [level, setLevel] = useState("College");
  const [mode, setMode] = useState("Offline");
  const [achievement, setAchievement] = useState("Participated");
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

      // Pre-fill existing data
      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.roll_number) setRollNumber(profile.roll_number);
      if (profile?.department) setDepartment(profile.department);
      if (profile?.phone_number) setPhone(profile.phone_number);
      if (profile?.semester) setSemester(profile.semester);

      // Strict check for ALL required profile fields
      if (
        !profile ||
        !profile.full_name ||
        !profile.roll_number ||
        !profile.department ||
        !profile.phone_number ||
        !profile.semester
      ) {
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
      phone_number: phone,
      semester: semester,
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

      if (file.type.startsWith("image/")) {
        const options = {
          maxSizeMB: 0.1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        try {
          fileToUpload = await imageCompression(file, options);
        } catch (compressError) {
          console.error("Error compressing image:", compressError);
        }
      }

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
        institution: institution,
        start_date: startDate,
        end_date: endDate,
        category: category,
        level: level,
        mode: mode,
        achievement: achievement,
        file_url: publicUrlData.publicUrl,
        status: "pending",
      });

      if (dbError) throw dbError;

      alert("Certificate submitted successfully!");

      // Reset Form
      setFile(null);
      setTitle("");
      setInstitution("");
      setStartDate("");
      setEndDate("");

      await fetchMyHistory(user.id);
    } catch (error) {
      alert("Error submitting: " + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  // --- ACADEMIC ONBOARDING FORM ---
  if (needsProfile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden text-slate-200">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-xl w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 relative z-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Complete Your Profile
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Please provide your academic details to continue.
            </p>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Full Name
              </label>
              <input
                required
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 text-white placeholder-slate-500"
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Class Roll Number
                </label>
                <input
                  required
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 text-white uppercase placeholder-slate-500"
                  placeholder="e.g. B25CSB45"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Department
                </label>
                <select
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 text-white [&>option]:bg-slate-900"
                >
                  <option value="" disabled>
                    Select Branch...
                  </option>
                  <option value="Computer Science (CSE)">
                    Computer Science (CSE)
                  </option>
                  <option value="Mechanical (ME)">Mechanical (ME)</option>
                  <option value="Civil (CE)">Civil (CE)</option>
                  <option value="Electrical & Electronics (EEE)">
                    Electrical & Electronics (EEE)
                  </option>
                  <option value="Electronics & Comm (ECE)">
                    Electronics & Comm (ECE)
                  </option>
                  <option value="Chemical (CH)">Chemical (CH)</option>
                  <option value="Architecture (B.Arch)">
                    Architecture (B.Arch)
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 text-white placeholder-slate-500"
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Current Semester
                </label>
                <select
                  required
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 text-white [&>option]:bg-slate-900"
                >
                  <option value="" disabled>
                    Select Semester...
                  </option>
                  <option value="S1">Semester 1 (S1)</option>
                  <option value="S2">Semester 2 (S2)</option>
                  <option value="S3">Semester 3 (S3)</option>
                  <option value="S4">Semester 4 (S4)</option>
                  <option value="S5">Semester 5 (S5)</option>
                  <option value="S6">Semester 6 (S6)</option>
                  <option value="S7">Semester 7 (S7)</option>
                  <option value="S8">Semester 8 (S8)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl mt-2 transition-all"
            >
              Save & Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- ACADEMIC MAIN DASHBOARD ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 relative z-10">
        {/* HEADER */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row gap-5 justify-between items-start md:items-center shadow-xl">
          <div className="w-full">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,1)]"></div>
              Student Dashboard
            </h1>
            <div className="text-xs md:text-sm text-slate-400 mt-2 font-mono flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-slate-300">{fullName}</span>
              <span className="hidden sm:block w-1 h-1 bg-slate-600 rounded-full"></span>
              <span className="text-indigo-400 font-semibold">
                {department} ({semester})
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full md:w-auto px-4 py-2.5 text-sm font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all"
          >
            Logout
          </button>
        </div>

        {/* UPLOAD FORM */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-5">
            Submit New Certificate
          </h2>
          <form onSubmit={handleUpload} className="space-y-4 md:space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Event / Program Name
                </label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Hackathon 2026"
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Organizing Institution
                </label>
                <input
                  required
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. IIT Bombay"
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Start Date
                </label>
                <input
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 text-slate-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  End Date
                </label>
                <input
                  required
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 text-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Event Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 text-white [&>option]:bg-slate-900"
                >
                  <option>Workshop</option>
                  <option>Hackathon</option>
                  <option>NPTEL Course</option>
                  <option>Internship</option>
                  <option>Sports/Arts</option>
                  <option>NSS (National Service Scheme)</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 text-white [&>option]:bg-slate-900"
                >
                  <option>College</option>
                  <option>State</option>
                  <option>National</option>
                  <option>International</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 text-white [&>option]:bg-slate-900"
                >
                  <option>Offline</option>
                  <option>Online</option>
                  <option>Hybrid</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Achievement
                </label>
                <select
                  value={achievement}
                  onChange={(e) => setAchievement(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500 text-white [&>option]:bg-slate-900"
                >
                  <option>Participated</option>
                  <option>1st Prize</option>
                  <option>2nd Prize</option>
                  <option>3rd Prize</option>
                  <option>Completed / Certified</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Certificate File (PDF/Image)
                </label>
                <input
                  required
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-1.5 bg-black/40 border border-white/10 rounded-xl outline-none text-slate-300 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30 cursor-pointer"
                />
              </div>
            </div>

            <button
              disabled={uploading}
              type="submit"
              className="mt-4 md:mt-6 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all border border-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "Uploading Data..." : "Submit Certificate"}
            </button>
          </form>
        </div>

        {/* MY SUBMISSIONS TABLE */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-5">
            My Submissions
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-2">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-white/5 text-slate-300 text-sm border-b border-white/10">
                  <th className="p-4 font-medium whitespace-nowrap">
                    Event Name
                  </th>
                  <th className="p-4 font-medium whitespace-nowrap">
                    Category/Level
                  </th>
                  <th className="p-4 font-medium whitespace-nowrap">
                    Date Submitted
                  </th>
                  <th className="p-4 font-medium whitespace-nowrap">Status</th>
                  <th className="p-4 font-medium whitespace-nowrap text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {myCertificates.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-12 text-center text-slate-500 font-mono"
                    >
                      No certificates submitted yet.
                    </td>
                  </tr>
                ) : (
                  myCertificates.map((cert) => (
                    <tr
                      key={cert.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4 font-medium text-white whitespace-nowrap">
                        {cert.title}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="block text-slate-300">
                          {cert.category}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {cert.level}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 font-mono text-xs whitespace-nowrap">
                        {new Date(cert.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 text-[11px] font-bold tracking-wider rounded-md border ${
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
                      <td className="p-4 whitespace-nowrap text-right">
                        <a
                          href={cert.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors hover:underline"
                        >
                          View File
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
