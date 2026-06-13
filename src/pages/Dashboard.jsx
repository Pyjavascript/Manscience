import { useState, useEffect } from "react";
import {
  FaKey,
  FaUserMd,
  FaCheck,
  FaTimes,
  FaGlobe,
  FaBlog,
  FaUsers,
  FaEye,
  FaSync,
} from "react-icons/fa";
import { supabase } from "../supabase";

const Dashboard = () => {
  // System Metrics & Global States
  const [totalUsers, setTotalUsers] = useState("...");
  const [therapyCount, setTherapyCount] = useState(0);
  const [blogCount, setBlogCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Subscriptions Table States
  const [subscriptions, setSubscriptions] = useState([]);

  // Practitioners Sub-tab States
  const [practitioners, setPractitioners] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const [practitionersLoading, setPractitionersLoading] = useState(false);
  const [actionProcessingId, setActionProcessingId] = useState(null);

  // Modal State
  const [selectedPractitioner, setSelectedPractitioner] = useState(null);

  // Navigation Tabs States
  const [activeTab, setActiveTab] = useState("overview");
  const [practitionerSubTab, setPractitionerSubTab] = useState("pending");


const fetchPractitioners = async (type) => {
    try {
      setPractitionersLoading(true);
      const { data, error } = await supabase.functions.invoke(
        `get-practitioners?status=${type}`,
        {
          method: "GET",
        },
      );
      if (error) throw error;
      if (data) {
        const mappedData = (data.practitioners || []).map((p) => {

          const fields = p.rawFieldData || p.fieldData || p;

          const education = p.education || fields.education || "N/A";
          const experience = p.experience || fields.experience || "N/A";
          const specialization = p.specialization || fields.specialization || "General Practitioner";
          const therapies = p.therapiesOffered || fields["therapies-offered"] || fields.therapies || "N/A";
          const approach = p.approachToCare || fields["approach-to-care"] || fields.approach_to_care || "N/A";
          const research = p["research-papers"] || fields["research-papers"] || "N/A";

          const imageObj = p.image || fields.image || fields["image-2"] || null;

        
          let certsArray = [];
          if (Array.isArray(fields["certificate-images"])) {
            certsArray = fields["certificate-images"];
          } else if (Array.isArray(fields["certificate-image"])) {
            certsArray = fields["certificate-image"];
          } else if (Array.isArray(p.certificateImages)) {
            // Re-wrap if the edge function sent raw string arrays back
            certsArray = p.certificateImages.map(url => typeof url === 'string' ? { url } : url);
          }

          // Return a fully unified object mapping containing both dash and camelCase aliases
          return {
            ...p,
            id: p.id,
            name: p.name || fields.name || "Unknown",
            email: p.email || fields.email || p.rawFieldData?.email || `${p.slug || "practitioner"}@domain.com`,
            specialization: specialization,
            education: education,
            experience: experience,
            image: imageObj,
            
            // Re-mapping keys with exact dashboard layout string targets
            "therapies-offered": therapies,
            "approach-to-care": approach,
            "research-papers": research,
            "certificate-images": certsArray,

            // Retaining native clean copies for complete variable safety
            therapiesOffered: therapies,
            approachToCare: approach,
            certificateImages: certsArray,
            rawFieldData: fields
          };
        });

        setPractitioners(mappedData);
        if (type === "pending") setPendingCount(data.total || 0);
        if (type === "live") setLiveCount(data.total || 0);
      }
    } catch (err) {
      console.error(`Error loading ${type} practitioners:`, err);
    } finally {
      setPractitionersLoading(false);
    }
  };

  const handleReviewAction = async (itemId, action) => {
    try {
      setActionProcessingId(itemId);

      const { data, error } = await supabase.functions.invoke(
        "review-practitioner",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { action, itemId },
        },
      );

      if (error) throw error;

      if (data?.success) {
        setPractitioners((prev) => prev.filter((p) => p.id !== itemId));
        if (action === "approve") {
          setPendingCount((prev) => Math.max(0, prev - 1));
          setLiveCount((prev) => prev + 1);
        } else {
          setPendingCount((prev) => Math.max(0, prev - 1));
        }
        setSelectedPractitioner(null); // Close modal on success
      }
    } catch (err) {
      alert(`Action execution failed: ${err.message}`);
    } finally {
      setActionProcessingId(null);
    }
  };


  const fetchTherapyCount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-blogs", {
        method: "GET",
      });
      if (error) throw error;
      if (data?.pagination?.total !== undefined)
        setTherapyCount(data.pagination.total);
    } catch (err) {
      console.error("Error fetching therapy count data:", err);
    }
  };

  const fetchBlogLength = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("blogs-count", {
        method: "GET",
      });
      if (error) throw error;
      if (data?.pagination?.total !== undefined)
        setBlogCount(data.pagination.total);
    } catch (err) {
      console.error("Error fetching blog lengths data:", err);
    }
  };

  const loadDashboard = async () => {
    try {
      const response = await fetch(
        "https://obzogpozgoolhededqkb.supabase.co/functions/v1/admin-users",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "users" }),
        },
      );
      const data = await response.json();
      setTotalUsers(data.totalUsers);
    } catch (err) {
      console.error("Error fetching total system registrations:", err);
      setTotalUsers("Error");
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch(
        "https://obzogpozgoolhededqkb.supabase.co/functions/v1/subscriptions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "users" }),
        },
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setSubscriptions(data.users || []);
      } else {
        throw new Error(data.error || "Failed to fetch subscriptions data.");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Reusable pipeline to refresh all overview and configuration dependencies
  const refreshOverviewData = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([
      fetchTherapyCount(),
      fetchBlogLength(),
      loadDashboard(),
      fetchSubscriptions(),
      fetchPractitioners("pending"),
      fetchPractitioners("live"),
    ]);
    setLoading(false);
  };


  useEffect(() => {
    if (activeTab === "practitioners") {
      fetchPractitioners(practitionerSubTab);
    }
  }, [practitionerSubTab, activeTab]);

  useEffect(() => {
    refreshOverviewData();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 flex font-sans text-gray-800">
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col p-2">
        <div className="p-6 text-2xl font-semibold text-black tracking-tight">
          Dashboard
        </div>
        <nav className="flex-1 flex flex-col gap-2 mt-4">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full font-medium text-left px-6 py-3 transition rounded-xl text-lg flex items-center gap-3 ${activeTab === "overview" ? "bg-[#5932EA] text-white" : "text-[#9197B3] hover:bg-slate-200"}`}
          >
            <FaKey /> Overview
          </button>
          <button
            onClick={() => setActiveTab("practitioners")}
            className={`w-full font-medium text-left px-6 py-3 transition rounded-xl text-lg flex items-center gap-3 ${activeTab === "practitioners" ? "bg-[#5932EA] text-white" : "text-[#9197B3] hover:bg-slate-200"}`}
          >
            <FaUserMd /> Practitioners ({pendingCount})
          </button>
        </nav>
      </aside>

      <section className="flex-1 p-8 overflow-y-auto relative">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-medium text-gray-800 capitalize">
              {activeTab === "practitioners"
                ? `Practitioners Management`
                : activeTab}
            </h1>
            
            {/* Dynamic Content Refresh Controls */}
            {activeTab === "overview" && (
              <button
                onClick={refreshOverviewData}
                disabled={loading}
                title="Refresh Overview Data"
                className="p-2 text-gray-400 hover:text-[#5932EA] hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-all disabled:opacity-40"
              >
                <FaSync className={loading ? "animate-spin" : ""} size={16} />
              </button>
            )}

            {activeTab === "practitioners" && (
              <button
                onClick={() => fetchPractitioners(practitionerSubTab)}
                disabled={practitionersLoading}
                title="Refresh Profile Entries"
                className="p-2 text-gray-400 hover:text-[#5932EA] hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-all disabled:opacity-40"
              >
                <FaSync className={practitionersLoading ? "animate-spin" : ""} size={16} />
              </button>
            )}
          </div>
          
          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium">
            June 10, 2026
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
            Error loading operational metrics: {error}
          </div>
        )}

        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <FaUsers size={28} />
                </div>
                <div>
                  <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                    Total Users
                  </h3>
                  <p className="text-3xl font-bold mt-1 text-gray-900">
                    {totalUsers}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 pr-1 rounded-3xl border border-gray-200 flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <FaUserMd size={28} />
                </div>
                <div>
                  <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                    Pending Approvals
                  </h3>
                  <p className="text-3xl font-bold mt-1 text-gray-900">
                    {loading ? "..." : pendingCount}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-center gap-4 ">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <FaGlobe size={28} />
                </div>
                <div>
                  <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                    Live Experts
                  </h3>
                  <p className="text-3xl font-bold mt-1 text-gray-900">
                    {loading ? "..." : liveCount}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  <FaBlog size={24} />
                </div>
                <div>
                  <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                    Total Blogs
                  </h3>
                  <p className="text-3xl font-bold mt-1 text-gray-900">
                    {loading ? "..." : blogCount}
                  </p>
                </div>
              </div>
            </div>

            {/* SUBSCRIBERS TABLE COMPONENT */}
            <div className="w-full bg-white border border-gray-200 rounded-3xl mt-4">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-medium text-gray-800">
                  All Subscribers
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6 font-medium">User ID</th>
                      <th className="py-4 px-6 font-medium">User Name</th>
                      <th className="py-4 px-6 font-medium">User Email</th>
                      <th className="py-4 px-6 font-medium">Plan tier</th>
                      <th className="py-4 px-6 text-center font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {subscriptions.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="text-center text-gray-500 py-8 italic"
                        >
                          {loading
                            ? "Syncing subscriber indexes..."
                            : "No platform subscriptions registered."}
                        </td>
                      </tr>
                    ) : (
                      subscriptions.map((sub) => (
                        <tr
                          key={sub.userid}
                          className="hover:bg-slate-50 transition"
                        >
                          <td className="py-4 px-6 font-mono text-xs text-gray-400 select-all max-w-30 truncate">
                            {sub.userid}
                          </td>
                          <td className="py-4 px-6 font-medium text-gray-900">
                            {sub.username}
                          </td>
                          <td className="py-4 px-6 text-gray-600">
                            {sub.email}
                          </td>
                          <td className="py-4 px-6 font-medium text-gray-700 capitalize">
                            {sub.plan}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="inline-block text-green-700 bg-green-50 px-4 py-1.5 border border-green-200 font-semibold rounded-full text-xs uppercase tracking-wider">
                              {sub.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === "practitioners" && (
          <div className="bg-white border border-gray-200 rounded-3xl p-6">
            <div className="flex border-b border-gray-200 mb-6 gap-6">
              <button
                onClick={() => setPractitionerSubTab("pending")}
                className={`pb-3 font-semibold text-base transition-all border-b-2 px-2 ${practitionerSubTab === "pending" ? "border-[#5932EA] text-[#5932EA]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
              >
                Pending Applications ({pendingCount})
              </button>
              <button
                onClick={() => setPractitionerSubTab("live")}
                className={`pb-3 font-semibold text-base transition-all border-b-2 px-2 ${practitionerSubTab === "live" ? "border-[#5932EA] text-[#5932EA]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
              >
                Live Directory ({liveCount})
              </button>
            </div>

            {practitionersLoading ? (
              <p className="text-gray-500 italic py-6 text-sm">
                Querying active Webflow Collection fields...
              </p>
            ) : practitioners.length === 0 ? (
              <p className="text-gray-500 italic py-6 text-sm">
                No profiles found matching this sub-tab query.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6">Practitioner ID</th>
                      <th className="py-4 px-6">Name</th>
                      <th className="py-4 px-6">Email Address</th>
                      {practitionerSubTab === "pending" && (
                        <th className="py-4 px-6 text-center">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {practitioners.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="py-4 px-6 font-mono text-xs text-gray-400 max-w-35 truncate select-all">
                          {p.id}
                        </td>
                        <td className="py-4 px-6 font-semibold text-gray-900 flex items-center gap-2">
                          {practitionerSubTab === "live" && (
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                          )}
                          {p.name}
                        </td>
                        <td className="py-4 px-6 text-gray-600">{p.email}</td>

                        {practitionerSubTab === "pending" && (
                          <td className="py-4 px-6 text-center">
                            <div className="flex justify-center items-center gap-3">
                              {/* View Details Eye Icon Button */}
                              <button
                                onClick={() => setSelectedPractitioner(p)}
                                className="bg-blue-100 text-blue-600 py-1.5 px-3 rounded-xl font-medium text-sm flex items-center gap-1 hover:bg-blue-200 transition"
                                title="View Application Details"
                              >
                                <FaEye size={14} /> View
                              </button>

                              <button
                                disabled={actionProcessingId !== null}
                                onClick={() =>
                                  handleReviewAction(p.id, "approve")
                                }
                                className="bg-green-500 text-white py-1.5 px-3 rounded-xl font-medium text-sm flex items-center gap-1 hover:bg-green-600 disabled:opacity-50 transition"
                              >
                                <FaCheck size={10} /> Approve
                              </button>
                              <button
                                disabled={actionProcessingId !== null}
                                onClick={() =>
                                  handleReviewAction(p.id, "reject")
                                }
                                className="bg-red-500 text-white py-1.5 px-3 rounded-xl font-medium text-sm flex items-center gap-1 hover:bg-red-600 disabled:opacity-50 transition"
                              >
                                <FaTimes size={10} /> Reject
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* MODAL OVERLAY - Rendered conditionally when a practitioner is selected */}
      {selectedPractitioner && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">
                Practitioner Review
              </h2>
              <button
                onClick={() => setSelectedPractitioner(null)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Profile Image & Name Section */}
              <div className="flex gap-6 items-center border-b pb-6 border-gray-100">
                {selectedPractitioner.image?.url ? (
                  <img
                    src={selectedPractitioner.image.url}
                    alt="Profile"
                    className="w-24 h-24 object-cover rounded-full border-2 border-indigo-100 shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedPractitioner.name}
                  </h3>
                  <p className="text-indigo-600 font-medium">
                    {selectedPractitioner.specialization}
                  </p>
                  <p className="text-gray-500 text-xs mt-1 font-mono">
                    ID: {selectedPractitioner.id}
                  </p>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Education
                  </h4>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {selectedPractitioner.education || "N/A"}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Therapies Offered
                  </h4>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {selectedPractitioner["therapies-offered"] || "N/A"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Experience
                  </h4>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {selectedPractitioner.experience || "N/A"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Approach to Care
                  </h4>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {selectedPractitioner["approach-to-care"] || "N/A"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Research Papers
                  </h4>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {selectedPractitioner["research-papers"] || "N/A"}
                  </p>
                </div>
              </div>

              {/* Certificates Rendering */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Certificates
                </h4>
                {selectedPractitioner["certificate-images"] &&
                selectedPractitioner["certificate-images"].length > 0 ? (
                  <div className="flex gap-4 flex-wrap mt-2">
                    {selectedPractitioner["certificate-images"].map(
                      (cert, index) => (
                        <a
                          key={index}
                          href={cert.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group h-32 block rounded-xl overflow-hidden shadow-sm hover:shadow-md transition bg-gray-50 cursor-pointer"
                        >
                          <img
                            src={cert.url}
                            alt={`Certificate ${index + 1}`}
                            className="h-full object-contain transition duration-300 group-hover:scale-105"
                          />
                          {/* Modern Hover Overlay */}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-[1px]">
                            <span className="text-white text-xs font-medium bg-black/60 px-2.5 py-1.5 rounded-lg border border-white/20 tracking-wide shadow-sm">
                              Open Certificate
                            </span>
                          </div>
                        </a>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                    No certificates uploaded.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            {practitionerSubTab === "pending" && (
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button
                  disabled={actionProcessingId !== null}
                  onClick={() =>
                    handleReviewAction(selectedPractitioner.id, "reject")
                  }
                  className="bg-red-100 text-red-700 py-2 px-6 rounded-xl font-semibold hover:bg-red-200 transition disabled:opacity-50"
                >
                  Reject Application
                </button>
                <button
                  disabled={actionProcessingId !== null}
                  onClick={() =>
                    handleReviewAction(selectedPractitioner.id, "approve")
                  }
                  className="bg-green-500 text-white py-2 px-8 rounded-xl font-semibold hover:bg-green-600 transition disabled:opacity-50"
                >
                  {actionProcessingId === selectedPractitioner.id
                    ? "Processing..."
                    : "Approve Practitioner"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default Dashboard;