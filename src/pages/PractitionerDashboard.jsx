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
  FaEdit,
  FaTrash,
  FaPlus,
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

      // 2. Look up by either user_id OR clean email string for verification
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

      // 3. Pass profile structure upward to initialize dashboard view
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

// --- MAIN PRACTITIONER DASHBOARD COMPONENT ---
const PractitionerDashboard = () => {
  const [sessionUser, setSessionUser] = useState(null);
  const [practitionerProfile, setPractitionerProfile] = useState(null);
  const [assignedCases, setAssignedCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState("cases");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Dynamic Multi-Question State
  const [querySubject, setQuerySubject] = useState("");
  const [questionsList, setQuestionsList] = useState([""]);
  const [isSendingQuery, setIsSendingQuery] = useState(false);

  // State for Patient Queries History
  const [patientQueries, setPatientQueries] = useState([]);

  // Fetch queries for active patient
  const fetchQueriesForCase = async (userId) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("practitioner_queries")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPatientQueries(data || []);
    } catch (err) {
      console.error("Error fetching queries for patient:", err.message);
    }
  };

  useEffect(() => {
    if (selectedCase?.user_id) {
      fetchQueriesForCase(selectedCase.user_id);
    } else {
      setPatientQueries([]);
    }
  }, [selectedCase]);

  // Form input control handlers
  const handleAddQuestionField = () => {
    setQuestionsList([...questionsList, ""]);
  };

  const handleRemoveQuestionField = (index) => {
    setQuestionsList(questionsList.filter((_, idx) => idx !== index));
  };

  const handleQuestionInputChange = (index, value) => {
    const updated = [...questionsList];
    updated[index] = value;
    setQuestionsList(updated);
  };

  // Submit questions & send email notification safely
  const handleSendQuery = async (e) => {
    e.preventDefault();

    const validQuestions = questionsList.filter((q) => q.trim() !== "");
    if (!querySubject.trim() || validQuestions.length === 0) {
      alert("Please provide a subject and at least one question.");
      return;
    }

    const targetUserId = selectedCase?.user_id;
    const patientEmail = selectedCase?.userProfile?.email;

    if (!targetUserId) {
      alert("Missing patient account user ID.");
      return;
    }

    try {
      setIsSendingQuery(true);

      // 1. Insert into database
      const { error } = await supabase
        .from("practitioner_queries")
        .insert([
          {
            practitioner_id: practitionerProfile.id,
            user_id: targetUserId,
            subject: querySubject.trim(),
            question: validQuestions.join(" | "),
            questions: validQuestions,
            status: "pending",
          },
        ]);

      if (error) throw error;

      // 2. Dispatch Email (wrapped so email API failure will not break query state)
      if (patientEmail && patientEmail !== "N/A") {
        try {
          await supabase.functions.invoke("send-notification-email", {
            method: "POST",
            body: {
              recipientEmail: patientEmail,
              subject: `New Request from Dr. ${practitionerProfile.name}: ${querySubject.trim()}`,
              message: `Hello,\n\nYour practitioner Dr. ${practitionerProfile.name} has sent you a new questionnaire regarding: "${querySubject.trim()}".\n\nPlease log in to review and submit your answers.`,
              actionLink: `${window.location.origin}/profile`,
              buttonText: "Answer Questions in Profile",
            },
          });
        } catch (emailErr) {
          console.warn("Email alert could not be sent:", emailErr.message);
        }
      }

      alert("Questionnaire sent to patient!");
      setQuerySubject("");
      setQuestionsList([""]);
      fetchQueriesForCase(targetUserId);
    } catch (err) {
      alert(`Failed to send query: ${err.message}`);
    } finally {
      setIsSendingQuery(false);
    }
  };

  // Edit Recommendations State
  const [isEditingRecommendations, setIsEditingRecommendations] = useState(false);
  const [editableTherapies, setEditableTherapies] = useState([]);
  const [isSavingTherapies, setIsSavingTherapies] = useState(false);

  useEffect(() => {
    if (selectedCase?.roadmap?.aggregated_therapies) {
      setEditableTherapies(selectedCase.roadmap.aggregated_therapies);
    } else {
      setEditableTherapies([]);
    }
    setIsEditingRecommendations(false);
  }, [selectedCase]);

  const fetchPractitionerWorkspaceContext = async (profileId) => {
    const targetId = profileId || practitionerProfile?.id;
    if (!targetId) return;

    try {
      setLoading(true);

      const { data: cases, error: caseErr } = await supabase
        .from("practitioner_roadmap_assignments")
        .select("id, assigned_at, user_id, roadmap_id")
        .eq("practitioner_id", targetId)
        .order("assigned_at", { ascending: false });

      if (caseErr) throw caseErr;

      if (cases && cases.length > 0) {
        const compiledCases = await Promise.all(
          cases.map(async (c) => {
            const { data: roadmapDetails } = await supabase
              .from("user_roadmap_mapped")
              .select("*")
              .eq("user_id", c.user_id)
              .maybeSingle();

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
      console.error("Error building practitioner workspace context:", err.message);
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

  const handleRefreshWorkspace = async () => {
    if (!practitionerProfile?.id) return;
    await fetchPractitionerWorkspaceContext(practitionerProfile.id);
    if (selectedCase?.user_id) {
      await fetchQueriesForCase(selectedCase.user_id);
    }
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

  const handleTherapyChange = (index, field, value) => {
    const updated = [...editableTherapies];
    if (field === "domains" || field === "relevance") {
      updated[index][field] = value.split(",").map((item) => item.trim());
    } else {
      updated[index][field] = value;
    }
    setEditableTherapies(updated);
  };

  const handleAddTherapyRow = () => {
    setEditableTherapies([
      ...editableTherapies,
      { therapy: "", domains: [], relevance: ["Primary"] },
    ]);
  };

  const handleDeleteTherapyRow = (index) => {
    setEditableTherapies(editableTherapies.filter((_, idx) => idx !== index));
  };

  const handleSaveRecommendations = async () => {
    if (!selectedCase?.roadmap?.user_id) return;

    try {
      setIsSavingTherapies(true);

      const { error } = await supabase
        .from("user_roadmap_mapped")
        .update({ aggregated_therapies: editableTherapies })
        .eq("user_id", selectedCase.roadmap.user_id);

      if (error) throw error;

      setSelectedCase((prev) => ({
        ...prev,
        roadmap: {
          ...prev.roadmap,
          aggregated_therapies: editableTherapies,
        },
      }));

      setAssignedCases((prevCases) =>
        prevCases.map((c) =>
          c.id === selectedCase.id
            ? {
                ...c,
                roadmap: {
                  ...c.roadmap,
                  aggregated_therapies: editableTherapies,
                },
              }
            : c,
        ),
      );

      setIsEditingRecommendations(false);
      alert("Recommendations updated successfully!");
    } catch (err) {
      console.error("Error saving recommendations:", err);
      alert(`Failed to save: ${err.message}`);
    } finally {
      setIsSavingTherapies(false);
    }
  };

  const getFullClassification = (code) => {
    if (!code) return "Unclassified";
    const clean = code.toUpperCase().trim();
    if (clean === "ND" || clean === "NEURODIVERGENT") return "Neurodivergent";
    if (clean === "NT" || clean === "NEUROTYPICAL") return "Neurotypical";
    return code;
  };

  const buildPdfDoc = (userProfile, roadmapData) => {
    const doc = new jsPDF();

    doc.setFillColor(5, 150, 105);
    doc.rect(0, 0, 210, 40, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("COGNITIVE PROFILE ROADMAP", 15, 26);

    doc.setFontSize(12);
    doc.setTextColor(34, 34, 34);
    doc.text("USER DETAILS", 15, 52);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Full Account Name :  ${userProfile?.name || "Anonymous Guest"}`, 15, 62);
    doc.text(`Registered Email   :  ${userProfile?.email || "N/A"}`, 15, 70);

    const classificationLabel = getFullClassification(roadmapData?.classification);
    doc.setFont("helvetica", "bold");
    doc.text(`Classification    :  ${classificationLabel}`, 15, 78);

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 84, 195, 84);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Profile Summary", 15, 94);

    const mappedDomainsArray = roadmapData?.mapped_domains || [];
    const tableRows = mappedDomainsArray.map((item) => [
      item.domain || "General Domain",
      item.severity || "Low",
    ]);

    autoTable(doc, {
      startY: 100,
      head: [["Assessment Domain", "Severity"]],
      body: tableRows,
      headStyles: { fillColor: [5, 150, 105], fontStyle: "bold" },
      bodyStyles: { font: "helvetica", fontSize: 10 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 15, right: 15 },
      theme: "striped",
    });

    let currentY = doc.lastAutoTable.finalY || 160;
    currentY += 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(34, 34, 34);
    doc.text("Recommendations:", 15, currentY);
    currentY += 8;

    const aggregatedTherapies = roadmapData?.aggregated_therapies || [];

    if (aggregatedTherapies.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text("• No recommendations listed", 18, currentY);
    } else {
      aggregatedTherapies.forEach((item) => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(34, 34, 34);
        doc.text(`• ${item.therapy || "N/A"}`, 18, currentY);
        currentY += 6;
      });
    }

    return doc;
  };

  const generateRoadmapPdf = (userProfile, roadmapData) => {
    const doc = buildPdfDoc(userProfile, roadmapData);
    doc.save(`Roadmap_Report_${userProfile?.name || "User"}.pdf`);
  };

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
            recipientName: userProfile.name || "Valued Member",
            pdfAttachment: base64Content,
            fileName: `Roadmap_Report_${userProfile.name || "User"}.pdf`,
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

  // Real-time listener for query answers
  useEffect(() => {
    const userId = selectedCase?.user_id;
    if (!userId) return;

    const channel = supabase
      .channel("patient-queries-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "practitioner_queries",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchQueriesForCase(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCase?.user_id]);

  if (!sessionUser || !practitionerProfile) {
    return <PractitionerLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <main className="h-screen bg-slate-50 flex manrope text-gray-800 overflow-hidden">
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
            onClick={handleRefreshWorkspace}
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
            Syncing continuous database records...
          </div>
        ) : (
          <>
            {activeSubTab === "cases" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-2 mb-1">
                    Assigned Screening Profiles
                  </span>
                  {assignedCases.length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-4 text-center">
                      No assigned patient cases available.
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

                <div className="lg:col-span-2">
                  {selectedCase ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6">
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

                          <button
                            onClick={() =>
                              generateRoadmapPdf(
                                selectedCase.userProfile,
                                selectedCase.roadmap,
                              )
                            }
                            className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold text-xs py-1.5 px-3.5 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <FaDownload size={11} />
                            <span>Download PDF</span>
                          </button>

                          <button
                            disabled={isSendingEmail}
                            onClick={() =>
                              emailRoadmapPdf(
                                selectedCase.userProfile,
                                selectedCase.roadmap,
                              )
                            }
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-1.5 px-3.5 rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
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
                              <th className="py-3 px-5">Assessment Target Domain</th>
                              <th className="py-3 px-5 text-center">Score Result</th>
                              <th className="py-3 px-5 text-center">Severity Factor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {(selectedCase.roadmap?.mapped_domains || []).map(
                              (domainItem, index) => (
                                <tr key={index} className="hover:bg-slate-50/50 transition">
                                  <td className="py-4 px-5 font-semibold text-slate-900">
                                    <div>{domainItem.domain || "General Assessment Focus"}</div>
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

                      {/* 2. EDITABLE AGGREGATED THERAPIES SECTION */}
                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <FaBrain className="text-emerald-600" size={14} />
                            Aggregated Interventions & Recommendations
                          </h4>

                          <div className="flex items-center gap-2">
                            {!isEditingRecommendations ? (
                              <button
                                onClick={() => setIsEditingRecommendations(true)}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1 px-3 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                              >
                                <FaEdit size={12} />
                                Edit Recommendations
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditableTherapies(selectedCase.roadmap?.aggregated_therapies || []);
                                    setIsEditingRecommendations(false);
                                  }}
                                  className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1 px-3 rounded-lg transition cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  disabled={isSavingTherapies}
                                  onClick={handleSaveRecommendations}
                                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1 px-3 rounded-lg transition disabled:opacity-50 cursor-pointer"
                                >
                                  {isSavingTherapies ? "Saving..." : "Save Changes"}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* EDIT MODE FORM VIEW */}
                        {isEditingRecommendations ? (
                          <div className="space-y-4">
                            {editableTherapies.map((item, idx) => (
                              <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 relative shadow-xs">
                                <button
                                  onClick={() => handleDeleteTherapyRow(idx)}
                                  className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1"
                                >
                                  <FaTrash size={10} /> Remove
                                </button>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-16">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                      Therapy Title
                                    </label>
                                    <input
                                      type="text"
                                      value={item.therapy || ""}
                                      onChange={(e) => handleTherapyChange(idx, "therapy", e.target.value)}
                                      placeholder="e.g. Cognitive Behavioral Therapy"
                                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                      Relevance (comma-separated)
                                    </label>
                                    <input
                                      type="text"
                                      value={Array.isArray(item.relevance) ? item.relevance.join(", ") : item.relevance || ""}
                                      onChange={(e) => handleTherapyChange(idx, "relevance", e.target.value)}
                                      placeholder="Primary, Secondary"
                                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                    Mapped Domains (comma-separated)
                                  </label>
                                  <input
                                    type="text"
                                    value={Array.isArray(item.domains) ? item.domains.join(", ") : item.domains || ""}
                                    onChange={(e) => handleTherapyChange(idx, "domains", e.target.value)}
                                    placeholder="Executive Function, Sensory Processing"
                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500"
                                  />
                                </div>
                              </div>
                            ))}

                            <button
                              onClick={handleAddTherapyRow}
                              className="w-full border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 text-xs font-semibold py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <FaPlus size={10} /> Add New Recommendation
                            </button>
                          </div>
                        ) : (
                          /* READ-ONLY DISPLAY VIEW */
                          selectedCase.roadmap?.aggregated_therapies &&
                          selectedCase.roadmap.aggregated_therapies.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {selectedCase.roadmap.aggregated_therapies.map((item, aggIdx) => (
                                <div
                                  key={aggIdx}
                                  className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-2 shadow-xs hover:border-emerald-200 transition"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm text-slate-900">
                                      {item.therapy}
                                    </span>
                                    {item.relevance && item.relevance.length > 0 && (
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
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic text-center py-2">
                              No aggregated therapies recorded for this roadmap profile.
                            </p>
                          )
                        )}
                      </div>

                      {/* 3. MULTI-QUESTION REQUEST FORM & HISTORY */}
                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-5">
                        <form onSubmit={handleSendQuery} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Request Information / Send Questionnaire
                          </div>
                          
                          <input
                            type="text"
                            placeholder="Subject / Questionnaire Title (e.g., Weekly Symptom & Food Log)"
                            value={querySubject}
                            onChange={(e) => setQuerySubject(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-xs bg-slate-50/50 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                            required
                          />

                          {/* Dynamic Question Inputs List */}
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">
                              Questions List
                            </label>
                            {questionsList.map((qText, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
                                <input
                                  type="text"
                                  placeholder={`Question #${idx + 1}`}
                                  value={qText}
                                  onChange={(e) => handleQuestionInputChange(idx, e.target.value)}
                                  className="flex-1 border border-slate-200 rounded-lg p-2 text-xs bg-slate-50/50 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                                  required
                                />
                                {questionsList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveQuestionField(idx)}
                                    className="text-red-500 hover:text-red-700 text-xs px-2 font-bold cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center pt-2">
                            <button
                              type="button"
                              onClick={handleAddQuestionField}
                              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                            >
                              + Add Another Question
                            </button>

                            <button
                              type="submit"
                              disabled={isSendingQuery}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-4 rounded-lg transition cursor-pointer disabled:opacity-50"
                            >
                              {isSendingQuery ? "Sending..." : "Send Request to Patient"}
                            </button>
                          </div>
                        </form>

                        {/* Query Threads History List */}
                        <div className="space-y-3 pt-2">
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Sent Questionnaires & Patient Answers
                          </div>
                          {patientQueries.length === 0 ? (
                            <p className="text-xs text-slate-400 italic bg-white p-4 rounded-xl border border-slate-200 text-center">
                              No inquiries sent to this patient yet.
                            </p>
                          ) : (
                            patientQueries.map((q) => {
                              const qList = Array.isArray(q.questions) && q.questions.length > 0 ? q.questions : [q.question];
                              const aList = Array.isArray(q.responses) ? q.responses : [];

                              return (
                                <div key={q.id} className="border border-slate-200 rounded-xl p-4 space-y-3 text-xs bg-white shadow-xs">
                                  <div className="flex justify-between items-center border-b pb-2 border-slate-100">
                                    <span className="font-bold text-slate-900 text-sm">{q.subject}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${q.status === 'answered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                      {q.status}
                                    </span>
                                  </div>

                                  <div className="space-y-2.5">
                                    {qList.map((qItem, idx) => (
                                      <div key={idx} className="space-y-1">
                                        <p className="text-slate-700 font-semibold">
                                          {qList.length > 1 ? `${idx + 1}. ` : ""}
                                          {qItem}
                                        </p>
                                        {q.status === "answered" ? (
                                          <div className="bg-emerald-50 border border-emerald-100 text-emerald-900 p-2 rounded-lg text-xs font-sans">
                                            <strong>Patient Response:</strong> {aList[idx] || q.response}
                                          </div>
                                        ) : (
                                          <p className="text-[11px] text-amber-600 italic">Awaiting patient response...</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="bg-white/60 border border-dashed rounded-3xl p-16 text-center text-slate-400 text-sm italic font-medium">
                      Select an evaluation row tracking item from the left registry dashboard menu options to drill down into active clinical domains metrics.
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