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
  } | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/");
        return;
      }

      // --- THE BOUNCER: Check the user's role ---
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      // If they are not an admin, kick them back to the student dashboard
      if (profile?.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      // ------------------------------------------

      const { data, error } = await supabase
        .from("certificates")
        .select(`*, profiles (full_name, roll_number)`)
        .order("created_at", { ascending: false });

      if (!error) setCertificates(data || []);
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
      alert("Error updating status: " + error.message);
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
    link.setAttribute("download", "TKM_KIRF_Certificates.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading Dashboard...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm p-8">
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HOD Dashboard</h1>
            <p className="text-gray-500">Dept of CSE • KIRF Tracking Portal</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              Export to Excel
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                <th className="p-4 font-semibold rounded-tl-lg">
                  Student Info
                </th>
                <th className="p-4 font-semibold">Event Title</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold rounded-tr-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {certificates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No certificates uploaded yet.
                  </td>
                </tr>
              ) : (
                certificates.map((cert) => (
                  <tr
                    key={cert.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-4">
                      <p className="font-medium text-gray-900">
                        {cert.profiles?.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500 uppercase">
                        {cert.profiles?.roll_number || "N/A"}
                      </p>
                    </td>
                    <td className="p-4 text-gray-900">{cert.title}</td>
                    <td className="p-4">
                      <span className="block text-gray-900">
                        {cert.category}
                      </span>
                      <span className="text-xs text-gray-500">
                        {cert.level}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${cert.status === "verified" ? "bg-green-100 text-green-700" : cert.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}
                      >
                        {cert.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 flex gap-2">
                      <a
                        href={cert.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                      >
                        View
                      </a>
                      {cert.status === "pending" && (
                        <>
                          <button
                            onClick={() => updateStatus(cert.id, "verified")}
                            className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 rounded hover:bg-green-100"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateStatus(cert.id, "rejected")}
                            className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
                          >
                            Reject
                          </button>
                        </>
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
  );
}
