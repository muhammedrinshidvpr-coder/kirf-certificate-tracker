"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

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
  profiles: {
    full_name: string;
    roll_number: string;
    department: string;
  } | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminDept, setAdminDept] = useState("");

  useEffect(() => {
    const fetchAdminData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, department")
        .eq("id", session.user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      setAdminDept(profile.department);

      const { data, error } = await supabase
        .from("certificates")
        .select(`*, profiles!inner (full_name, roll_number, department)`)
        .eq("profiles.department", profile.department)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Database Error:", error.message);
        alert("System Error: " + error.message);
      } else {
        setCertificates(data || []);
      }

      setLoading(false);
    };

    fetchAdminData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("certificates")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert("System Error: " + error.message);
    } else {
      setCertificates(
        certificates.map((cert) =>
          cert.id === id ? { ...cert, status: newStatus } : cert,
        ),
      );
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Student Name",
      "Roll Number",
      "Department",
      "Event Title",
      "Category",
      "Level",
      "Status",
      "Date Submitted",
      "File Link",
    ];

    const rows = certificates.map((cert) => [
      `"${cert.profiles?.full_name || "Unknown"}"`,
      `"${cert.profiles?.roll_number || "N/A"}"`,
      `"${cert.profiles?.department || "N/A"}"`,
      `"${cert.title}"`,
      `"${cert.category}"`,
      `"${cert.level}"`,
      `"${cert.status.toUpperCase()}"`,
      `"${new Date(cert.created_at).toLocaleDateString()}"`,
      `"${cert.file_url}"`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `TKM_${adminDept}_KIRF_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 relative z-10">
        {/* MOBILE OPTIMIZED HEADER */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row gap-5 justify-between items-start md:items-center shadow-xl">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,1)]"></div>
              HOD Command Center
            </h1>
            <p className="text-sm text-slate-400 mt-2 font-mono">
              Directory:{" "}
              <span className="text-indigo-400 block sm:inline mt-1 sm:mt-0">
                {adminDept}
              </span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={exportToCSV}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-emerald-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-all shadow-[0_0_15px_rgba(52,211,153,0.3)] hover:shadow-[0_0_25px_rgba(52,211,153,0.5)] border border-emerald-300"
            >
              Export to Excel
            </button>
            <button
              onClick={handleLogout}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* MOBILE OPTIMIZED TABLE (Horizontal Scroll) */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl">
          <div className="overflow-x-auto rounded-xl border border-white/10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-2">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white/5 text-slate-300 text-sm border-b border-white/10">
                  <th className="p-4 font-medium whitespace-nowrap">
                    Operative Info
                  </th>
                  <th className="p-4 font-medium whitespace-nowrap">
                    Event String
                  </th>
                  <th className="p-4 font-medium whitespace-nowrap">
                    Classification
                  </th>
                  <th className="p-4 font-medium whitespace-nowrap">
                    Network Status
                  </th>
                  <th className="p-4 font-medium text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {certificates.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-12 text-center text-slate-500 font-mono"
                    >
                      No datalogs found for {adminDept}.
                    </td>
                  </tr>
                ) : (
                  certificates.map((cert) => (
                    <tr
                      key={cert.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4 whitespace-nowrap">
                        <p className="font-medium text-white">
                          {cert.profiles?.full_name || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-500 font-mono uppercase mt-1">
                          {cert.profiles?.roll_number || "N/A"}
                        </p>
                      </td>
                      <td className="p-4 text-white font-medium whitespace-nowrap">
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
                      <td className="p-4 flex flex-col sm:flex-row gap-3 sm:justify-end items-start sm:items-center whitespace-nowrap">
                        <a
                          href={cert.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors hover:shadow-[0_0_10px_rgba(129,140,248,0.5)]"
                        >
                          [VIEW]
                        </a>
                        {cert.status === "pending" && (
                          <div className="flex gap-2 sm:border-l border-white/10 sm:pl-3 sm:ml-2">
                            <button
                              onClick={() => updateStatus(cert.id, "verified")}
                              className="px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded hover:bg-emerald-500/20 transition-all"
                            >
                              VERIFY
                            </button>
                            <button
                              onClick={() => updateStatus(cert.id, "rejected")}
                              className="px-3 py-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded hover:bg-rose-500/20 transition-all"
                            >
                              REJECT
                            </button>
                          </div>
                        )}
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
