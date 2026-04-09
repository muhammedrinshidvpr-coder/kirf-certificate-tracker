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

export default function AdvisorDashboard() {
  const router = useRouter();
  const [pendingStudents, setPendingStudents] = useState<StudentProfile[]>([]);
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

      // 1. Check if user is an advisor
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, department")
        .eq("id", session.user.id)
        .single();

      if (profile?.role !== "advisor" && profile?.role !== "senior_advisor") {
        router.push("/dashboard"); // Kick them out if not an advisor
        return;
      }

      setAdvisorInfo({ name: profile.full_name, dept: profile.department });

      // 2. Fetch all UNVERIFIED students in this advisor's department
      const { data: students, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("department", profile.department)
        .eq("role", "student")
        .eq("is_verified", false)
        .order("created_at", { ascending: false });

      if (!error && students) {
        setPendingStudents(students);
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
      `Are you sure you want to verify ${studentName}? They will be granted upload access.`,
    );
    if (!confirmApprove) return;

    // Flip the switch in the database!
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: true })
      .eq("id", studentId);

    if (error) {
      alert("Error approving student: " + error.message);
    } else {
      // Remove the student from the pending list visually
      setPendingStudents(pendingStudents.filter((s) => s.id !== studentId));
      alert(`${studentName} has been successfully verified!`);
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

        {/* PENDING STUDENTS TABLE */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            Pending Student Verifications
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
                      No pending students in {advisorInfo.dept}.
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
      </div>
    </div>
  );
}
