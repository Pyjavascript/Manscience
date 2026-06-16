import { useState, useEffect, useMemo } from "react";
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
  FaBrain,
  FaBookMedical,
  FaHandHoldingMedical,
  FaBookOpen,
  FaRegNewspaper,
  FaCrown,
  FaUserMinus,
} from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { supabase } from "../supabase";

const Dashboard = () => {
  // System Metrics & Global States
  const [totalUsers, setTotalUsers] = useState("...");
  const [therapyCount, setTherapyCount] = useState(0);
  const [blogCount, setBlogCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Subscriptions Table States (Overview Tab)
  const [subscriptions, setSubscriptions] = useState([]);

  // User Management Main States
  const [allUsersList, setAllUsersList] = useState([]);
  const [userManagementLoading, setUserManagementLoading] = useState(false);
  const [userFilter, setUserFilter] = useState("all"); // "all" | "subscribed" | "unsubscribed"
  const [selectedUser, setSelectedUser] = useState(null);

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

  const fetchUserManagementData = async () => {
    try {
      setUserManagementLoading(true);

      // 1. Fetch all system users from your admin-users edge function
      const usersResponse = await fetch(
        "https://obzogpozgoolhededqkb.supabase.co/functions/v1/admin-users",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "users" }),
        },
      );
      const usersData = await usersResponse.json();
      const profiles = usersData.users || [];

      // 2. Fetch all subscription bundles from your subscriptions edge function
      const subsResponse = await fetch(
        "https://obzogpozgoolhededqkb.supabase.co/functions/v1/subscriptions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "users" }),
        },
      );
      const subsData = await subsResponse.json();
      const activeSubs = subsData.users || [];

      const subMap = new Map(activeSubs.map((s) => [s.userid, s]));

      // 3. Blend them together client-side for your metrics calculations
      const blendedUsers = profiles.map((user) => {
        const userSub = subMap.get(user.id);
        const isSubscribed =
          userSub &&
          (userSub.status === "active" || userSub.status === "trialing");

        return {
          ...user,
          subscription: userSub
            ? {
                plan: userSub.plan,
                status: userSub.status,
                current_period_end: userSub.current_period_end || null,
              }
            : null,
          isSubscribed: !!isSubscribed,
        };
      });

      setAllUsersList(blendedUsers);
    } catch (err) {
      console.error("Error aggregating User Management directories:", err);
    } finally {
      setUserManagementLoading(false);
    }
  };

  // Math Metrics Computations
  const computedTotalUsersCount = allUsersList.length;
  const computedSubscribedCount = allUsersList.filter(
    (u) => u.isSubscribed,
  ).length;
  const computedUnsubscribedCount =
    computedTotalUsersCount - computedSubscribedCount;

  // COMPUTE MONTHLY GROWTH DATA FOR CHART GRAPH
  const monthlyGrowthData = useMemo(() => {
    const monthlyMap = {};

    allUsersList.forEach((user) => {
      if (!user.created_at) return;
      const date = new Date(user.created_at);
      // Grouping by "MMM YY" (e.g., "Jan 26")
      const monthLabel = date.toLocaleString("en-US", {
        month: "short",
        year: "2-digit",
      });
      const sortKey = date.getFullYear() * 100 + date.getMonth();

      if (!monthlyMap[monthLabel]) {
        monthlyMap[monthLabel] = { name: monthLabel, Users: 0, sortKey };
      }
      monthlyMap[monthLabel].Users += 1;
    });

    // Return chronological order dataset
    return Object.values(monthlyMap).sort((a, b) => a.sortKey - b.sortKey);
  }, [allUsersList]);

  // Filter list display data
  const filteredUsersDisplayList = allUsersList.filter((u) => {
    if (userFilter === "subscribed") return u.isSubscribed;
    if (userFilter === "unsubscribed") return !u.isSubscribed;
    return true; // "all"
  });

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
          const specialization =
            p.specialization || fields.specialization || "General Practitioner";
          const therapies =
            p.therapiesOffered ||
            fields["therapies-offered"] ||
            fields.therapies ||
            "N/A";
          const approach =
            p.approachToCare ||
            fields["approach-to-care"] ||
            fields.approach_to_care ||
            "N/A";
          const research =
            p["research-papers"] || fields["research-papers"] || "N/A";

          const imageObj = p.image || fields.image || fields["image-2"] || null;

          let certsArray = [];
          if (Array.isArray(fields["certificate-images"])) {
            certsArray = fields["certificate-images"];
          } else if (Array.isArray(fields["certificate-image"])) {
            certsArray = fields["certificate-image"];
          } else if (Array.isArray(p.certificateImages)) {
            certsArray = p.certificateImages.map((url) =>
              typeof url === "string" ? { url } : url,
            );
          }

          return {
            ...p,
            id: p.id,
            name: p.name || fields.name || "Unknown",
            email:
              p.email ||
              fields.email ||
              p.rawFieldData?.email ||
              `${p.slug || "practitioner"}@domain.com`,
            specialization: specialization,
            education: education,
            experience: experience,
            image: imageObj,
            "therapies-offered": therapies,
            "approach-to-care": approach,
            "research-papers": research,
            "certificate-images": certsArray,
            therapiesOffered: therapies,
            approachToCare: approach,
            certificateImages: certsArray,
            rawFieldData: fields,
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
        setSelectedPractitioner(null);
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

  const refreshOverviewData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchTherapyCount(),
        fetchBlogLength(),
        loadDashboard(),
        fetchSubscriptions(),
        fetchPractitioners("pending"),
        fetchPractitioners("live"),
        fetchUserManagementData(),
      ]);
    } catch (err) {
      console.error("Error running dashboard lifecycle:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "practitioners") {
      fetchPractitioners(practitionerSubTab);
    }
    if (activeTab === "Usermanagement") {
      fetchUserManagementData();
    }
  }, [practitionerSubTab, activeTab]);

  useEffect(() => {
    refreshOverviewData();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 flex font-sans text-gray-800">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col p-2">
        <div className="p-6 text-2xl font-semibold text-black tracking-tight">
          Dashboard
        </div>
        <nav className="flex-1 flex flex-col gap-2 mt-4">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full font-medium text-left px-6 py-3 transition rounded-xl text-md flex items-center gap-3 ${activeTab === "overview" ? "bg-[#5932EA] text-white" : "text-[#9197B3] hover:bg-slate-200"}`}
          >
            <FaKey /> Overview
          </button>
          <button
            onClick={() => setActiveTab("Usermanagement")}
            className={`w-full font-medium text-left px-6 py-3 transition rounded-xl text-md flex items-center gap-3 ${activeTab === "Usermanagement" ? "bg-[#5932EA] text-white" : "text-[#9197B3] hover:bg-slate-200"}`}
          >
            <FaUsers /> User Management
          </button>
          <button
            onClick={() => setActiveTab("practitioners")}
            className={`w-full font-medium text-left px-6 py-3 transition rounded-xl text-md flex items-center gap-3 ${activeTab === "practitioners" ? "bg-[#5932EA] text-white" : "text-[#9197B3] hover:bg-slate-200"}`}
          >
            <FaUserMd /> Practitioners ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab("AiRoadmap")}
            className={`w-full font-medium text-left px-6 py-3 transition rounded-xl text-md flex items-center gap-3 ${activeTab === "AiRoadmap" ? "bg-[#5932EA] text-white" : "text-[#9197B3] hover:bg-slate-200"}`}
          >
            <FaBrain /> Ai Roadmap
          </button>
          <button
            onClick={() => setActiveTab("TherapiesManagement")}
            className={`w-full font-medium text-left px-6 py-3 transition rounded-xl text-md flex items-center gap-3 ${activeTab === "TherapiesManagement" ? "bg-[#5932EA] text-white" : "text-[#9197B3] hover:bg-slate-200"}`}
          >
            <FaBookMedical /> Therapies Management
          </button>
          <button
            onClick={() => setActiveTab("ConditionManagement")}
            className={`w-full font-medium text-left px-6 py-3 transition rounded-xl text-md flex items-center gap-3 ${activeTab === "ConditionManagement" ? "bg-[#5932EA] text-white" : "text-[#9197B3] hover:bg-slate-200"}`}
          >
            <FaHandHoldingMedical /> Condition Management
          </button>
          <button
            onClick={() => setActiveTab("LearningHub")}
            className={`w-full font-medium text-left px-6 py-3 transition rounded-xl text-md flex items-center gap-3 ${activeTab === "LearningHub" ? "bg-[#5932EA] text-white" : "text-[#9197B3] hover:bg-slate-200"}`}
          >
            <FaBookOpen /> Learning Hub
          </button>
          <button
            onClick={() => setActiveTab("ResearchDigest")}
            className={`w-full font-medium text-left px-6 py-3 transition rounded-xl text-md flex items-center gap-3 ${activeTab === "ResearchDigest" ? "bg-[#5932EA] text-white" : "text-[#9197B3] hover:bg-slate-200"}`}
          >
            <FaRegNewspaper /> Research Digest
          </button>
        </nav>
      </aside>

      {/* VIEWPORT LAYOUT WRAPPER */}
      <section className="flex-1 p-8 overflow-y-auto relative">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-medium text-gray-800 capitalize">
              {activeTab === "practitioners"
                ? `Practitioners Management`
                : activeTab === "Usermanagement"
                  ? "User Directory Management"
                  : activeTab}
            </h1>

            {activeTab === "overview" && (
              <button
                onClick={refreshOverviewData}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-[#5932EA] hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-all"
              >
                <FaSync className={loading ? "animate-spin" : ""} size={16} />
              </button>
            )}

            {activeTab === "Usermanagement" && (
              <button
                onClick={fetchUserManagementData}
                disabled={userManagementLoading}
                className="p-2 text-gray-400 hover:text-[#5932EA] hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-all"
              >
                <FaSync
                  className={userManagementLoading ? "animate-spin" : ""}
                  size={16}
                />
              </button>
            )}
          </div>

          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium">
            June 15, 2026
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
            Error parsing application state: {error}
          </div>
        )}

        {/* OVERVIEW TAB RENDER */}
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

            {/* OVERVIEW SUBSCRIBERS TABLE */}
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

        {/* USER MANAGEMENT TAB RENDER (UPDATED WITH GRAPH LAYOUT) */}
        {activeTab === "Usermanagement" && (
          <div className="space-y-6">
            {/* NEW GRAPH AND METRIC GRID WRAPPER LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* GRAPH SECTION (Updated to Match the Reference Bar Style) */}
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-medium text-gray-900 tracking-tight">
                        User Registration Growth
                      </h2>
                    </div>
                    {/* Optional Legend Badge */}
                    <span className="text-xs font-semibold bg-indigo-50 text-[#5932EA] px-3 py-1 rounded-full border border-indigo-100">
                      Monthly Total
                    </span>
                  </div>
                </div>

                {/* Live Recharts Bar Canvas */}
                <div className="w-full h-64 mt-2">
                  {userManagementLoading ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 italic text-sm">
                      Generating metrics chart metrics...
                    </div>
                  ) : monthlyGrowthData.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 italic text-sm">
                      No user timeline data found.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyGrowthData}
                        margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                        barSize={40} // Adjusts bar thickness to look clean like your reference img
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#F1F5F9"
                        />
                        <XAxis
                          dataKey="name"
                          stroke="#9197B3"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#9197B3"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          cursor={{ fill: "#F8FAFC", opacity: 0.4 }}
                          contentStyle={{
                            background: "#fff",
                            borderRadius: "12px",
                            border: "1px solid #E2E8F0",
                          }}
                        />
                        <Bar
                          dataKey="Users"
                          radius={[8, 8, 0, 0]} // Gives sleek rounded tops to the bars
                        >
                          {/* dynamically fills the bars with your dashboard brand color */}
                          {monthlyGrowthData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="#5932EA" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* FOOTER ROW: Dynamic Percentage Changes (Matches your image layout) */}
                {!userManagementLoading && monthlyGrowthData.length > 0 && (
                  <div className="border-t border-gray-100 mt-4 pt-4">
                    <div className="grid grid-flow-col auto-cols-fr gap-2 text-center text-xs">
                      <div className="text-gray-400 font-medium text-left">
                        Month of Month Change:
                      </div>
                      {monthlyGrowthData.map((data, idx) => {
                        if (idx === 0)
                          return (
                            <div
                              key={idx}
                              className="text-gray-400 font-medium"
                            >
                              -
                            </div>
                          );

                        const prevUsers = monthlyGrowthData[idx - 1].Users;
                        const currentUsers = data.Users;

                        // Calculate % change velocity
                        let percentChange = 0;
                        if (prevUsers > 0) {
                          percentChange =
                            ((currentUsers - prevUsers) / prevUsers) * 100;
                        } else if (currentUsers > 0) {
                          percentChange = 100;
                        }

                        return (
                          <div
                            key={idx}
                            className={`font-semibold ${percentChange >= 0 ? "text-green-600" : "text-red-500"}`}
                          >
                            {percentChange >= 0
                              ? `+${percentChange.toFixed(1)}%`
                              : `${percentChange.toFixed(1)}%`}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* VERTICAL SCORECARDS (Takes 1 Column) */}
              <div className="flex flex-col gap-4 justify-between">
                <div
                  onClick={() => setUserFilter("all")}
                  className={`p-5 flex-1 rounded-3xl border transition-all cursor-pointer flex flex-col justify-center ${userFilter === "all" ? "bg-[#5932EA] text-white border-transparent" : "bg-white border-gray-200 hover:border-indigo-300 text-gray-900"}`}
                >
                  <div className="flex justify-between items-center">
                    <h3
                      className={`text-xs font-medium uppercase tracking-wider ${userFilter === "all" ? "text-indigo-100" : "text-gray-400"}`}
                    >
                      Total Registrations
                    </h3>
                    <FaUsers
                      size={20}
                      className={
                        userFilter === "all" ? "text-white" : "text-indigo-500"
                      }
                    />
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {userManagementLoading ? "..." : computedTotalUsersCount}
                  </p>
                </div>

                <div
                  onClick={() => setUserFilter("subscribed")}
                  className={`p-5 flex-1 rounded-3xl border transition-all cursor-pointer flex flex-col justify-center ${userFilter === "subscribed" ? "bg-[#5932EA] text-white border-transparent" : "bg-white border-gray-200 hover:border-indigo-300 text-gray-900"}`}
                >
                  <div className="flex justify-between items-center">
                    <h3
                      className={`text-xs font-medium uppercase tracking-wider ${userFilter === "subscribed" ? "text-indigo-100" : "text-gray-400"}`}
                    >
                      Subscribed Users
                    </h3>
                    <FaCrown
                      size={18}
                      className={
                        userFilter === "subscribed"
                          ? "text-white"
                          : "text-amber-500"
                      }
                    />
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {userManagementLoading ? "..." : computedSubscribedCount}
                  </p>
                </div>

                <div
                  onClick={() => setUserFilter("unsubscribed")}
                  className={`p-5 flex-1 rounded-3xl border transition-all cursor-pointer flex flex-col justify-center ${userFilter === "unsubscribed" ? "bg-[#5932EA] text-white border-transparent" : "bg-white border-gray-200 hover:border-indigo-300 text-gray-900"}`}
                >
                  <div className="flex justify-between items-center">
                    <h3
                      className={`text-xs font-medium uppercase tracking-wider ${userFilter === "unsubscribed" ? "text-indigo-100" : "text-gray-400"}`}
                    >
                      Unsubscribed Users
                    </h3>
                    <FaUserMinus
                      size={18}
                      className={
                        userFilter === "unsubscribed"
                          ? "text-white"
                          : "text-red-400"
                      }
                    />
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {userManagementLoading ? "..." : computedUnsubscribedCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Tab Listing Filter Controls */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6">
              <div className="flex border-b border-gray-200 mb-6 gap-6">
                <button
                  onClick={() => setUserFilter("all")}
                  className={`pb-3 font-semibold text-base transition-all border-b-2 px-2 ${userFilter === "all" ? "border-[#5932EA] text-[#5932EA]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                >
                  All Users ({computedTotalUsersCount})
                </button>
                <button
                  onClick={() => setUserFilter("subscribed")}
                  className={`pb-3 font-semibold text-base transition-all border-b-2 px-2 ${userFilter === "subscribed" ? "border-[#5932EA] text-[#5932EA]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                >
                  Subscribed Accounts ({computedSubscribedCount})
                </button>
                <button
                  onClick={() => setUserFilter("unsubscribed")}
                  className={`pb-3 font-semibold text-base transition-all border-b-2 px-2 ${userFilter === "unsubscribed" ? "border-[#5932EA] text-[#5932EA]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                >
                  Unsubscribed Accounts ({computedUnsubscribedCount})
                </button>
              </div>

              {userManagementLoading ? (
                <p className="text-gray-500 italic py-6 text-sm">
                  Querying database rows records...
                </p>
              ) : filteredUsersDisplayList.length === 0 ? (
                <p className="text-gray-500 italic py-6 text-sm">
                  No profiles found for this selection query view.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-4 px-6">User ID</th>
                        <th className="py-4 px-6">Name</th>
                        <th className="py-4 px-6">Email Address</th>
                        <th className="py-4 px-6 text-center">
                          Premium Access
                        </th>
                        <th className="py-4 px-6 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {filteredUsersDisplayList.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-slate-50 transition"
                        >
                          <td className="py-4 px-6 font-mono text-xs text-gray-400 max-w-32 truncate select-all">
                            {user.id}
                          </td>
                          <td className="py-4 px-6 font-semibold text-gray-900">
                            {user.name}
                          </td>
                          <td className="py-4 px-6 text-gray-600">
                            {user.email}
                          </td>
                          <td className="py-4 px-6 text-center">
                            {user.isSubscribed ? (
                              <span className="inline-block text-green-700 bg-green-50 px-3 py-1 border border-green-200 font-semibold rounded-full text-xs uppercase">
                                Active ({user.subscription?.plan || "Premium"})
                              </span>
                            ) : (
                              <span className="inline-block text-gray-500 bg-gray-100 px-3 py-1 border border-gray-200 font-medium rounded-full text-xs uppercase">
                                Inactive / Free
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="bg-blue-100 text-blue-600 py-1.5 px-3 rounded-xl font-medium text-sm inline-flex items-center gap-1 hover:bg-blue-200 transition mx-auto"
                            >
                              <FaEye size={14} /> View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRACTITIONERS MANAGEMENT TAB RENDER */}
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
                              <button
                                onClick={() => setSelectedPractitioner(p)}
                                className="bg-blue-100 text-blue-600 py-1.5 px-3 rounded-xl font-medium text-sm flex items-center gap-1 hover:bg-blue-200 transition"
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

      {/* MODAL WINDOW: USER FILE SPECIFIC SUMMARY INFO */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-[1px]">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-medium text-gray-800">
                User Profile Card Summary
              </h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              <div className="flex items-center gap-4 border-b pb-4 border-gray-100">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${selectedUser.isSubscribed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                >
                  {selectedUser.name
                    ? selectedUser.name.charAt(0).toUpperCase()
                    : "?"}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedUser.name}
                  </h3>
                  <p className="text-gray-500">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                    Database Reference Account Key
                  </h4>
                  <p className="font-mono text-xs bg-gray-50 border p-2 rounded-md select-all truncate">
                    {selectedUser.id}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                    Platform Registration Date
                  </h4>
                  <p className="text-gray-800 p-2 bg-gray-50 rounded-md border">
                    {selectedUser.created_at
                      ? new Date(selectedUser.created_at).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "long", day: "numeric" },
                        )
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  Subscription Status Overview Details
                </h3>

                {selectedUser.subscription ? (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                        Plan Name Tier:
                      </span>
                      <span className="font-bold text-indigo-600 capitalize text-xs">
                        {selectedUser.subscription.plan}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                        Stripe Status Field:
                      </span>
                      <span
                        className={`font-semibold text-xs px-2 py-0.5 rounded-full ${selectedUser.isSubscribed ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
                      >
                        {selectedUser.subscription.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                        Access Period Expiration End Date:
                      </span>
                      <span className="font-medium text-gray-900 text-xs">
                        {selectedUser.subscription.current_period_end
                          ? new Date(
                              selectedUser.subscription.current_period_end,
                            ).toLocaleString("en-US", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "Continuous Access / Lifelong Tier"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 text-center">
                    <p className="text-sm text-gray-500 font-medium italic">
                      This user has not initiated premium checkouts or active
                      subscriptions on this platform profile record.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRACTITIONER APPLICATION REVIEW MODAL */}
      {selectedPractitioner && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
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

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
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
