"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface StudentProfile {
  id: string;
  full_name: string;
  roll_number: string;
  department: string;
  semester: string;
  phone_number: string;
}

interface PendingCertificate {
  id: string;
  student_id: string;
  title: string;
  category: string;
  level: string;
  achievement: string;
  file_url: string;
  created_at: string;
  status: string;
  student_name?: string;
  roll_number?: string;
  semester?: string;
}

export default function AdvisorDashboard() {
  const router = useRouter();
  const [pendingStudents, setPendingStudents] = useState<StudentProfile[]>([]);
  const [pendingCertificates, setPendingCertificates] = useState<
    PendingCertificate[]
  >([]);
  const [verifiedCertificates, setVerifiedCertificates] = useState<
    PendingCertificate[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [advisorInfo, setAdvisorInfo] = useState({ name: "", dept: "" });

  useEffect(() => {
    const fetchAdvisorData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, department")
        .eq("id", session.user.id)
        .single();

      if (profile?.role !== "advisor" && profile?.role !== "senior_advisor") {
        router.push("/dashboard");
        return;
      }

      setAdvisorInfo({ name: profile.full_name, dept: profile.department });

      const { data: deptStudents } = await supabase
        .from("profiles")
        .select("*")
        .eq("department", profile.department)
        .eq("role", "student");

      if (deptStudents) {
        setPendingStudents(deptStudents.filter((s) => !s.is_verified));

        const studentIds = deptStudents.map((s) => s.id);
        const studentMap: Record<string, StudentProfile> = {};
        deptStudents.forEach((s) => {
          studentMap[s.id] = s;
        });

        if (studentIds.length > 0) {
          // Fetch ALL certificates for these students (not just pending)
          const { data: certs } = await supabase
            .from("certificates")
            .select("*")
            .in("student_id", studentIds)
            .order("created_at", { ascending: false });

          if (certs) {
            const mappedCerts = certs.map((cert) => ({
              ...cert,
              student_name: studentMap[cert.student_id].full_name,
              roll_number: studentMap[cert.student_id].roll_number,
              semester: studentMap[cert.student_id].semester,
            }));

            // Split them into two arrays for the UI
            setPendingCertificates(
              mappedCerts.filter((c) => c.status === "pending"),
            );
            setVerifiedCertificates(
              mappedCerts.filter((c) => c.status === "verified"),
            );
          }
        }
      }
      setLoading(false);
    };

    fetchAdvisorData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const approveStudent = async (studentId: string, studentName: string) => {
    const confirmApprove = window.confirm(
      `Verify ${studentName}? They will be granted upload access.`,
    );
    if (!confirmApprove) return;

    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: true })
      .eq("id", studentId);
    if (!error)
      setPendingStudents(pendingStudents.filter((s) => s.id !== studentId));
  };

  const updateCertificateStatus = async (
    certId: string,
    newStatus: "verified" | "rejected",
  ) => {
    const action = newStatus === "verified" ? "Approve" : "Reject";
    const confirmAction = window.confirm(
      `Are you sure you want to ${action} this certificate?`,
    );
    if (!confirmAction) return;

    const { error } = await supabase
      .from("certificates")
      .update({ status: newStatus })
      .eq("id", certId);

    if (!error) {
      // Find the certificate we just edited
      const certToMove = pendingCertificates.find((c) => c.id === certId);

      // Remove it from the pending list
      setPendingCertificates(
        pendingCertificates.filter((c) => c.id !== certId),
      );

      // If we verified it, instantly add it to the verified history table!
      if (newStatus === "verified" && certToMove) {
        setVerifiedCertificates([
          { ...certToMove, status: "verified" },
          ...verifiedCertificates,
        ]);
      }
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 relative z-10">
        {/* HEADER */}
        <div className="bg-white/5 backdrop-blur-lg border border-amber-500/20 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row gap-5 justify-between items-start md:items-center shadow-xl">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,1)]"></div>
              Advisor Portal
            </h1>
            <p className="text-sm text-slate-400 mt-2 font-mono">
              Faculty:{" "}
              <span className="text-amber-400">{advisorInfo.name}</span> | Dept:{" "}
              <span className="text-indigo-400">{advisorInfo.dept}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full md:w-auto px-4 py-2.5 text-sm font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all"
          >
            Disconnect
          </button>
        </div>

        {/* 1. PENDING STUDENTS TABLE */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            1. Pending Student Accounts
            <span className="bg-amber-500/20 text-amber-400 py-0.5 px-2 rounded-full text-xs border border-amber-500/30">
              {pendingStudents.length} Action(s) Required
            </span>
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-2">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-white/5 text-slate-300 text-sm border-b border-white/10">
                  <th className="p-4 font-medium whitespace-nowrap">
                    Student Name
                  </th>
                  <th className="p-4 font-medium whitespace-nowrap">
                    Roll Number
                  </th>
                  <th className="p-4 font-medium whitespace-nowrap">
                    Semester
                  </th>
                  <th className="p-4 font-medium whitespace-nowrap">
                    Phone Number
                  </th>
                  <th className="p-4 font-medium text-right whitespace-nowrap">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {pendingStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-12 text-center text-slate-500 font-mono"
                    >
                      No pending accounts in {advisorInfo.dept}.
                    </td>
                  </tr>
                ) : (
                  pendingStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4 font-medium text-white whitespace-nowrap">
                        {student.full_name}
                      </td>
                      <td className="p-4 text-slate-300 font-mono uppercase whitespace-nowrap">
                        {student.roll_number}
                      </td>
                      <td className="p-4 text-slate-300 whitespace-nowrap">
                        {student.semester}
                      </td>
                      <td className="p-4 text-slate-300 font-mono whitespace-nowrap">
                        {student.phone_number}
                      </td>
                      <td className="p-4 flex justify-end whitespace-nowrap">
                        <button
                          onClick={() =>
                            approveStudent(student.id, student.full_name)
                          }
                          className="px-4 py-2 text-xs font-bold text-emerald-950 bg-emerald-400 border border-emerald-300 rounded hover:bg-emerald-300 transition-all shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                        >
                          APPROVE PROFILE
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. PENDING CERTIFICATES TABLE */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl mt-8">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            2. Pending Certificates
            <span className="bg-indigo-500/20 text-indigo-400 py-0.5 px-2 rounded-full text-xs border border-indigo-500/30">
              {pendingCertificates.length} Submission(s) to Review
            </span>
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-2">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-white/5 text-slate-300 text-sm border-b border-white/10">
                  <th className="p-4 font-medium whitespace-nowrap">
                    Student Details
                  </th>
                  <th className="p-4 font-medium whitespace-nowrap">
                    Event Info
                  </th>
                  <th className="p-4 font-medium whitespace-nowrap">
                    Achievement
                  </th>
                  <th className="p-4 font-medium whitespace-nowrap text-center">
                    Document
                  </th>
                  <th className="p-4 font-medium text-right whitespace-nowrap">
                    Review Action
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {pendingCertificates.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-12 text-center text-slate-500 font-mono"
                    >
                      No pending certificates to review.
                    </td>
                  </tr>
                ) : (
                  pendingCertificates.map((cert) => (
                    <tr
                      key={cert.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-medium text-white">
                          {cert.student_name}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {cert.roll_number} • {cert.semester}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-medium text-slate-200">
                          {cert.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {cert.category} • {cert.level}
                        </div>
                      </td>
                      <td className="p-4 text-slate-300 whitespace-nowrap">
                        <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-xs">
                          {cert.achievement}
                        </span>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <a
                          href={cert.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded hover:bg-blue-500/20 transition-colors text-xs font-semibold"
                        >
                          View File
                        </a>
                      </td>
                      <td className="p-4 flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          onClick={() =>
                            updateCertificateStatus(cert.id, "verified")
                          }
                          className="px-3 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-400 border border-emerald-300 rounded hover:bg-emerald-300 transition-all shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                        >
                          APPROVE
                        </button>
                        <button
                          onClick={() =>
                            updateCertificateStatus(cert.id, "rejected")
                          }
                          className="px-3 py-1.5 text-xs font-bold text-rose-200 bg-rose-950 border border-rose-800 rounded hover:bg-rose-900 transition-colors"
                        >
                          REJECT
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. VERIFIED HISTORY TABLE */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl mt-8">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            3. Verified Certificates Log
            <span className="bg-emerald-500/20 text-emerald-400 py-0.5 px-2 rounded-full text-xs border border-emerald-500/30">
              {verifiedCertificates.length} Total Approved
            </span>
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-2">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-white/5 text-slate-300 text-sm border-b border-white/10">
                  <th className="p-4 font-medium whitespace-nowrap">Student</th>
                  <th className="p-4 font-medium whitespace-nowrap">
                    Roll No.
                  </th>
                  <th className="p-4 font-medium whitespace-nowrap">
                    Event Approved
                  </th>
                  <th className="p-4 font-medium whitespace-nowrap">
                    Category
                  </th>
                  <th className="p-4 font-medium whitespace-nowrap text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {verifiedCertificates.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-12 text-center text-slate-500 font-mono"
                    >
                      No certificates have been verified yet.
                    </td>
                  </tr>
                ) : (
                  verifiedCertificates.map((cert) => (
                    <tr
                      key={cert.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4 font-medium text-white whitespace-nowrap">
                        {cert.student_name}
                      </td>
                      <td className="p-4 text-slate-400 font-mono whitespace-nowrap">
                        {cert.roll_number}
                      </td>
                      <td className="p-4 text-slate-200 whitespace-nowrap">
                        {cert.title}
                      </td>
                      <td className="p-4 text-slate-400 whitespace-nowrap">
                        {cert.category}
                      </td>
                      <td className="p-4 whitespace-nowrap text-right">
                        <span className="px-3 py-1 text-[11px] font-bold tracking-wider rounded-md border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          VERIFIED
                        </span>
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
