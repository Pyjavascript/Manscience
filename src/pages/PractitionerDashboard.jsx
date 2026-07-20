import React, { useState, useEffect } from "react";
import {
  FaUserMd,
  FaClipboardList,
  FaBrain,
  FaSignOutAlt,
  FaSync,
  FaUserCircle,
  FaGraduationCap,
  FaBriefcase,
  FaEnvelope,
  FaLock,
  FaDownload,
  FaFilePdf,
} from "react-icons/fa";
import { supabase } from "../supabase";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const PractitionerLogin = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    try {
      setAuthLoading(true);
      setErrorMessage("");

      const cleanEmail = email.trim().toLowerCase();

      // 1. Authenticate credentials against Supabase Auth engine
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

      if (authError) throw authError;

      // 2. Look up by either user_id OR clean email string for robust verification
      const { data: practitioner, error: pError } = await supabase
        .from("practitioners")
        .select("*")
        .or(`user_id.eq.${authData.user?.id},email.ilike.${cleanEmail}`)
        .maybeSingle();

      if (pError || !practitioner) {
        await supabase.auth.signOut();
        throw new Error(
          "Access Denied: This account is not listed in our practitioner records.",
        );
      }

      if (practitioner.status !== "live") {
        await supabase.auth.signOut();
        throw new Error(
          `Access Suspended: Your application status is currently '${practitioner.status}'.`,
        );
      }

      // 3. Pass profile structure upward to initialize the dashboard session view
      onLoginSuccess(authData.user, practitioner);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-3xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <FaUserMd size={26} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Practitioner Portal
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Provide your system credentials to access patient cases
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSignInSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 px-1">
              Registered Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <FaEnvelope size={14} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3 pl-10 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 px-1">
              Temporary Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <FaLock size={14} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3 pl-10 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            disabled={authLoading}
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition text-sm disabled:opacity-60 cursor-pointer"
          >
            {authLoading ? "Authenticating Session..." : "Secure Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- MAIN PRACTITIONER DASHBOARD COMPONENT MODULE ---
const PractitionerDashboard = () => {
  const [sessionUser, setSessionUser] = useState(null);
  const [practitionerProfile, setPractitionerProfile] = useState(null);
  const [assignedCases, setAssignedCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState("cases");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const fetchPractitionerWorkspaceContext = async (profileId) => {
    const targetId = profileId || practitionerProfile?.id;
    if (!targetId) return;

    try {
      setLoading(true);

      // 1. Pull relational cases assigned to this practitioner
      const { data: cases, error: caseErr } = await supabase
        .from("practitioner_roadmap_assignments")
        .select(
          `
          id,
          assigned_at,
          user_id,
          roadmap_id
        `,
        )
        .eq("practitioner_id", targetId)
        .order("assigned_at", { ascending: false });

      if (caseErr) throw caseErr;

      // 2. Fetch roadmap data AND matching user profile properties data inside one lookup
      if (cases && cases.length > 0) {
        const compiledCases = await Promise.all(
          cases.map(async (c) => {
            // Fetch roadmap details from user_roadmap_mapped using the user_id column
            const { data: roadmapDetails } = await supabase
              .from("user_roadmap_mapped")
              .select("*")
              .eq("user_id", c.user_id)
              .maybeSingle();

            // Fetch name and email records details from public.users table
            const { data: userDetails } = await supabase
              .from("users")
              .select("name, email")
              .eq("id", c.user_id)
              .maybeSingle();

            return {
              ...c,
              roadmap: roadmapDetails || null,
              userProfile: userDetails || {
                name: "ManaScience Patient",
                email: "N/A",
              },
            };
          }),
        );

        setAssignedCases(compiledCases.filter((item) => item.roadmap !== null));
      } else {
        setAssignedCases([]);
      }
    } catch (err) {
      console.error(
        "Error building practitioner state synchronization pipeline:",
        err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (authUser, profileData) => {
    setSessionUser(authUser);
    setPractitionerProfile(profileData);
    fetchPractitionerWorkspaceContext(profileData.id);
  };

  const handleSignOutAction = async () => {
    await supabase.auth.signOut();
    setSessionUser(null);
    setPractitionerProfile(null);
    setAssignedCases([]);
    setSelectedCase(null);
  };

  useEffect(() => {
    const checkActiveSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("practitioners")
          .select("*")
          .eq("email", session.user.email)
          .eq("status", "live")
          .maybeSingle();

        if (profile) {
          setSessionUser(session.user);
          setPractitionerProfile(profile);
          fetchPractitionerWorkspaceContext(profile.id);
        }
      }
    };
    checkActiveSession();
  }, []);

  // Translates shortcode identifiers to clear descriptive strings
  const getFullClassification = (code) => {
    if (!code) return "Unclassified";
    const clean = code.toUpperCase().trim();
    if (clean === "NT" || clean === "NEUROTYPICAL")
      return "Neurotypical";
    if (clean === "ND" || clean === "NEURODIVERGENT")
      return "Neurodivergent";
    return code;
  };

  // Helper method for generating the PDF instance
  const buildPdfDoc = (userProfile, roadmapData) => {
    const doc = new jsPDF();

    // Top Header Banner
    doc.setFillColor(5, 150, 105); // Emerald accent #059669
    doc.rect(0, 0, 210, 40, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("PATIENT COGNITIVE ROADMAP", 15, 26);

    // Patient Information Section
    doc.setFontSize(11);
    doc.setTextColor(34, 34, 34);
    doc.text("PATIENT DEMOGRAPHICS SUMMARY", 15, 54);

    doc.setFont("helvetica", "normal");
    doc.text(`Patient Name : ${userProfile?.name || "ManaScience Patient"}`, 15, 64);
    doc.text(`Patient Email: ${userProfile?.email || "N/A"}`, 15, 72);

    const classificationLabel = getFullClassification(roadmapData?.classification);
    doc.setFont("helvetica", "bold");
    doc.text(`Classification: ${classificationLabel}`, 15, 84);

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 92, 195, 92);

    // Domain Breakdown Table
    doc.setFont("helvetica", "bold");
    doc.text("Domain Breakdown Results", 15, 104);

    const mappedDomainsArray = roadmapData?.mapped_domains || [];
    const tableRows = mappedDomainsArray.map((item) => [
      item.domain || "General Domain",
      item.domain_type || "N/A",
      `${item.score ?? 0}%`,
      item.severity || "Low",
    ]);

    autoTable(doc, {
      startY: 110,
      head: [["Assessment Domain", "Domain Type", "Score", "Severity"]],
      body: tableRows,
      headStyles: { fillColor: [5, 150, 105], fontStyle: "bold" },
      bodyStyles: { font: "helvetica", fontSize: 10 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 15, right: 15 },
      theme: "striped",
    });

    // Aggregated Therapies Summary
    const finalY = doc.lastAutoTable.finalY || 180;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Aggregated Interventions Summary:", 15, finalY + 12);

    const aggregatedTherapies = roadmapData?.aggregated_therapies || [];
    const aggRows = aggregatedTherapies.map((item) => [
      item.therapy || "N/A",
      Array.isArray(item.domains) ? item.domains.join(", ") : "N/A",
      Array.isArray(item.relevance) ? item.relevance.join(", ") : "N/A",
    ]);

    autoTable(doc, {
      startY: finalY + 16,
      head: [["Therapy Intervention", "Target Domains", "Relevance"]],
      body:
        aggRows.length > 0
          ? aggRows
          : [["No aggregated therapies listed", "-", "-"]],
      headStyles: { fillColor: [5, 150, 105], fontStyle: "bold" },
      bodyStyles: { font: "helvetica", fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 15, right: 15 },
      theme: "striped",
    });

    return doc;
  };

  // Local PDF Download
  const generateRoadmapPdf = (userProfile, roadmapData) => {
    const doc = buildPdfDoc(userProfile, roadmapData);
    doc.save(`Patient_Roadmap_${userProfile?.name || "Report"}.pdf`);
  };

  // Email PDF to Patient
  const emailRoadmapPdf = async (userProfile, roadmapData) => {
    if (!userProfile?.email || userProfile.email === "N/A") {
      alert("This patient record lacks a valid destination email address.");
      return;
    }

    try {
      setIsSendingEmail(true);

      const doc = buildPdfDoc(userProfile, roadmapData);
      const pdfBase64Raw = doc.output("datauristring");
      const base64Content = pdfBase64Raw.split(",")[1];

      const { data, error } = await supabase.functions.invoke(
        "send-roadmap-email",
        {
          method: "POST",
          body: {
            recipientEmail: userProfile.email,
            recipientName: userProfile.name || "Valued Patient",
            pdfAttachment: base64Content,
            fileName: `Patient_Roadmap_${userProfile.name || "Report"}.pdf`,
          },
        },
      );

      if (error) throw error;

      if (data?.success) {
        alert(`Roadmap report emailed successfully to ${userProfile.email}!`);
      } else {
        throw new Error(data?.error || "Email dispatch failed.");
      }
    } catch (err) {
      console.error("Email workflow error:", err);
      alert(`Failed sending email: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!sessionUser || !practitionerProfile) {
    return <PractitionerLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <main className="h-screen bg-slate-50 flex manrope text-gray-800 overflow-hidden">
      {/* SIDEBAR AREA LAYOUT */}
      <aside className="w-72 bg-white border-r border-slate-200/80 flex flex-col p-3 shrink-0 h-full">
        <div className="p-4 flex items-center gap-3 border-b border-slate-100 pb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/40">
            <FaUserMd size={20} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 leading-tight">
              ManaScience
            </h2>
            <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider block">
              Practitioner Portal
            </span>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-2 mt-6">
          <button
            onClick={() => setActiveSubTab("cases")}
            className={`w-full font-medium text-left px-5 py-3 transition rounded-xl text-sm flex items-center gap-3 cursor-pointer ${activeSubTab === "cases" ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"}`}
          >
            <FaClipboardList /> Shared Patient Cases
          </button>
          <button
            onClick={() => setActiveSubTab("profile")}
            className={`w-full font-medium text-left px-5 py-3 transition rounded-xl text-sm flex items-center gap-3 cursor-pointer ${activeSubTab === "profile" ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"}`}
          >
            <FaUserCircle /> Practitioner Profile
          </button>
        </nav>

        <button
          onClick={handleSignOutAction}
          className="text-slate-400 hover:text-red-500 hover:bg-red-50/60 font-medium text-sm py-3 px-5 rounded-xl transition flex items-center gap-3 border border-transparent mt-auto cursor-pointer"
        >
          <FaSignOutAlt /> Sign Out Securely
        </button>
      </aside>

      {/* VIEWPORT CONTROLLER */}
      <section className="flex-1 h-full p-8 overflow-y-auto min-w-0 relative">
        <header className="flex justify-between items-center mb-8 border-b border-slate-200/50 pb-5">
          <div>
            <h1 className="text-3xl font-medium text-gray-900 tracking-tight capitalize">
              {activeSubTab === "cases"
                ? "Shared Patient Insights"
                : "Provider Registry Records Profile"}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Active Specialist:{" "}
              <span className="text-slate-700 font-semibold">
                {practitionerProfile?.name}
              </span>
            </p>
          </div>
          <button
            onClick={() =>
              fetchPractitionerWorkspaceContext(practitionerProfile.id)
            }
            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition cursor-pointer"
          >
            <FaSync
              className={loading ? "animate-spin text-emerald-600" : ""}
              size={14}
            />
          </button>
        </header>

        {loading ? (
          <div className="text-center py-20 italic text-slate-400 text-sm">
            Syncing continuous database records variables context models...
          </div>
        ) : (
          <>
            {activeSubTab === "cases" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* LEFT ASSIGNED LIST SIDEBAR COLUMN */}
                <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-2 mb-1">
                    Assigned Screening Profiles
                  </span>
                  {assignedCases.length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-4 text-center">
                      No assigned patient case evaluation histories available.
                    </p>
                  ) : (
                    assignedCases.map((caseItem) => {
                      const isNeurodivergent =
                        caseItem.roadmap?.classification
                          ?.toUpperCase()
                          .trim() === "ND" ||
                        caseItem.roadmap?.classification
                          ?.toUpperCase()
                          .trim() === "NEURODIVERGENT";

                      return (
                        <div
                          key={caseItem.id}
                          onClick={() => setSelectedCase(caseItem)}
                          className={`p-4 border rounded-2xl cursor-pointer transition-all flex items-center justify-between ${selectedCase?.id === caseItem.id ? "bg-emerald-50/50 border-emerald-300 text-slate-900 font-medium" : "bg-white border-slate-100 hover:border-slate-300"}`}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="text-sm font-semibold truncate text-slate-900">
                              {caseItem.userProfile?.name}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono truncate">
                              {caseItem.userProfile?.email}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider ${
                              isNeurodivergent
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {isNeurodivergent ? "ND" : "NT"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* RIGHT DETAILED GRID TAB VIEW SCREEN */}
                <div className="lg:col-span-2">
                  {selectedCase ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6">
                      {/* Header with Download & Email PDF Buttons */}
                      <div className="border-b pb-4 border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                            {selectedCase.userProfile?.name}
                          </h3>
                          <span className="text-xs font-medium text-slate-400 block mt-0.5">
                            Connected Email: {selectedCase.userProfile?.email}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-block font-bold px-3 py-1 border rounded-full text-xs uppercase tracking-wide ${
                              selectedCase.roadmap?.classification
                                ?.toUpperCase()
                                .trim() === "ND" ||
                              selectedCase.roadmap?.classification
                                ?.toUpperCase()
                                .trim() === "NEURODIVERGENT"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {getFullClassification(
                              selectedCase.roadmap?.classification,
                            )}
                          </span>

                          {/* DOWNLOAD PDF BUTTON */}
                          <button
                            onClick={() =>
                              generateRoadmapPdf(
                                selectedCase.userProfile,
                                selectedCase.roadmap,
                              )
                            }
                            className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold text-xs py-1.5 px-3.5 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                            title="Download PDF Report"
                          >
                            <FaDownload size={11} />
                            <span>Download PDF</span>
                          </button>

                          {/* 🌟 EMAIL PDF BUTTON */}
                          <button
                            disabled={isSendingEmail}
                            onClick={() =>
                              emailRoadmapPdf(
                                selectedCase.userProfile,
                                selectedCase.roadmap,
                              )
                            }
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-1.5 px-3.5 rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                            title="Email PDF Report to Patient"
                          >
                            <FaFilePdf size={11} />
                            <span>{isSendingEmail ? "Sending..." : "Email PDF"}</span>
                          </button>
                        </div>
                      </div>

                      {/* 1. Mapped Domains Table */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                              <th className="py-3 px-5">
                                Assessment Target Domain
                              </th>
                              <th className="py-3 px-5 text-center">
                                Score Result
                              </th>
                              <th className="py-3 px-5 text-center">
                                Severity Factor
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {(selectedCase.roadmap?.mapped_domains || []).map(
                              (domainItem, index) => (
                                <tr
                                  key={index}
                                  className="hover:bg-slate-50/50 transition"
                                >
                                  <td className="py-4 px-5 font-semibold text-slate-900">
                                    <div>
                                      {domainItem.domain ||
                                        "General Assessment Focus"}
                                    </div>
                                    {domainItem.domain_type && (
                                      <span className="inline-block text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-0.5">
                                        {domainItem.domain_type}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-4 px-5 text-center font-bold text-slate-600 bg-slate-50/10">
                                    {domainItem.score}%
                                  </td>
                                  <td className="py-4 px-5 text-center">
                                    <span
                                      className={`inline-block font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wide ${
                                        domainItem.severity === "High"
                                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                                          : domainItem.severity === "Moderate"
                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                      }`}
                                    >
                                      {domainItem.severity || "Low"}
                                    </span>
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* 2. AGGREGATED THERAPIES OVERVIEW SECTION */}
                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <FaBrain className="text-emerald-600" size={14} />
                            Aggregated Interventions Summary
                          </h4>
                          <span className="text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                            {
                              (selectedCase.roadmap?.aggregated_therapies || [])
                                .length
                            }{" "}
                            Total Therapies
                          </span>
                        </div>

                        {selectedCase.roadmap?.aggregated_therapies &&
                        selectedCase.roadmap.aggregated_therapies.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedCase.roadmap.aggregated_therapies.map(
                              (item, aggIdx) => (
                                <div
                                  key={aggIdx}
                                  className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-2 shadow-xs hover:border-emerald-200 transition"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm text-slate-900">
                                      {item.therapy}
                                    </span>
                                    {item.relevance &&
                                      item.relevance.length > 0 && (
                                        <div className="flex gap-1">
                                          {item.relevance.map((rel, rIdx) => (
                                            <span
                                              key={rIdx}
                                              className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider ${
                                                rel === "Primary"
                                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                                  : rel === "Secondary"
                                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                    : "bg-purple-50 text-purple-700 border border-purple-200"
                                              }`}
                                            >
                                              {rel}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                  </div>

                                  {item.domains && item.domains.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        Mapped Domains:
                                      </span>
                                      {item.domains.map((dom, dIdx) => (
                                        <span
                                          key={dIdx}
                                          className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-md"
                                        >
                                          {dom}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic text-center py-2">
                            No aggregated therapies recorded for this roadmap
                            profile.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/60 border border-dashed rounded-3xl p-16 text-center text-slate-400 text-sm italic font-medium">
                      Select an evaluation row tracking item from the left
                      registry dashboard menu options to drill down into active
                      clinical domains metrics.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSubTab === "profile" && practitionerProfile && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-4xl space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 border-b pb-6 border-slate-100">
                  {practitionerProfile.profile_image ? (
                    <img
                      src={practitionerProfile.profile_image}
                      alt=""
                      className="w-24 h-24 object-cover rounded-2xl border border-slate-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold flex items-center justify-center text-xl uppercase">
                      {practitionerProfile.name?.slice(0, 2)}
                    </div>
                  )}
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                      {practitionerProfile.name}
                    </h3>
                    <span className="text-sm font-semibold text-emerald-600 block">
                      {practitionerProfile.specialization ||
                        "Verified Expert Medical Partner"}
                    </span>
                    <p className="text-xs font-mono text-slate-400">
                      ID: {practitionerProfile.id}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FaGraduationCap /> Academic Foundation Education
                    </span>
                    <p className="text-sm text-slate-700 font-medium">
                      {practitionerProfile.education ||
                        "No credential history verified."}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FaBriefcase /> Focus Specialization Scope
                    </span>
                    <p className="text-sm text-slate-700 font-medium">
                      {practitionerProfile.therapies_offered ||
                        "General Clinical Interventions Modules Portfolio"}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1 md:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FaEnvelope /> Personal Registered Communication Channel
                    </span>
                    <p className="text-sm text-slate-700 font-medium">
                      {practitionerProfile.email ||
                        "No address synchronized key."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default PractitionerDashboard;