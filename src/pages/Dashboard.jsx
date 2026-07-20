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
  FaTrash,
  FaComments,
  FaPlus,
  FaEdit,
  FaDownload
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
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FaFilePdf, FaClipboardList } from "react-icons/fa";

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

  const [communityPosts, setCommunityPosts] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityFilter, setCommunityFilter] = useState("pending"); // "pending" | "approved"
  const [editingPost, setEditingPost] = useState(null); // Tracks post metadata details during updates
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [newTestimonialForm, setNewTestimonialForm] = useState({
    username: "",
    header: "",
    content: "",
    tag: "",
  });

  // --- AI ROADMAP STORAGE STATES ---
  const [roadmapsList, setRoadmapsList] = useState([]);
  const [roadmapModalUser, setRoadmapModalUser] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [allLivePractitioners, setAllLivePractitioners] = useState([]);
  const [isAssigningId, setIsAssigningId] = useState(null);

  const fetchLivePractitionersList = async () => {
    try {
      const { data, error } = await supabase
        .from("practitioners")
        .select("id, name, specialization")
        .eq("status", "live")
        .order("name", { ascending: true });
      if (!error && data) setAllLivePractitioners(data);
    } catch (err) {
      console.error("Error reading live practitioners index:", err);
    }
  };

  const handleSendToPractitioner = async (
    roadmapId,
    userId,
    practitionerId,
  ) => {
    if (!practitionerId) {
      alert("Please select a practitioner target agent node first.");
      return;
    }
    try {
      setIsAssigningId(roadmapId);
      const { error } = await supabase
        .from("practitioner_roadmap_assignments")
        .insert([
          {
            practitioner_id: practitionerId,
            user_id: userId,
            roadmap_id: roadmapId,
          },
        ]);

      if (error) {
        if (error.message.includes("duplicate key")) {
          throw new Error(
            "This evaluation roadmap data has already been shared with this specific practitioner profile mapping.",
          );
        }
        throw error;
      }
      alert(
        "User roadmap metrics shared successfully with the selected practitioner's workspace portal ledger panel!",
      );
    } catch (err) {
      alert(`Transfer Rejected: ${err.message}`);
    } finally {
      setIsAssigningId(null);
    }
  };

  const getClassificationText = (code) => {
    if (code === "NT") return "Neurodivergent";
    if (code === "ND") return "Neurotypical";
    return code || "Neurotypical";
  };

  const generateRoadmapPdf = (user, roadmapData) => {
    const doc = new jsPDF();

    // Header Accent Banner Configuration
    doc.setFillColor(89, 50, 234); // #5932EA Main Purple
    doc.rect(0, 0, 210, 40, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("COGNITIVE PROFILE ROADMAP", 15, 26);

    // User Profiling Demographic block area
    doc.setFontSize(11);
    doc.setTextColor(34, 34, 34);
    doc.text("PATIENT / USER METRICS DIRECTORY", 15, 54);

    doc.setFont("helvetica", "normal");
    doc.text(`Full Account Name :  ${user?.name || "Anonymous Guest"}`, 15, 64);
    doc.text(`Registered Email   :  ${user?.email || "N/A"}`, 15, 72);

    // Updated Classification Label Placement (NT -> Neurodivergent, ND -> Neurotypical)
    const classificationLabel = getClassificationText(
      roadmapData?.classification,
    );
    doc.setFont("helvetica", "bold");
    doc.text(`Classification    :  ${classificationLabel}`, 15, 88);

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 96, 195, 96);

    doc.setFont("helvetica", "bold");
    doc.text("Profile Summary", 15, 108);

    // Table without 'Recommended Therapies' column
    const mappedDomainsArray = roadmapData?.mapped_domains || [];
    const tableRows = mappedDomainsArray.map((item) => [
      item.domain || "General Domain",
      item.domain_type || "N/A",
      `${item.score ?? 0}%`,
      item.severity || "Low",
    ]);

    autoTable(doc, {
      startY: 114,
      head: [["Assessment Domain", "Domain Type", "Score", "Severity"]],
      body: tableRows,
      headStyles: { fillColor: [89, 50, 234], fontStyle: "bold" },
      bodyStyles: { font: "helvetica", fontSize: 10 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 15, right: 15 },
      theme: "striped",
    });

    // Aggregated Recommendations Section
    const finalY = doc.lastAutoTable.finalY || 180;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Recommendations:", 15, finalY + 12);

    const aggregatedTherapies = roadmapData?.aggregated_therapies || [];
    const aggRows = aggregatedTherapies.map((item) => [
      item.therapy || "N/A",
      Array.isArray(item.domains) ? item.domains.join(", ") : "N/A",
      Array.isArray(item.relevance) ? item.relevance.join(", ") : "N/A",
    ]);

    autoTable(doc, {
      startY: finalY + 16,
      head: [["Therapy", "Target Domains", "Relevance"]],
      body:
        aggRows.length > 0
          ? aggRows
          : [["No recommendations listed", "-", "-"]],
      headStyles: { fillColor: [89, 50, 234], fontStyle: "bold" },
      bodyStyles: { font: "helvetica", fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 15, right: 15 },
      theme: "striped",
    });

    doc.save(`Roadmap_Report_${user?.name || "User"}.pdf`);
  };

  const emailRoadmapPdf = async (user, roadmapData) => {
    if (!user?.email) {
      alert("This profile lacks a valid destination email target.");
      return;
    }

    try {
      setIsSendingEmail(true);

      const doc = new jsPDF();

      doc.setFillColor(89, 50, 234);
      doc.rect(0, 0, 210, 40, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("COGNITIVE PROFILE ROADMAP", 15, 26);

      doc.setFontSize(11);
      doc.setTextColor(34, 34, 34);
      doc.text("PATIENT / USER METRICS DIRECTORY", 15, 54);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Full Account Name :  ${user?.name || "Anonymous Guest"}`,
        15,
        64,
      );
      doc.text(`Registered Email   :  ${user?.email || "N/A"}`, 15, 72);

      const classificationLabel = getClassificationText(
        roadmapData?.classification,
      );
      doc.setFont("helvetica", "bold");
      doc.text(`Classification    :  ${classificationLabel}`, 15, 88);
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 96, 195, 96);
      doc.setFont("helvetica", "bold");
      doc.text("Profile Summary", 15, 108);

      const mappedDomainsArray = roadmapData?.mapped_domains || [];
      const tableRows = mappedDomainsArray.map((item) => [
        item.domain || "General Domain",
        item.domain_type || "N/A",
        `${item.score ?? 0}%`,
        item.severity || "Low",
      ]);

      autoTable(doc, {
        startY: 114,
        head: [["Assessment Domain", "Domain Type", "Score", "Severity"]],
        headStyles: { fillColor: [89, 50, 234], fontStyle: "bold" },
        body: tableRows,
        bodyStyles: { font: "helvetica", fontSize: 10 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 15, right: 15 },
        theme: "striped",
      });

      const finalY = doc.lastAutoTable.finalY || 180;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Recommendations:", 15, finalY + 12);

      const aggregatedTherapies = roadmapData?.aggregated_therapies || [];
      const aggRows = aggregatedTherapies.map((item) => [
        item.therapy || "N/A",
        Array.isArray(item.domains) ? item.domains.join(", ") : "N/A",
        Array.isArray(item.relevance) ? item.relevance.join(", ") : "N/A",
      ]);

      autoTable(doc, {
        startY: finalY + 16,
        head: [["Therapy", "Target Domains", "Relevance"]],
        body:
          aggRows.length > 0
            ? aggRows
            : [["No recommendations listed", "-", "-"]],
        headStyles: { fillColor: [89, 50, 234], fontStyle: "bold" },
        bodyStyles: { font: "helvetica", fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 15, right: 15 },
        theme: "striped",
      });

      const pdfBase64Raw = doc.output("datauristring");
      const base64Content = pdfBase64Raw.split(",")[1];

      const { data, error } = await supabase.functions.invoke(
        "send-roadmap-email",
        {
          method: "POST",
          body: {
            recipientEmail: user.email,
            recipientName: user.name || "Valued Member",
            pdfAttachment: base64Content,
            fileName: `Roadmap_Report_${user.name || "User"}.pdf`,
          },
        },
      );

      if (error) throw error;

      if (data?.success) {
        alert(`Roadmap layout successfully dispatched to ${user.email}!`);
      } else {
        throw new Error(
          data?.error || "Pipeline processed with unknown validation errors.",
        );
      }
    } catch (err) {
      console.error("Email workflow tracking error:", err);
      alert(`Failed mailing metrics sheet document: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };
  const fetchRoadmapsFromDb = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roadmap_mapped") // 🌟 Pointed exactly to your new table configuration
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setRoadmapsList(data || []);
    } catch (err) {
      console.error("Error gathering system roadmap parameters:", err.message);
    }
  };

  const [tagsList, setTagsList] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [newTagName, setNewConditionTagName] = useState("");
  const [communitySubView, setCommunitySubTabFilter] = useState("posts"); // "posts" | "tags"
  const fetchCommunityPosts = async () => {
    try {
      setCommunityLoading(true);
      const { data, error } = await supabase
        .from("community_hub")
        .select(
          `
          *,
          community_tags ( name )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCommunityPosts(data || []);
    } catch (err) {
      console.error("Error collecting community node assets:", err.message);
    } finally {
      setCommunityLoading(false);
    }
  };

  const fetchCommunityTags = async () => {
    try {
      setTagsLoading(true);
      const { data, error } = await supabase
        .from("community_tags")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setTagsList(data || []);
    } catch (err) {
      console.error("Dynamic sync caught exception:", err.message);
    } finally {
      setTagsLoading(false);
    }
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      const { error } = await supabase
        .from("community_tags")
        .insert([{ name: newTagName.trim() }]);

      if (error) throw error;
      alert("New tag added successfully!");
      setNewConditionTagName("");
      fetchCommunityTags();
    } catch (err) {
      alert(`Tag generation failed: ${err.message}`);
    }
  };

  const handleDeleteTag = async (id) => {
    if (
      !window.confirm(
        "Permanently purge this item from layout dropdown configuration? Affected posts will default to unassigned.",
      )
    )
      return;
    try {
      const { error } = await supabase
        .from("community_tags")
        .delete()
        .eq("id", id);

      if (error) throw error;
      alert("Tag purged.");
      fetchCommunityTags();
      fetchCommunityPosts();
    } catch (err) {
      alert(`Action rejected: ${err.message}`);
    }
  };
  const handleUpdatePostStatus = async (id, status) => {
    try {
      const { error } = await supabase
        .from("community_hub")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      alert(`Post marked as ${status}!`);
      fetchCommunityPosts();
    } catch (err) {
      alert(`Failed changing index configurations: ${err.message}`);
    }
  };

  const handleDeletePost = async (id) => {
    if (
      !window.confirm(
        "Permanently purge this item from community layout registries?",
      )
    )
      return;
    try {
      const { error } = await supabase
        .from("community_hub")
        .delete()
        .eq("id", id);

      if (error) throw error;
      alert("Post purged successfully.");
      fetchCommunityPosts();
    } catch (err) {
      alert(`Action rejected: ${err.message}`);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("community_hub")
        .update({
          username: editingPost.username,
          header: editingPost.header || null,
          tag_id: editingPost.tag_id || null,
          content: editingPost.content,
        })
        .eq("id", editingPost.id);

      if (error) throw error;
      alert("Post details updated successfully.");
      setEditingPost(null);
      fetchCommunityPosts();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleCreateTestimonial = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("community_hub").insert([
        {
          username: newTestimonialForm.username,
          header: newTestimonialForm.header || null,
          tag_id: newTestimonialForm.tag_id || null,
          content: newTestimonialForm.content,
          status: "approved",
        },
      ]);

      if (error) throw error;
      alert("Testimonial registered successfully.");
      setIsTestimonialModalOpen(false);
      setNewTestimonialForm({ username: "", header: "", content: "", tag: "" });
      fetchCommunityPosts();
    } catch (err) {
      alert(`Creation error: ${err.message}`);
    }
  };
  // Modal State
  const [selectedPractitioner, setSelectedPractitioner] = useState(null);

  // Navigation Tabs States
  const [activeTab, setActiveTab] = useState("overview");
  const [practitionerSubTab, setPractitionerSubTab] = useState("pending");

  // --- THERAPIES MANAGEMENT EXTRA HOOKS ---
  const [therapiesList, setTherapiesList] = useState([]);
  const [therapiesLoading, setTherapiesLoading] = useState(false);
  const [selectedTherapyDetail, setSelectedTherapyDetail] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Reference Collection Dropdown States
  const [conditionsOptions, setConditionsOptions] = useState([]);
  const [deliveriesOptions, setDeliveriesOptions] = useState([]);
  const [formatsOptions, setFormatsOptions] = useState([]);
  const [mainFiltersOptions, setMainFiltersOptions] = useState([]);

  const [newTherapyForm, setNewTherapyForm] = useState({
    name: "",
    targetArea: "",
    postSummary: "",
    postBody: "",
    imageUrl: "",
    thumbnailUrl: "",
    conditionId: "",
    deliveryId: "",
    formatId: "",
    mainCategoryId: "",
  });

  // --- CONDITION MANAGEMENT TAB STATES ---
  const [conditionsList, setConditionsList] = useState([]);
  const [conditionsLoading, setConditionsLoading] = useState(false);
  const [newConditionName, setNewConditionName] = useState("");
  const CONDITION_COLLECTION_ID = "6a2153b39dd6cbc89e2cd831";

  // --- RESEARCH DIGEST (BLOGS) MANAGEMENT STATES ---
  const [blogsList, setBlogsList] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(false);
  const [blogTagsOptions, setBlogTagsOptions] = useState([]);
  const [selectedBlogDetail, setSelectedBlogDetail] = useState(null);
  const [isCreateBlogModalOpen, setIsCreateBlogModalOpen] = useState(false);

  const [newBlogForm, setNewBlogForm] = useState({
    name: "",
    heroText: "",
    image: "",
    thisIsTheMainParagraph: "",
    filterTag: "",
    thisTheFirstPlainText: "",
    tagTitle: "",
    timeToRead: "",
    authorsName: "",
    podcastVideoUrl: "",
  });

  const BLOGS_COLLECTION_ID = "6a23cdf5d3cdf3ce98515784";
  const TAGS_COLLECTION_ID = "6a4a29998a1508d3ea0976f9";

  const uploadVideoToSupabase = async (file) => {
    if (!file) return null;
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `podcasts/${fileName}`;

      const { data, error } = await supabase.storage
        .from("therapy-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("therapy-images")
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Video storage upload error:", error.message);
      alert(`Video upload failed: ${error.message}`);
      return null;
    }
  };

  const fetchBlogsFromCms = async () => {
    try {
      setBlogsLoading(true);
      const res = await fetch(
        `https://obzogpozgoolhededqkb.supabase.co/functions/v1/get-blogs?collection=${BLOGS_COLLECTION_ID}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!res.ok) throw new Error("Failed fetching blogs mapping archive");
      const data = await res.json();
      setBlogsList(data?.items || []);
    } catch (err) {
      console.error("Error reading blogs collection:", err);
    } finally {
      setBlogsLoading(false);
    }
  };

  const fetchBlogTagsFromCms = async () => {
    try {
      const res = await fetch(
        `https://obzogpozgoolhededqkb.supabase.co/functions/v1/get-blogs?collection=${TAGS_COLLECTION_ID}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!res.ok) throw new Error("Failed fetching tags metadata options");
      const data = await res.json();
      setBlogTagsOptions(data?.items || []);
    } catch (err) {
      console.error("Error gathering blog tags parameters:", err);
    }
  };

  const handleCreateBlogSubmit = async (e) => {
    e.preventDefault();

    const inferredSlug = newBlogForm.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    if (
      newBlogForm.image === "Uploading..." ||
      newBlogForm.podcastVideoUrl === "Uploading..."
    ) {
      alert("Please wait for your active media pipeline uploads to finish.");
      return;
    }

    const payload = {
      collectionId: BLOGS_COLLECTION_ID,
      isArchived: false,
      isDraft: false,
      fieldData: {
        name: newBlogForm.name,
        slug: inferredSlug,
        "hero-text": newBlogForm.heroText || null,
        image: newBlogForm.image
          ? { url: newBlogForm.image, alt: newBlogForm.name }
          : null,
        "this-is-the-main-paragraph":
          newBlogForm.thisIsTheMainParagraph || null,
        "filter-tag": newBlogForm.filterTag || null,
        "this-the-first-plain-text": newBlogForm.thisTheFirstPlainText || null,
        "tag-title": newBlogForm.tagTitle || null,
        "time-to-read": newBlogForm.timeToRead || null,
        "authors-name": newBlogForm.authorsName || null,
        "cta-image": newBlogForm.tagTitle || null,
        "podcast-cta-main": newBlogForm.podcastVideoUrl
          ? { url: newBlogForm.podcastVideoUrl, alt: newBlogForm.name }
          : null,
      },
    };

    try {
      const response = await fetch(
        "https://obzogpozgoolhededqkb.supabase.co/functions/v1/get-blogs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok)
        throw new Error("Server edge routing failed validation checks");

      alert("Content entry successfully written to Webflow CMS Repository!");
      setIsCreateBlogModalOpen(false);
      setNewBlogForm({
        name: "",
        heroText: "",
        image: "",
        thisIsTheMainParagraph: "",
        filterTag: "",
        thisTheFirstPlainText: "",
        tagTitle: "",
        timeToRead: "",
        authorsName: "",
        podcastVideoUrl: "",
      });
      fetchBlogsFromCms();
    } catch (err) {
      alert(`Publish entry aborted: ${err.message}`);
    }
  };

  const lookupTable = useMemo(() => {
    const map = new Map();
    const arrays = [
      conditionsOptions,
      deliveriesOptions,
      formatsOptions,
      mainFiltersOptions,
    ];
    arrays.forEach((arr) => {
      if (Array.isArray(arr)) {
        arr.forEach((item) => {
          if (item?.id && item?.fieldData?.name) {
            map.set(item.id, item.fieldData.name);
          }
        });
      }
    });
    return map;
  }, [
    conditionsOptions,
    deliveriesOptions,
    formatsOptions,
    mainFiltersOptions,
  ]);
  const uploadImageToSupabase = async (file) => {
    if (!file) return null;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `therapies/${fileName}`;

      const { data, error } = await supabase.storage
        .from("therapy-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("therapy-images")
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Storage uploading caught error:", error.message);
      alert(`File upload failed: ${error.message}`);
      return null;
    }
  };

  const fetchFormDropdownOptions = async () => {
    try {
      const fetchItems = async (collectionId) => {
        const res = await fetch(
          `https://obzogpozgoolhededqkb.supabase.co/functions/v1/get-blogs?collection=${collectionId}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          },
        );
        if (!res.ok) return [];
        const data = await res.json();
        return data?.items || [];
      };

      const [cond, deliv, form, mainF] = await Promise.all([
        fetchItems("6a2153b39dd6cbc89e2cd831"),
        fetchItems("6a21538114f11fc132b07488"),
        fetchItems("6a21534a0abca22da70d9c92"),
        fetchItems("6a1c7c260e4017306f072008"),
      ]);

      setConditionsOptions(cond);
      setDeliveriesOptions(deliv);
      setFormatsOptions(form);
      setMainFiltersOptions(mainF);
    } catch (err) {
      console.error("Error gathering relational option parameters:", err);
    }
  };

  const fetchTherapiesFromCms = async () => {
    try {
      setTherapiesLoading(true);
      const response = await fetch(
        "https://obzogpozgoolhededqkb.supabase.co/functions/v1/get-blogs",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const data = await response.json();

      if (data?.items) {
        setTherapiesList(data.items);
      }
      if (data?.pagination?.total !== undefined) {
        setTherapyCount(data.pagination.total);
      }
    } catch (err) {
      console.error("Critical error reading therapies data:", err);
    } finally {
      setTherapiesLoading(false);
    }
  };

  const fetchConditionsTabCms = async () => {
    try {
      setConditionsLoading(true);
      const res = await fetch(
        `https://obzogpozgoolhededqkb.supabase.co/functions/v1/get-blogs?collection=${CONDITION_COLLECTION_ID}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!res.ok) throw new Error("Failed fetching system conditions layout.");
      const data = await res.json();
      setConditionsList(data?.items || []);
      setConditionsOptions(data?.items || []);
    } catch (err) {
      console.error("Error parsing clinical condition records:", err);
    } finally {
      setConditionsLoading(false);
    }
  };

  const handleCreateCondition = async (e) => {
    e.preventDefault();
    if (!newConditionName.trim()) return;

    const inferredSlug = newConditionName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    const payload = {
      isArchived: false,
      isDraft: false,
      fieldData: {
        name: newConditionName,
        slug: inferredSlug,
      },
    };

    try {
      setConditionsLoading(true);
      const response = await fetch(
        `https://obzogpozgoolhededqkb.supabase.co/functions/v1/get-blogs?collection=${CONDITION_COLLECTION_ID}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData?.error || "Schema entry save validation rejected.",
        );
      }

      alert("Clinical condition uploaded to Webflow successfully!");
      setNewConditionName("");
      fetchConditionsTabCms();
    } catch (err) {
      alert(`Failed writing condition entry: ${err.message}`);
    } finally {
      setConditionsLoading(false);
    }
  };

  const handleDeleteCondition = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this condition? This operation is permanent.",
      )
    )
      return;

    try {
      setConditionsLoading(true);
      setConditionsList((prev) => prev.filter((item) => item.id !== id));

      const response = await fetch(
        "https://obzogpozgoolhededqkb.supabase.co/functions/v1/get-blogs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            itemId: id,
            collectionId: CONDITION_COLLECTION_ID,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || "Server rejected deletion endpoint request.",
        );
      }

      alert("Condition completely deleted.");
    } catch (err) {
      console.error("Delete handler error details:", err);
      alert(`Error deleting record: ${err.message}`);
    } finally {
      setConditionsLoading(false);
      fetchConditionsTabCms();
    }
  };

  const handleOpenCreateModal = async () => {
    setIsCreateModalOpen(true);
    await fetchFormDropdownOptions();
  };

  const handleCreateTherapy = async (e) => {
    e.preventDefault();

    const inferredSlug = newTherapyForm.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    if (
      newTherapyForm.imageUrl === "Uploading..." ||
      newTherapyForm.thumbnailUrl === "Uploading..."
    ) {
      alert(
        "Please wait for your images to finish uploading to Supabase before committing.",
      );
      return;
    }
    const payload = {
      isArchived: false,
      isDraft: false,
      fieldData: {
        name: newTherapyForm.name,
        slug: inferredSlug,
        "target-area": newTherapyForm.targetArea,
        "title-name": newTherapyForm.titleName,
        "post-summary": newTherapyForm.postSummary || null,
        "post-body": newTherapyForm.postBody || null,
        "main-image": newTherapyForm.imageUrl
          ? { url: newTherapyForm.imageUrl, alt: newTherapyForm.name }
          : null,
        "thumbnail-image": newTherapyForm.thumbnailUrl
          ? { url: newTherapyForm.thumbnailUrl, alt: newTherapyForm.name }
          : null,
        "main-categories": newTherapyForm.mainCategoryId || null,
        conditions: newTherapyForm.conditionId || null,
        deliveries: newTherapyForm.deliveryId || null,
        formats: newTherapyForm.formatId || null,
        featured: false,
      },
    };

    try {
      const response = await fetch(
        "https://obzogpozgoolhededqkb.supabase.co/functions/v1/get-blogs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData?.error || "Schema block save validation rejected.",
        );
      }

      alert("Therapy record synced successfully to Webflow CMS!");
      setIsCreateModalOpen(false);
      setNewTherapyForm({
        name: "",
        targetArea: "",
        titleName: "",
        postSummary: "",
        postBody: "",
        imageUrl: "",
        thumbnailUrl: "",
        conditionId: "",
        deliveryId: "",
        formatId: "",
        mainCategoryId: "",
      });
      fetchTherapiesFromCms();
    } catch (err) {
      alert(`Failed writing entry row: ${err.message}`);
    }
  };

  const handleDeleteTherapy = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this therapy? This operation is permanent.",
      )
    )
      return;

    try {
      setTherapiesList((prev) => prev.filter((item) => item.id !== id));
      setTherapyCount((prev) => Math.max(0, prev - 1));

      const response = await fetch(
        "https://obzogpozgoolhededqkb.supabase.co/functions/v1/get-blogs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", itemId: id }),
        },
      );

      if (!response.ok)
        throw new Error("Server rejected deletion routing handler request.");
    } catch (err) {
      console.error("Delete handler error details:", err);
      fetchTherapiesFromCms();
    }
  };

  const fetchUserManagementData = async () => {
    try {
      setUserManagementLoading(true);

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

  const computedTotalUsersCount = allUsersList.length;
  const computedSubscribedCount = allUsersList.filter(
    (u) => u.isSubscribed,
  ).length;
  const computedUnsubscribedCount =
    computedTotalUsersCount - computedSubscribedCount;

  const monthlyGrowthData = useMemo(() => {
    const monthlyMap = {};

    allUsersList.forEach((user) => {
      if (!user.created_at) return;
      const date = new Date(user.created_at);
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

    return Object.values(monthlyMap).sort((a, b) => a.sortKey - b.sortKey);
  }, [allUsersList]);

  const filteredUsersDisplayList = allUsersList.filter((u) => {
    if (userFilter === "subscribed") return u.isSubscribed;
    if (userFilter === "unsubscribed") return !u.isSubscribed;
    return true;
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
            p.specialization ||
            fields.specialization ||
            fields["specialization"] ||
            "General Practitioner";
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
        fetchTherapiesFromCms(),
        fetchFormDropdownOptions(),
        fetchBlogLength(),
        loadDashboard(),
        fetchSubscriptions(),
        fetchPractitioners("pending"),
        fetchPractitioners("live"),
        fetchUserManagementData(),
        fetchCommunityPosts(),
        fetchCommunityTags(),
      ]);
    } catch (err) {
      console.error("Error running dashboard lifecycle:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isCurrentlyRefreshing = useMemo(() => {
    if (activeTab === "overview") return loading;
    if (activeTab === "Usermanagement") return userManagementLoading;
    if (activeTab === "practitioners") return practitionersLoading;
    if (activeTab === "TherapiesManagement") return therapiesLoading;
    if (activeTab === "CommunityHub") return communityLoading || tagsLoading;
    return false;
  }, [
    activeTab,
    loading,
    userManagementLoading,
    practitionersLoading,
    therapiesLoading,
    communityLoading,
    tagsLoading,
  ]);

  useEffect(() => {
    if (activeTab === "practitioners") {
      fetchPractitioners(practitionerSubTab);
    }
    if (activeTab === "Usermanagement") {
      fetchUserManagementData();
    }
    if (activeTab === "TherapiesManagement") {
      fetchTherapiesFromCms();
    }
    if (activeTab === "ConditionManagement") {
      fetchConditionsTabCms();
    }
    if (activeTab === "CommunityHub") {
      fetchCommunityPosts();
      fetchCommunityTags();
    }
    if (activeTab === "ResearchDigest") {
      fetchBlogsFromCms();
      fetchBlogTagsFromCms();
    }
    if (activeTab === "AiRoadmap") {
      fetchRoadmapsFromDb();
      fetchUserManagementData();
    }
  }, [practitionerSubTab, activeTab]);

  const filteredCommunityList = useMemo(() => {
    return communityPosts.filter((p) => p.status === communityFilter);
  }, [communityPosts, communityFilter]);

  useEffect(() => {
    refreshOverviewData();
  }, []);

  return (
    <main className="h-screen manrope bg-gray-100 flex font-sans text-gray-800 overflow-hidden">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col p-2 shrink-0 h-full">
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
            <FaUserMd /> Practitioners{" "}
            <span className="text-white bg-[#5932EA] p-2.5 py-1 rounded-full text-sm">
              {pendingCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("CommunityHub")}
            className={`w-full font-medium text-left px-6 py-3 transition rounded-xl text-md flex items-center gap-3 ${activeTab === "CommunityHub" ? "bg-[#5932EA] text-white" : "text-[#9197B3] hover:bg-slate-200"}`}
          >
            <FaComments /> Community Hub
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
      <section className="flex-1 h-full p-8 overflow-y-auto min-w-0 relative">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-medium text-gray-800 capitalize">
              {activeTab === "overview" && "Overview Metrics Dashboard"}
              {activeTab === "CommunityHub" && "Community Hub & Testimonials"}
              {activeTab === "Usermanagement" && "User Directory Management"}
              {activeTab === "practitioners" &&
                "Practitioners Directory Management"}
              {activeTab === "TherapiesManagement" &&
                "Therapies CMS Repository"}
              {activeTab === "AiRoadmap" && "AI Assistant Roadmap"}
              {activeTab === "ConditionManagement" &&
                "Clinical Condition Filters"}
              {activeTab === "LearningHub" && "Learning Hub Articles"}
              {activeTab === "ResearchDigest" && "Medical Research Digest"}
            </h1>

            <button
              onClick={() => {
                if (activeTab === "overview") refreshOverviewData();
                if (activeTab === "Usermanagement") fetchUserManagementData();
                if (activeTab === "practitioners")
                  fetchPractitioners(practitionerSubTab);
                if (activeTab === "TherapiesManagement")
                  fetchTherapiesFromCms();
                if (activeTab === "CommunityHub") {
                  fetchCommunityPosts();
                  fetchCommunityTags();
                }
              }}
              className="p-2 text-gray-400 hover:text-[#5932EA] hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-all"
            >
              <FaSync
                className={
                  isCurrentlyRefreshing ? "animate-spin text-[#5932EA]" : ""
                }
                size={16}
              />
            </button>
          </div>

          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium">
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
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

              <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  <FaBookMedical size={24} />
                </div>
                <div>
                  <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                    Total Therapies
                  </h3>
                  <p className="text-3xl font-bold mt-1 text-gray-900">
                    {loading ? "..." : therapyCount}
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
            </div>

            {/* OVERVIEW SUBSCRIBERS TABLE */}
            <div className="w-full bg-white border border-gray-200 rounded-3xl mt-4">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-medium text-gray-800">
                  Active Subscriptions Base
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

        {/* USER MANAGEMENT TAB RENDER */}
        {activeTab === "Usermanagement" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-medium text-gray-900 tracking-tight">
                        User Registration Growth
                      </h2>
                    </div>
                    <span className="text-xs font-semibold bg-indigo-50 text-[#5932EA] px-3 py-1 rounded-full border border-indigo-100">
                      Monthly Total
                    </span>
                  </div>
                </div>

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
                        barSize={40}
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
                        <Bar dataKey="Users" radius={[8, 8, 0, 0]}>
                          {monthlyGrowthData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="#5932EA" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

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
                        let percentChange = 0;
                        if (prevUsers > 0)
                          percentChange =
                            ((currentUsers - prevUsers) / prevUsers) * 100;
                        else if (currentUsers > 0) percentChange = 100;
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
                  Querying database records...
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
                              title="view user"
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

        {activeTab === "CommunityHub" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-4 rounded-3xl border border-gray-200 gap-4">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setCommunitySubTabFilter("posts")}
                  className={`px-6 py-2 text-sm font-semibold rounded-xl transition ${communitySubView === "posts" ? "bg-[#5932EA] text-white" : "text-gray-400 hover:text-gray-600 hover:bg-slate-50"}`}
                >
                  Manage Content & Reviews
                </button>
                <button
                  onClick={() => setCommunitySubTabFilter("tags")}
                  className={`px-6 py-2 text-sm font-semibold rounded-xl transition ${communitySubView === "tags" ? "bg-[#5932EA] text-white" : "text-gray-400 hover:text-gray-600 hover:bg-slate-50"}`}
                >
                  Pre-defined Tags Pipeline
                </button>
              </div>
              {communitySubView === "posts" && (
                <button
                  onClick={() => setIsTestimonialModalOpen(true)}
                  className="bg-[#5932EA] hover:bg-[#4826c9] text-white font-medium py-2.5 px-6 rounded-xl transition flex items-center justify-center gap-2 text-sm sm:w-auto w-full"
                >
                  <FaPlus size={12} /> Create Testimonial
                </button>
              )}
            </div>

            {communitySubView === "posts" && (
              <div className="bg-white border border-gray-200 rounded-3xl p-6">
                <div className="flex border-b border-gray-200 mb-6 gap-6">
                  <button
                    onClick={() => setCommunityFilter("pending")}
                    className={`pb-3 font-semibold text-base transition-all border-b-2 px-2 ${communityFilter === "pending" ? "border-[#5932EA] text-[#5932EA]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                  >
                    Pending Approvals (
                    {
                      communityPosts.filter((p) => p.status === "pending")
                        .length
                    }
                    )
                  </button>
                  <button
                    onClick={() => setCommunityFilter("approved")}
                    className={`pb-3 font-semibold text-base transition-all border-b-2 px-2 ${communityFilter === "approved" ? "border-[#5932EA] text-[#5932EA]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                  >
                    Live Directory (
                    {
                      communityPosts.filter((p) => p.status === "approved")
                        .length
                    }
                    )
                  </button>
                </div>

                {communityLoading ? (
                  <p className="text-gray-500 italic py-6 text-sm">
                    Synchronizing table indexes...
                  </p>
                ) : filteredCommunityList.length === 0 ? (
                  <p className="text-gray-500 italic py-6 text-sm">
                    No items matching this scope.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="py-4 px-6">Header / Tag</th>
                          <th className="py-4 px-6">Content Body</th>
                          <th className="py-4 px-6">Username Author</th>
                          <th className="py-4 px-6">Date Created</th>
                          <th className="py-4 px-6 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {filteredCommunityList.map((post) => (
                          <tr
                            key={post.id}
                            className="hover:bg-slate-50 transition"
                          >
                            <td className="py-4 px-6">
                              <div className="font-semibold text-gray-900">
                                {post.header || (
                                  <span className="text-gray-300 italic">
                                    None
                                  </span>
                                )}
                              </div>
                              {post.community_tags?.name && (
                                <span className="inline-block bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-xs text-[#5932EA] font-semibold mt-1">
                                  {post.community_tags.name}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 max-w-sm truncate text-gray-600">
                              {post.content}
                            </td>
                            <td className="py-4 px-6 font-medium text-gray-900">
                              {post.username}
                            </td>
                            <td className="py-4 px-6 text-gray-400 text-xs">
                              {new Date(post.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => setEditingPost(post)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-xl transition"
                                  title="Edit post content"
                                >
                                  <FaEdit size={14} />
                                </button>
                                {post.status === "pending" && (
                                  <button
                                    onClick={() =>
                                      handleUpdatePostStatus(
                                        post.id,
                                        "approved",
                                      )
                                    }
                                    className="p-2 text-green-600 hover:bg-green-50 border border-gray-200 rounded-xl transition"
                                    title="Approve post layout"
                                  >
                                    <FaCheck size={14} />
                                  </button>
                                )}
                                {post.status === "approved" && (
                                  <button
                                    onClick={() =>
                                      handleUpdatePostStatus(post.id, "pending")
                                    }
                                    className="p-2 text-amber-600 hover:bg-amber-50 border border-gray-200 rounded-xl transition"
                                    title="Revoke post to drafts"
                                  >
                                    <FaTimes size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeletePost(post.id)}
                                  className="p-2 text-red-500 hover:bg-red-50 border border-gray-200 rounded-xl transition"
                                  title="Remove Post"
                                >
                                  <FaTrash size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {communitySubView === "tags" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="bg-white p-6 rounded-3xl border border-gray-200 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Add Pre-defined Tag
                    </h3>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Define metadata criteria properties for categorization
                      selection drop-down boxes.
                    </p>
                  </div>
                  <form onSubmit={handleCreateTag} className="space-y-3">
                    <input
                      type="text"
                      required
                      value={newTagName}
                      onChange={(e) => setNewConditionTagName(e.target.value)}
                      placeholder="e.g., Success Story, Feedback"
                      className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#5932EA]"
                    />
                    <button
                      type="submit"
                      className="w-full bg-[#5932EA] text-white font-semibold py-2.5 rounded-xl transition text-sm hover:bg-[#4826c9]"
                    >
                      Add Tag
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Active System Dropdown Options Collection
                  </h3>
                  {tagsLoading ? (
                    <p className="text-gray-400 italic text-sm">
                      Synchronizing schemas inventory models variables...
                    </p>
                  ) : tagsList.length === 0 ? (
                    <p className="text-gray-400 italic text-sm">
                      No lookups created yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider">
                            <th className="py-3 px-6">Available Tags</th>
                            <th className="py-3 px-6 select-all font-mono">
                              Reference Record ID
                            </th>
                            <th className="py-3 px-6 text-center">
                              Purge Control
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {tagsList.map((tag) => (
                            <tr
                              key={tag.id}
                              className="hover:bg-slate-50 transition"
                            >
                              <td className="py-3.5 px-6 font-semibold text-gray-800">
                                <span className="bg-indigo-50 border border-indigo-100 text-[#5932EA] px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-wide">
                                  {tag.name}
                                </span>
                              </td>
                              <td className="py-3.5 px-6 text-xs text-gray-400 font-mono select-all truncate max-w-40">
                                {tag.id}
                              </td>
                              <td className="py-3.5 px-6 text-center">
                                <button
                                  onClick={() => handleDeleteTag(tag.id)}
                                  className="p-2 text-red-500 hover:bg-red-50 border border-gray-100 rounded-xl transition inline-flex"
                                  title="Purge tag asset reference mapping constraint parameters"
                                >
                                  <FaTrash size={12} />
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
                                title="view practitioner"
                              >
                                <FaEye size={14} /> View
                              </button>
                              <button
                                disabled={actionProcessingId !== null}
                                onClick={() =>
                                  handleReviewAction(p.id, "approve")
                                }
                                className="bg-green-500 text-white py-1.5 px-3 rounded-xl font-medium text-sm flex items-center gap-1 hover:bg-green-600 disabled:opacity-50 transition"
                                title="Approve practitioner"
                              >
                                <FaCheck size={10} /> Approve
                              </button>
                              <button
                                disabled={actionProcessingId !== null}
                                onClick={() =>
                                  handleReviewAction(p.id, "reject")
                                }
                                className="bg-red-500 text-white py-1.5 px-3 rounded-xl font-medium text-sm flex items-center gap-1 hover:bg-red-600 disabled:opacity-50 transition"
                                title="Reject practitioner"
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

        {/* THERAPIES MANAGEMENT TAB CONTAINER VIEW */}
        {activeTab === "TherapiesManagement" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
                  Therapies Collection
                </h2>
              </div>
              <button
                onClick={handleOpenCreateModal}
                className="bg-[#5932EA] hover:bg-[#4826c9] text-white font-medium py-2.5 px-6 rounded-xl transition flex items-center gap-2 text-sm self-stretch sm:self-auto justify-center"
              >
                Create New Therapy
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Live Repository Indexes
                </span>
                <button
                  onClick={fetchTherapiesFromCms}
                  className="text-xs text-[#5932EA] font-semibold hover:underline flex items-center gap-1"
                >
                  <FaSync
                    size={10}
                    className={therapiesLoading ? "animate-spin" : ""}
                  />{" "}
                  Force Sync Cache
                </button>
              </div>

              {therapiesLoading ? (
                <div className="text-center py-16 text-gray-400 italic text-sm space-y-2">
                  <div className="w-8 h-8 border-4 border-[#5932EA] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p>Syncing live Webflow Collection variables...</p>
                </div>
              ) : therapiesList.length === 0 ? (
                <div className="text-center py-16 text-gray-400 italic text-sm">
                  No clinical therapy models found matching your schema.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-4 px-6">Therapy Model</th>
                        <th className="py-4 px-6">Main Category</th>
                        <th className="py-4 px-6">Condition</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {therapiesList.map((item) => {
                        const data = item.fieldData || {};
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50 transition"
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                {data["main-image"]?.url ? (
                                  <img
                                    src={data["main-image"].url}
                                    alt=""
                                    className="w-10 h-10 object-cover rounded-xl border border-gray-100 shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-100">
                                    Tx
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-gray-900 tracking-tight">
                                    {data.name || "Untitled"}
                                  </div>
                                  <div className="text-xs text-gray-400 font-mono max-w-xs truncate select-all">
                                    {item.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-medium text-gray-600">
                              {lookupTable.get(data["main-categories"]) || (
                                <span className="text-gray-300 italic">
                                  None
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 border border-indigo-100 rounded-md text-[#5932EA]">
                                {lookupTable.get(data["conditions"]) ||
                                  "General"}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-1 border font-semibold rounded-full text-xs uppercase ${item.isDraft ? "text-amber-700 bg-amber-50 border-amber-200" : "text-green-700 bg-green-50 border-green-200"}`}
                              >
                                {item.isDraft ? "Draft" : "Live"}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="flex justify-center items-center gap-2">
                                <button
                                  onClick={() => setSelectedTherapyDetail(item)}
                                  className="p-2.5 text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-xl transition"
                                  title="view therapy"
                                >
                                  <FaEye size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTherapy(item.id)}
                                  className="p-2.5 text-red-500 hover:bg-red-50 border border-gray-200 rounded-xl transition"
                                  title="Delete Therapy"
                                >
                                  <FaTrash size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONDITION MANAGEMENT TAB CONTAINER VIEW */}
        {activeTab === "ConditionManagement" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 tracking-tight">
                Add New Clinical Condition
              </h2>
              <form
                onSubmit={handleCreateCondition}
                className="flex flex-col sm:flex-row gap-3 max-w-xl"
              >
                <input
                  type="text"
                  required
                  value={newConditionName}
                  onChange={(e) => setNewConditionName(e.target.value)}
                  placeholder="e.g., Depression, Autism, Anxiety"
                  className="flex-1 bg-white border border-gray-200 px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#5932EA] text-sm text-gray-800"
                />
                <button
                  type="submit"
                  disabled={conditionsLoading}
                  className="bg-[#5932EA] hover:bg-[#4826c9] text-white font-medium py-2.5 px-6 rounded-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  Create Condition
                </button>
              </form>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Live Managed Target Conditions ({conditionsList.length})
                </span>
                <button
                  onClick={fetchConditionsTabCms}
                  className="text-xs text-[#5932EA] font-semibold hover:underline flex items-center gap-1"
                >
                  <FaSync
                    size={10}
                    className={conditionsLoading ? "animate-spin" : ""}
                  />{" "}
                  Force Sync Data
                </button>
              </div>

              {conditionsLoading && conditionsList.length === 0 ? (
                <div className="text-center py-16 text-gray-400 italic text-sm space-y-2">
                  <div className="w-8 h-8 border-4 border-[#5932EA] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p>Parsing active Webflow schemas variables...</p>
                </div>
              ) : conditionsList.length === 0 ? (
                <div className="text-center py-16 text-gray-400 italic text-sm">
                  No registered medical diagnostics configurations found
                  matching index arrays keys.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-4 px-6">Condition Name Key</th>
                        <th className="py-4 px-6">Generated Slug String</th>
                        <th className="py-4 px-6 select-none font-mono">
                          Webflow Database ID
                        </th>
                        <th className="py-4 px-6 text-center">
                          Actions Management
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {conditionsList.map((item) => {
                        const data = item.fieldData || {};
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50 transition"
                          >
                            <td className="py-4 px-6 font-semibold text-gray-900 tracking-tight">
                              {data.name || "Untitled Row Entry"}
                            </td>
                            <td className="py-4 px-6 text-gray-500 font-mono text-xs">
                              {data.slug || "-"}
                            </td>
                            <td className="py-4 px-6 text-gray-400 select-all font-mono text-xs">
                              {item.id}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => handleDeleteCondition(item.id)}
                                className="p-2 text-red-500 hover:bg-red-50 border border-transparent hover:border-gray-200 rounded-xl transition mx-auto inline-flex items-center"
                                title="Delete Condition Mapping Model"
                              >
                                <FaTrash size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MEDICAL RESEARCH DIGEST */}
        {activeTab === "ResearchDigest" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
                  Research Digest & Podcasts
                </h2>
              </div>
              <button
                onClick={() => setIsCreateBlogModalOpen(true)}
                className="bg-[#5932EA] hover:bg-[#4826c9] text-white font-medium py-2.5 px-6 rounded-xl transition flex items-center gap-2 text-sm"
              >
                Create New Entry
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Live Digest Registries
                </span>
                <button
                  onClick={fetchBlogsFromCms}
                  className="text-xs text-[#5932EA] font-semibold hover:underline flex items-center gap-1"
                >
                  <FaSync
                    size={10}
                    className={blogsLoading ? "animate-spin" : ""}
                  />{" "}
                  Force Sync Repository
                </button>
              </div>

              {blogsLoading ? (
                <div className="text-center py-16 text-gray-400 italic text-sm space-y-2">
                  <div className="w-8 h-8 border-4 border-[#5932EA] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p>Syncing continuous entries lists variables...</p>
                </div>
              ) : blogsList.length === 0 ? (
                <div className="text-center py-16 text-gray-400 italic text-sm">
                  No blog parameters match current repository configurations.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-4 px-6">Entry Item</th>
                        <th className="py-4 px-6">Author</th>
                        <th className="py-4 px-6">Assigned Tag</th>
                        <th className="py-4 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {blogsList.map((blog) => {
                        const data = blog.fieldData || {};
                        const matchedTag = blogTagsOptions.find(
                          (t) => t.id === data["tag-title"],
                        );
                        return (
                          <tr
                            key={blog.id}
                            className="hover:bg-slate-50 transition"
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                {data.image?.url ? (
                                  <img
                                    src={data.image.url}
                                    alt=""
                                    className="w-10 h-10 object-cover rounded-xl border shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#5932EA] flex items-center justify-center font-bold text-xs shrink-0 border">
                                    Doc
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-gray-900 tracking-tight">
                                    {data.name || "Untitled"}
                                  </div>
                                  <div className="text-xs text-gray-400 font-mono select-all truncate max-w-xs">
                                    {blog.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-gray-600 font-medium">
                              {data["authors-name"] || "System Admin"}
                            </td>
                            <td className="py-4 px-6">
                              <span className="px-2.5 py-1 text-xs font-semibold bg-purple-50 border border-purple-100 rounded-md text-purple-600">
                                {matchedTag
                                  ? matchedTag.fieldData?.name
                                  : "Standard Abstract"}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => setSelectedBlogDetail(blog)}
                                className="p-2 text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-xl transition"
                                title="Inspect Entry"
                              >
                                <FaEye size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI ROADMAP ASSESSMENT DIRECTORY SECTION */}
        {activeTab === "AiRoadmap" && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-3xl p-6">
              <div className="border-b border-gray-100 pb-4 mb-6">
                <h2 className="text-xl font-medium text-gray-800">
                  Saved Cognitive Screening Records
                </h2>
                <p className="text-gray-400 text-xs mt-1">
                  Cross-reference clinical diagnostics assessment histories
                  across verified users profile models.
                </p>
              </div>

              {roadmapsList.length === 0 ? (
                <p className="text-gray-500 italic py-6 text-sm">
                  No clinical assessment roadmaps committed to database rows
                  registries.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-4 px-6">User Name</th>
                        <th className="py-4 px-6">Email Address</th>
                        <th className="py-4 px-6 text-center">
                          Diagnostic Profile Target
                        </th>
                        <th className="py-4 px-6 text-center">
                          Action Controls
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
                      {roadmapsList.map((rm) => {
                        const matchUser = allUsersList.find(
                          (u) => u.id === rm.user_id,
                        );
                        const rawClassification = rm.classification || "ND";
                        return (
                          <tr
                            key={rm.user_id}
                            className="hover:bg-slate-50/80 transition"
                          >
                            <td className="py-4 px-6 font-semibold text-gray-900">
                              {matchUser?.name || "Anonymous Guest"}
                            </td>
                            <td className="py-4 px-6 text-gray-500 font-medium">
                              {matchUser?.email || "No Email Provided"}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span
                                className={`inline-block font-semibold px-3 py-1 rounded-full text-xs uppercase ${
                                  rawClassification === "NT"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {/* NT -> Neurodivergent, ND -> Neurotypical */}
                                {rawClassification === "NT"
                                  ? "Neurodivergent"
                                  : "Neurotypical"}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() =>
                                  setRoadmapModalUser({
                                    mapData: rm,
                                    profile: matchUser,
                                  })
                                }
                                className="bg-indigo-50 border border-indigo-100 text-[#5932EA] py-1.5 px-4 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 hover:bg-indigo-100 transition"
                              >
                                <FaClipboardList size={12} /> Recommendation
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* OVERLAY DRILLDOWN MODAL DIALOG */}
{roadmapModalUser && (
  <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-[1px]">
    <div className="bg-white w-full max-w-4xl rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[88vh]">
      
      {/* MODAL HEADER WITH ACTION BUTTONS */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 tracking-tight">
            Recommendation Overview Panel
          </h3>
          <p className="text-xs text-gray-400">
            Cognitive profile assessment report and interventions breakdown
          </p>
        </div>

        {/* 🌟 ACTION BUTTONS TOOLBAR */}
        <div className="flex items-center gap-2">
          {/* Download PDF Button */}
          <button
            onClick={() =>
              generateRoadmapPdf(
                roadmapModalUser.profile,
                roadmapModalUser.mapData
              )
            }
            className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[#5932EA] font-semibold text-xs py-2 px-3.5 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Export Report to Local PDF File"
          >
            <FaDownload size={12} />
            <span>Download PDF</span>
          </button>

          {/* Email PDF Button */}
          <button
            disabled={isSendingEmail}
            onClick={() =>
              emailRoadmapPdf(
                roadmapModalUser.profile,
                roadmapModalUser.mapData
              )
            }
            className="bg-[#5932EA] hover:bg-[#4826c9] text-white font-semibold text-xs py-2 px-3.5 rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            title="Send PDF Report directly to user via email"
          >
            <FaFilePdf size={12} />
            <span>{isSendingEmail ? "Dispatching..." : "Email PDF"}</span>
          </button>

          {/* Close Modal Button */}
          <button
            onClick={() => setRoadmapModalUser(null)}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition ml-1"
          >
            <FaTimes size={18} />
          </button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto space-y-6 text-sm">
        <div className="bg-slate-50 border border-gray-100 rounded-2xl p-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
            <div>
              <h4 className="text-base font-bold text-gray-900">
                {roadmapModalUser.profile?.name || "Anonymous Guest"}
              </h4>
              <p className="text-xs text-gray-500 font-medium font-sans mt-0.5">
                {roadmapModalUser.profile?.email || "Unregistered Context Link"}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs font-bold text-gray-400 uppercase block tracking-wider">
                Classification Profile
              </span>
              <span className="font-extrabold text-[#5932EA] text-sm">
                {roadmapModalUser.mapData?.classification === "NT"
                  ? "Neurotypical"
                  : "Neurodivergent"}
              </span>
            </div>
          </div>
        </div>

        {/* Assessment Domain Table */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block pl-1">
            Metrics Domains Breakdown
          </span>
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#E0F2FE]/40 border-b border-gray-200 text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-5 font-semibold">Domain</th>
                  <th className="py-3 px-5 text-center font-semibold">
                    Domain Type
                  </th>
                  <th className="py-3 px-5 text-center font-semibold">
                    Score
                  </th>
                  <th className="py-3 px-5 text-center font-semibold">
                    Severity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {(
                  roadmapModalUser.mapData?.mapped_domains || []
                ).map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/50 transition"
                  >
                    <td className="py-4 px-5 font-semibold text-gray-800">
                      {item.domain}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className="inline-block text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                        {item.domain_type || "Spine"}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center text-gray-600 font-semibold bg-slate-50/20">
                      {item.score}%
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span
                        className={`inline-block font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wide ${
                          item.severity === "High"
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : item.severity === "Moderate"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-green-50 text-green-700 border border-green-100"
                        }`}
                      >
                        {item.severity || "Low"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations Section for aggregated_therapies */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <FaBrain className="text-emerald-600" size={14} />
              RECOMMENDATIONS
            </h4>
            <span className="text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
              {(roadmapModalUser.mapData?.aggregated_therapies || []).length}{" "}
              Total Therapies
            </span>
          </div>

          {roadmapModalUser.mapData?.aggregated_therapies &&
          roadmapModalUser.mapData.aggregated_therapies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roadmapModalUser.mapData.aggregated_therapies.map(
                (item, index) => (
                  <div
                    key={index}
                    className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-2 shadow-xs hover:border-emerald-200 transition flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {item.therapy}
                      </span>
                      {item.relevance && item.relevance.length > 0 && (
                        <div className="flex gap-1 flex-wrap justify-end">
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

                    <div className="pt-1 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-medium block mb-1">
                        Mapped Domains:
                      </span>
                      {Array.isArray(item.domains) &&
                      item.domains.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.domains.map((dom, dIdx) => (
                            <span
                              key={dIdx}
                              className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-md"
                            >
                              {dom}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">
                          N/A
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-3 bg-slate-50 border border-slate-200/60 rounded-xl">
              No aggregated therapies provided for this profile.
            </p>
          )}
        </div>

        {/* Practitioner Assignment controls */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mt-2 text-left space-y-2 w-full">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
            Assign & Route Profile to Expert Practitioner Node Ledger
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              onFocus={fetchLivePractitionersList}
              onChange={(e) =>
                (roadmapModalUser.targetCtxPractitionerId = e.target.value)
              }
              className="flex-1 bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#5932EA] text-gray-700 font-medium h-10"
            >
              <option value="">
                -- Select Active Practitioner Target to Share Data --
              </option>
              {allLivePractitioners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.specialization || "General Care Specialist"}
                </option>
              ))}
            </select>
            <button
              disabled={isAssigningId !== null}
              onClick={() =>
                handleSendToPractitioner(
                  roadmapModalUser.mapData.user_id,
                  roadmapModalUser.mapData.user_id,
                  roadmapModalUser.targetCtxPractitionerId
                )
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-4 rounded-xl transition duration-150 h-10 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isAssigningId === roadmapModalUser.mapData.user_id
                ? "Syncing..."
                : "Send to Practitioner"}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
          </div>
        )}
      </section>

      {/* REMAINDER SYSTEM MODALS */}
      {editingPost && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-[1px]">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-medium text-gray-800">
                Review Testimonial / Review
              </h2>
              <button
                onClick={() => setEditingPost(null)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Display Username
                </label>
                <input
                  type="text"
                  required
                  value={editingPost.username}
                  onChange={(e) =>
                    setEditingPost({ ...editingPost, username: e.target.value })
                  }
                  className="w-full bg-white border border-gray-200 px-4 py-2 rounded-xl focus:border-[#5932EA] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Header Label
                  </label>
                  <input
                    type="text"
                    value={editingPost.header || ""}
                    onChange={(e) =>
                      setEditingPost({ ...editingPost, header: e.target.value })
                    }
                    placeholder="Set descriptive header"
                    className="w-full bg-white border border-gray-200 px-4 py-2 rounded-xl focus:border-[#5932EA] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Tag Group Mapping
                  </label>
                  <select
                    value={editingPost.tag_id || ""}
                    onChange={(e) =>
                      setEditingPost({
                        ...editingPost,
                        tag_id: e.target.value || null,
                      })
                    }
                    className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl focus:border-[#5932EA] focus:outline-none text-sm text-gray-800"
                  >
                    <option value="">-- No Tag (Clear) --</option>
                    {tagsList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Content Body Post Text
                </label>
                <textarea
                  rows="4"
                  required
                  value={editingPost.content}
                  onChange={(e) =>
                    setEditingPost({ ...editingPost, content: e.target.value })
                  }
                  className="w-full bg-white border border-gray-200 p-4 rounded-xl focus:border-[#5932EA] focus:outline-none"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-5 py-2 border rounded-xl text-gray-500"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#5932EA] text-white rounded-xl"
                >
                  Save & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTestimonialModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-[1px]">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-medium text-gray-800">
                Create Hub Testimonial
              </h2>
              <button
                onClick={() => setIsTestimonialModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <form
              onSubmit={handleCreateTestimonial}
              className="p-6 space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Author Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Jane Doe"
                  value={newTestimonialForm.username}
                  onChange={(e) =>
                    setNewTestimonialForm({
                      ...newTestimonialForm,
                      username: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-gray-200 px-4 py-2 rounded-xl focus:border-[#5932EA] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Header Text *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Amazing platform UI"
                    value={newTestimonialForm.header}
                    onChange={(e) =>
                      setNewTestimonialForm({
                        ...newTestimonialForm,
                        header: e.target.value,
                      })
                    }
                    className="w-full bg-white border border-gray-200 px-4 py-2 rounded-xl focus:border-[#5932EA] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Tag Value *
                  </label>
                  <select
                    required
                    value={newTestimonialForm.tag_id || ""}
                    onChange={(e) =>
                      setNewTestimonialForm({
                        ...newTestimonialForm,
                        tag_id: e.target.value,
                      })
                    }
                    className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl focus:border-[#5932EA] focus:outline-none text-sm text-gray-800"
                  >
                    <option value="">-- Choose Assigned Tag --</option>
                    {tagsList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Content Review Text *
                </label>
                <textarea
                  rows="4"
                  required
                  placeholder="Write comprehensive feedback review content..."
                  value={newTestimonialForm.content}
                  onChange={(e) =>
                    setNewTestimonialForm({
                      ...newTestimonialForm,
                      content: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-gray-200 p-4 rounded-xl focus:border-[#5932EA] focus:outline-none"
                />
              </div>
              <div className="pt-4 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTestimonialModalOpen(false)}
                  className="px-5 py-2 border rounded-xl text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#5932EA] text-white rounded-xl"
                >
                  Publish Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {selectedTherapyDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-[1px]">
          <div className="bg-white w-full max-w-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh] rounded-3xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 tracking-tight">
                Therapy Sheet Inspector
              </h3>
              <button
                onClick={() => setSelectedTherapyDetail(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <FaTimes size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-[#222]">
              <div className="flex gap-4 items-center pb-4">
                <div className="p-3 bg-purple-50 text-[#5932EA] rounded-2xl">
                  <FaBookMedical size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 tracking-tight">
                    {selectedTherapyDetail.fieldData?.name}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Slug Reference: {selectedTherapyDetail.fieldData?.slug}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 border border-gray-100 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase block mb-0.5">
                    Main Category
                  </span>
                  <span className="font-semibold text-gray-800">
                    {lookupTable.get(
                      selectedTherapyDetail.fieldData?.["main-categories"],
                    ) || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase block mb-0.5">
                    Assigned Condition
                  </span>
                  <span className="font-semibold text-gray-800">
                    {lookupTable.get(
                      selectedTherapyDetail.fieldData?.["conditions"],
                    ) || "N/A"}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold text-gray-400 uppercase block mb-0.5">
                    Delivery Channel
                  </span>
                  <span className="font-semibold text-gray-800">
                    {lookupTable.get(
                      selectedTherapyDetail.fieldData?.["deliveries"],
                    ) || "N/A"}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold text-gray-400 uppercase block mb-0.5">
                    Structural Format
                  </span>
                  <span className="font-semibold text-gray-800">
                    {lookupTable.get(
                      selectedTherapyDetail.fieldData?.["formats"],
                    ) || "N/A"}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase block mb-1">
                  Summary Abstract Description
                </span>
                <p className="p-3 bg-gray-50 border rounded-xl text-gray-600 italic leading-relaxed">
                  {selectedTherapyDetail.fieldData?.["post-summary"] ||
                    "No text abstract summary written."}
                </p>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase block mb-1">
                  Structured Body (HTML Payload)
                </span>
                {selectedTherapyDetail.fieldData?.["post-body"] ? (
                  <div
                    className="p-4 bg-gray-50 border rounded-xl text-gray-700 prose prose-sm max-w-none overflow-y-auto max-h-48 border-dashed"
                    dangerouslySetInnerHTML={{
                      __html: selectedTherapyDetail.fieldData["post-body"],
                    }}
                  />
                ) : (
                  <p className="p-3 bg-gray-50 border border-dashed rounded-xl text-gray-400 italic">
                    No HTML description payload provided.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-[1px]">
          <div className="bg-white w-full max-w-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] rounded-3xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 tracking-tight">
                Publish New Therapy Model
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <FaTimes size={18} />
              </button>
            </div>
            <form
              onSubmit={handleCreateTherapy}
              className="p-6 overflow-y-auto space-y-5 text-sm flex-1 text-[#222]"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Therapy System Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTherapyForm.name}
                    onChange={(e) =>
                      setNewTherapyForm({
                        ...newTherapyForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="e.g., Tomatis Auditory Integration"
                    className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#5932EA]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Target Focus Area *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTherapyForm.targetArea}
                    onChange={(e) =>
                      setNewTherapyForm({
                        ...newTherapyForm,
                        targetArea: e.target.value,
                      })
                    }
                    placeholder="e.g., Auditory / Neuro Care"
                    className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#5932EA]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTherapyForm.titleName}
                    onChange={(e) =>
                      setNewTherapyForm({
                        ...newTherapyForm,
                        titleName: e.target.value,
                      })
                    }
                    placeholder="e.g., Auditory / Neuro Care"
                    className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#5932EA]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 border border-gray-200 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Main Category Mapping *
                  </label>
                  <select
                    required
                    value={newTherapyForm.mainCategoryId}
                    onChange={(e) =>
                      setNewTherapyForm({
                        ...newTherapyForm,
                        mainCategoryId: e.target.value,
                      })
                    }
                    className="w-full border bg-white border-gray-200 px-3 py-2.5 rounded-xl focus:outline-none select-none"
                  >
                    <option value="">-- Choose Category --</option>
                    {mainFiltersOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.fieldData?.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Clinical Condition Link *
                  </label>
                  <select
                    required
                    value={newTherapyForm.conditionId}
                    onChange={(e) =>
                      setNewTherapyForm({
                        ...newTherapyForm,
                        conditionId: e.target.value,
                      })
                    }
                    className="w-full border bg-white border-gray-200 px-3 py-2.5 rounded-xl focus:outline-none select-none"
                  >
                    <option value="">-- Choose Condition --</option>
                    {conditionsOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.fieldData?.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Delivery Channel Link *
                  </label>
                  <select
                    required
                    value={newTherapyForm.deliveryId}
                    onChange={(e) =>
                      setNewTherapyForm({
                        ...newTherapyForm,
                        deliveryId: e.target.value,
                      })
                    }
                    className="w-full border bg-white border-gray-200 px-3 py-2.5 rounded-xl focus:outline-none select-none"
                  >
                    <option value="">-- Choose Delivery --</option>
                    {deliveriesOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.fieldData?.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Format Type Link *
                  </label>
                  <select
                    required
                    value={newTherapyForm.formatId}
                    onChange={(e) =>
                      setNewTherapyForm({
                        ...newTherapyForm,
                        formatId: e.target.value,
                      })
                    }
                    className="w-full border bg-white border-gray-200 px-3 py-2.5 rounded-xl focus:outline-none select-none"
                  >
                    <option value="">-- Choose Format --</option>
                    {formatsOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.fieldData?.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Main Hero Image Asset *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setNewTherapyForm((prev) => ({
                          ...prev,
                          imageUrl: "Uploading...",
                        }));
                        const uploadedUrl = await uploadImageToSupabase(file);
                        setNewTherapyForm((prev) => ({
                          ...prev,
                          imageUrl: uploadedUrl || "",
                        }));
                      }
                    }}
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl text-xs focus:outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-[#5932EA] hover:file:bg-indigo-100"
                  />
                  {newTherapyForm.imageUrl && (
                    <p className="mt-1.5 text-xs text-gray-500 truncate max-w-xs">
                      {newTherapyForm.imageUrl === "Uploading..." ? (
                        <span className="text-amber-600 animate-pulse font-medium">
                          Uploading file to Supabase...
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">
                          ✓ Uploaded: {newTherapyForm.imageUrl}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Thumbnail Preview Image *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setNewTherapyForm((prev) => ({
                          ...prev,
                          thumbnailUrl: "Uploading...",
                        }));
                        const uploadedUrl = await uploadImageToSupabase(file);
                        setNewTherapyForm((prev) => ({
                          ...prev,
                          thumbnailUrl: uploadedUrl || "",
                        }));
                      }
                    }}
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl text-xs focus:outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-[#5932EA] hover:file:bg-indigo-100"
                  />
                  {newTherapyForm.thumbnailUrl && (
                    <p className="mt-1.5 text-xs text-gray-500 truncate max-w-xs">
                      {newTherapyForm.thumbnailUrl === "Uploading..." ? (
                        <span className="text-amber-600 animate-pulse font-medium">
                          Uploading file to Supabase...
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">
                          ✓ Uploaded: {newTherapyForm.thumbnailUrl}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Brief Abstract Summary Text
                </label>
                <textarea
                  rows="2"
                  value={newTherapyForm.postSummary}
                  onChange={(e) =>
                    setNewTherapyForm({
                      ...newTherapyForm,
                      postSummary: e.target.value,
                    })
                  }
                  placeholder="Write summary description details..."
                  className="w-full border border-gray-200 p-4 rounded-xl focus:outline-none focus:border-[#5932EA]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Structured Body Guidelines (HTML supported)
                </label>
                <textarea
                  rows="3"
                  value={newTherapyForm.postBody}
                  onChange={(e) =>
                    setNewTherapyForm({
                      ...newTherapyForm,
                      postBody: e.target.value,
                    })
                  }
                  placeholder="<p>Write standard paragraph content blocks here...</p>"
                  className="w-full border border-gray-200 p-4 rounded-xl font-mono text-xs focus:outline-none focus:border-[#5932EA]"
                />
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 bg-white sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 border rounded-xl font-semibold text-gray-500 hover:bg-gray-50"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#5932EA] text-white font-semibold rounded-xl transition"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateBlogModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-[1px]">
          <div className="bg-white w-full max-w-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] rounded-3xl shadow-xl">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 tracking-tight">
                Publish Research Hub Content
              </h3>
              <button
                onClick={() => setIsCreateBlogModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={18} />
              </button>
            </div>
            <form
              onSubmit={handleCreateBlogSubmit}
              className="p-6 overflow-y-auto space-y-4 text-sm flex-1 text-[#222]"
            >
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Article Title *
                </label>
                <input
                  type="text"
                  required
                  value={newBlogForm.name}
                  onChange={(e) =>
                    setNewBlogForm({ ...newBlogForm, name: e.target.value })
                  }
                  placeholder="e.g., Breakthrough CBT Methodologies"
                  className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#5932EA]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Select Content Tag Link *
                  </label>
                  <select
                    required
                    value={newBlogForm.tagTitle}
                    onChange={(e) =>
                      setNewBlogForm({
                        ...newBlogForm,
                        tagTitle: e.target.value,
                      })
                    }
                    className="w-full border bg-white border-gray-200 px-3 py-2.5 rounded-xl focus:outline-none select-none"
                  >
                    <option value="">-- Choose Assigned Tag --</option>
                    {blogTagsOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.fieldData?.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Author Label
                  </label>
                  <input
                    type="text"
                    value={newBlogForm.authorsName}
                    onChange={(e) =>
                      setNewBlogForm({
                        ...newBlogForm,
                        authorsName: e.target.value,
                      })
                    }
                    placeholder="e.g., Sarah M."
                    className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#5932EA]"
                  />
                </div>
              </div>
              {newBlogForm.tagTitle === "6a4a2abf088ffb1e447f6680" ? (
                <div className="bg-amber-50/50 p-4 border border-amber-200 border-dashed rounded-2xl">
                  <label className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-1.5">
                    Podcast Video Media Asset *
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setNewBlogForm((prev) => ({
                          ...prev,
                          podcastVideoUrl: "Uploading...",
                        }));
                        const url = await uploadVideoToSupabase(file);
                        setNewBlogForm((prev) => ({
                          ...prev,
                          podcastVideoUrl: url || "",
                        }));
                      }
                    }}
                    className="w-full bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs focus:outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800"
                  />
                  {newBlogForm.podcastVideoUrl && (
                    <p className="mt-1 text-xs font-mono text-gray-500 truncate">
                      {newBlogForm.podcastVideoUrl === "Uploading..."
                        ? "Uploading to Storage Node..."
                        : `✓ Ready: ${newBlogForm.podcastVideoUrl}`}
                    </p>
                  )}
                  \
                </div>
              ) : (
                <div className="bg-gray-50 p-4 border border-gray-200 rounded-2xl">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Article Cover Image Banner *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setNewBlogForm((prev) => ({
                          ...prev,
                          image: "Uploading...",
                        }));
                        const url = await uploadImageToSupabase(file);
                        setNewBlogForm((prev) => ({
                          ...prev,
                          image: url || "",
                        }));
                      }
                    }}
                    className="w-full bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs focus:outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-[#5932EA]"
                  />
                  {newBlogForm.image && (
                    <p className="mt-1 text-xs font-mono text-gray-500 truncate">
                      {newBlogForm.image === "Uploading..."
                        ? "Syncing storage arrays..."
                        : `✓ Ready: ${newBlogForm.image}`}
                    </p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Hero/Subtitle Headline
                  </label>
                  <input
                    type="text"
                    value={newBlogForm.heroText}
                    onChange={(e) =>
                      setNewBlogForm({
                        ...newBlogForm,
                        heroText: e.target.value,
                      })
                    }
                    placeholder="e.g., Overwhelmed to well informed."
                    className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#5932EA]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Reading Duration Metric
                  </label>
                  <input
                    type="text"
                    value={newBlogForm.timeToRead}
                    onChange={(e) =>
                      setNewBlogForm({
                        ...newBlogForm,
                        timeToRead: e.target.value,
                      })
                    }
                    placeholder="e.g., 5 min read"
                    className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#5932EA]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Article Body Structure (Rich HTML content supported)
                </label>
                <textarea
                  rows="4"
                  value={newBlogForm.thisIsTheMainParagraph}
                  onChange={(e) =>
                    setNewBlogForm({
                      ...newBlogForm,
                      thisIsTheMainParagraph: e.target.value,
                    })
                  }
                  placeholder="<h2>Heading</h2><p>Core message block text strings...</p>"
                  className="w-full border border-gray-200 p-4 rounded-xl font-mono text-xs focus:outline-none focus:border-[#5932EA]"
                />
              </div>
              <div className="pt-4 border-t flex justify-end gap-3 bg-white sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setIsCreateBlogModalOpen(false)}
                  className="px-5 py-2.5 border rounded-xl font-semibold text-gray-500 hover:bg-gray-50"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  disabled={
                    newBlogForm.image === "Uploading..." ||
                    newBlogForm.podcastVideoUrl === "Uploading..."
                  }
                  className="px-6 py-2.5 bg-[#5932EA] text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  Publish Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedBlogDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-[1px]">
          <div className="bg-white w-full max-w-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh] rounded-3xl">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 tracking-tight">
                Digest Registry Sheet Inspector
              </h3>
              <button
                onClick={() => setSelectedBlogDetail(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <FaTimes size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-sm text-[#222]">
              <h4 className="text-2xl font-bold text-gray-900 tracking-tight">
                {selectedBlogDetail.fieldData?.name}
              </h4>
              <p className="text-xs text-gray-400 font-mono">
                CMS Object Hash Key: {selectedBlogDetail.id}
              </p>
              <div className="bg-gray-50 p-4 rounded-xl border space-y-2">
                <p>
                  <strong>Subtitle:</strong>{" "}
                  {selectedBlogDetail.fieldData?.["hero-text"] ||
                    "None Specified"}
                </p>
                <p>
                  <strong>Author:</strong>{" "}
                  {selectedBlogDetail.fieldData?.["authors-name"] ||
                    "System Admin"}
                </p>
                <p>
                  <strong>Reading Info:</strong>{" "}
                  {selectedBlogDetail.fieldData?.["time-to-read"] || "N/A"}
                </p>
              </div>
              {selectedBlogDetail.fieldData?.["podcast-cta-main"]?.url && (
                <div className="mt-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Attached Podcast Video Content
                  </span>
                  <video
                    controls
                    src={selectedBlogDetail.fieldData["podcast-cta-main"].url}
                    className="w-full rounded-xl border bg-black max-h-64"
                  />
                </div>
              )}
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Body Text Content Block Markup
                </span>
                <div
                  className="p-4 bg-gray-50 border border-dashed rounded-xl prose prose-sm max-h-48 overflow-y-auto"
                  dangerouslySetInnerHTML={{
                    __html:
                      selectedBlogDetail.fieldData?.[
                        "this-is-the-main-paragraph"
                      ] || "<i>Empty Body Content</i>",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Dashboard;
