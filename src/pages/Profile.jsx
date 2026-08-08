import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import users from "../assets/users.svg";
import arrow from "../assets/profile/arrow.svg";
import upload from "../assets/profile/upload.svg";
import uploadBg from "../assets/profile/uploadBg.svg";
import banner from "../assets/profile/banner.svg";
import UserImg from "../assets/profile/user.svg";




export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);

  // --- SHARE MODAL STATES ---
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareStep, setShareStep] = useState("selection"); // "selection" | "review" | "video"
  const [reviewText, setReviewText] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // --- CHANGE PASSWORD MODAL STATES ---
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;
    setUser(user);

    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    setSubscription(data);
  }

  useEffect(() => {
    const isAnyModalOpen = isShareModalOpen || isPasswordModalOpen;

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup when component unmounts
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isShareModalOpen, isPasswordModalOpen]);

  // --- ACCOUNT MANAGEMENT ACTIONS ---

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setSubscription(null);
    navigate("/auth");
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account permanently? This action cannot be undone.",
    );
    if (!confirmed) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("Session expired. Please log in again.");
        return;
      }

      const response = await fetch(
        "https://obzogpozgoolhededqkb.supabase.co/functions/v1/delete-account",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      await supabase.auth.signOut();
      alert("Account deleted successfully.");
      setUser(null);
      navigate("/auth");
    } catch (err) {
      alert(`Error deleting account: ${err.message}`);
    }
  }

  async function cancelSubscription() {
    const confirmed = window.confirm("Cancel subscription?");
    if (!confirmed) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      await fetch(
        "https://obzogpozgoolhededqkb.supabase.co/functions/v1/cancel-subscription",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      await fetch(
        "https://obzogpozgoolhededqkb.supabase.co/functions/v1/delete-subscription",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      setSubscription(null);
      alert("Subscription cancelled successfully.");
    } catch (err) {
      alert(`Error cancelling subscription: ${err.message}`);
    }
  }

  async function handlePasswordUpdate(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    try {
      setUpdatingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess("Password updated successfully!");
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setNewPassword("");
        setConfirmPassword("");
        setPasswordSuccess("");
      }, 1500);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setUpdatingPassword(false);
    }
  }

  // --- SHARE STORY SUBMISSION HANDLERS ---

  const userDisplayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Anonymous Member";

  async function handleSubmitTextReview(e) {
    e.preventDefault();
    if (!reviewText.trim()) return;

    try {
      setUploading(true);
      const { error } = await supabase.from("community_hub").insert([
        {
          user_id: user?.id || null,
          username: userDisplayName,
          content: reviewText.trim(),
          header: "Member Story",
          status: "pending", // Goes to Dashboard for approval
        },
      ]);

      if (error) throw error;

      alert("Your review has been submitted for approval!");
      resetShareModal();
    } catch (err) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      handleSubmitVideoReview(file);
    }
  };

  async function handleSubmitVideoReview(eOrFile) {
    // If eOrFile is an event object (has preventDefault), prevent default form submission
    if (eOrFile && typeof eOrFile.preventDefault === "function") {
      eOrFile.preventDefault();
    }

    // Use passed file directly if available; otherwise fallback to state
    const fileToUpload =
      eOrFile && eOrFile instanceof File ? eOrFile : videoFile;

    if (!fileToUpload) {
      alert("Please select or record a video first.");
      return;
    }

    try {
      setUploading(true);

      // 1. Upload video file to Supabase Storage Bucket
      const fileExt = fileToUpload.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `community_videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("community_videos")
        .upload(filePath, fileToUpload, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 2. Fetch public URL
      const { data: publicUrlData } = supabase.storage
        .from("community_videos")
        .getPublicUrl(filePath);

      const videoPublicUrl = publicUrlData.publicUrl;

      // 3. Insert record into community_hub table with pending status
      const { error: dbError } = await supabase.from("community_hub").insert([
        {
          user_id: user?.id || null,
          username: userDisplayName,
          video_url: videoPublicUrl,
          content: "",
          header: "Video Story",
          status: "pending", // Goes to Dashboard for approval
        },
      ]);

      if (dbError) throw dbError;

      alert("Your video story has been submitted for approval!");
      resetShareModal();
    } catch (err) {
      alert(`Video submission failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  function resetShareModal() {
    setIsShareModalOpen(false);
    setShareStep("selection");
    setReviewText("");
    setVideoFile(null);
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] py-8 px-3.75 md:px-10 flex flex-col items-center manrope">
      <div className="w-full space-y-6">
        {/* Cover Header Banner */}
        <div className="relative w-full h-87.5 md:h-130 rounded-[30px] md:rounded-[40px] overflow-hidden">
          <img
            src={banner}
            alt="Profile Cover"
            className="w-full h-full object-cover"
          />

          <div className="absolute top-6 left-6 sm:top-10 sm:left-10">
            <h1 className="bg-[#B77145] flex justify-center items-center text-white px-7.5 h-12.5 md:h-17.5 leading-[120%] tracking-[-3%] font-semibold md:font-medium text-[14px] md:text-[18px] rounded-[40px]">
              {subscription?.plan
                ? `${subscription.plan} Member`
                : "Premium Membership"}
            </h1>
          </div>
        </div>

        {/* User Info Bar */}
        <div className="flex flex-row sm:items-end justify-between px-4 sm:px-10 -mt-16 sm:-mt-24 md:-mt-28 relative z-10 gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            <div className="w-37.5 h-37.5 md:w-50 md:h-50 rounded-full overflow-hidden bg-white shrink-0">
              <img
                src={UserImg}
                alt="User Avatar"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="pb-1 pt-1 sm:pb-3">
              <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-medium text-[#B77145]">
                {userDisplayName}
              </h1>
              <p className="text-[13px] md:text-[18px] text-[#B77145] font-medium mt-1.25 md:mt-2.5">
                {user?.email || "guest@manascience.com"}
              </p>
            </div>
          </div>

          <div className="pb-1 sm:pb-3 flex justify-end items-end cursor-pointer">
            <button className="bg-[#B77145] hover:opacity-90 text-white text-[14px] md:text-[16px] font-semibold rounded-full transition h-12.5 md:h-20 w-27.5 md:w-40 cursor-pointer">
              Edit Profile
            </button>
          </div>
        </div>

        {/* Action Options List */}
        <div className="space-y-4 pt-2">
          {/* Manage Subscription */}
          <div className="w-full bg-[#FAF4E8] rounded-[20px] md:rounded-[40px] flex items-center justify-between h-20 md:h-35 px-5 md:px-10">
            <span className="text-[16px] md:text-[28px] font-medium text-[#B77145] leading-[120%] tracking-[-3%]">
              Manage Subscription
            </span>
            {subscription ? (
              <button
                onClick={cancelSubscription}
                className="bg-[#B77145] hover:opacity-90 text-white text-[14px] md:text-[16px] font-semibold rounded-[30px] md:rounded-[40px] transition md:h-20 h-12.5 w-27.5 md:w-45"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={() => navigate("/subscription")}
                className="bg-[#B77145] hover:opacity-90 text-white text-[14px] md:text-[16px] font-semibold rounded-[30px] md:rounded-[40px] transition md:h-20 h-12.5 w-27.5 md:w-45 cursor-pointer"
              >
                Manage
              </button>
            )}
          </div>

          {/* Log Out */}
          <div className="w-full bg-[#FAF4E8] rounded-[20px] md:rounded-[40px] flex items-center justify-between px-5 md:px-10 h-20 md:h-35">
            <span className="text-[16px] md:text-[28px] font-medium text-[#B77145] leading-[120%] tracking-[-3%]">
              Log out
            </span>
            <button
              onClick={logout}
              className="bg-[#B77145] hover:opacity-90 text-white text-[14px] md:text-[16px] font-semibold rounded-[30px] md:rounded-[40px] transition md:h-20 h-12.5 w-27.5 md:w-45 cursor-pointer"
            >
              Log Out
            </button>
          </div>

          {/* Change Password */}
          <div className="w-full bg-[#FAF4E8] rounded-[20px] md:rounded-[40px] flex items-center justify-between px-5 md:px-10 h-20 md:h-35">
            <span className="text-[16px] md:text-[28px] font-medium text-[#B77145] leading-[120%] tracking-[-3%]">
              Change Password
            </span>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="bg-[#B77145] hover:opacity-90 text-white text-[14px] md:text-[16px] font-semibold rounded-[30px] md:rounded-[40px] transition md:h-20 h-12.5 w-27.5 md:w-45 cursor-pointer"
            >
              Update
            </button>
          </div>

          {/* Delete Account */}
          <div className="w-full bg-[#FAF4E8] rounded-[20px] md:rounded-[40px] flex items-center justify-between px-5 md:px-10 h-20 md:h-35">
            <span className="text-[16px] md:text-[28px] font-medium text-[#B77145] leading-[120%] tracking-[-3%] cursor-pointer">
              Delete Account
            </span>
            <button
              onClick={deleteAccount}
              className="bg-[#68270B] hover:bg-[#47220f] text-white text-[14px] md:text-[16px] font-semibold rounded-[30px] md:rounded-[40px] transition md:h-20 h-12.5 w-27.5 md:w-45 cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 items-stretch">
          {/* Card 1: Share Your Story */}
          <div className="bg-[#FAF4EB] rounded-[40px] md:rounded-[60px] p-6.25 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-end min-h-75 md:h-90">
            <div className="flex flex-col h-full justify-between max-w-full md:max-w-105">
              <div>
                <img
                  src={users}
                  alt="Users"
                  className="w-35 md:w-40 h-auto"
                />
              </div>

              <div className="flex flex-col gap-2.5 md:gap-4">
                <h3 className="text-[24px] md:text-[38px] font-normal text-[#B77145] leading-[120%] tracking-[-4%]">
                  Share Your Story
                </h3>

                <p className="text-[14px] md:text-[16px] font-normal text-[#B77145] leading-[120%] md:leading-[128%] max-w-85">
                  Your story can help other individuals and families feel
                  informed, supported, and hopeful throughout their own journey.
                </p>
              </div>
            </div>

            {/* CLICKING SHARE OPENS POPUP */}
            <div className="mt-6 md:mt-0 flex justify-end w-full md:w-auto">
              <button
                onClick={() => {
                  setIsShareModalOpen(true);
                  setShareStep("selection");
                }}
                className="bg-[#B77145] hover:opacity-90 text-white transition h-12.5 md:h-20 w-27.5 md:w-37.5 text-[14px] md:text-[16px] font-semibold rounded-[30px] md:rounded-[40px] flex items-center justify-center cursor-pointer"
              >
                Share
              </button>
            </div>
          </div>

          {/* Card 2: Promo Offer */}
          <div
            className="rounded-[40px] md:rounded-[60px] p-6.25 md:p-10 text-white flex flex-col justify-between min-h-75 md:h-90"
            style={{
              backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1786094800/promoBg_d1mppq.svg)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div>
              <h3 className="text-[24px] md:text-[38px] font-normal mb-2 md:mb-3 text-white leading-[120%] tracking-[-4%]">
                Promo Offer
              </h3>
              <p className="text-[16px] md:text-[24px] font-normal text-white leading-[120%] tracking-[-4%]">
                $899/mo
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => navigate("/subscription")}
                className="bg-white hover:bg-white/90 text-[#B77145] text-[14px] md:text-[16px] font-semibold rounded-full transition md:h-20 h-12.5 w-43.75 md:w-50 cursor-pointer"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 1. CHANGE PASSWORD POPUP MODAL                            */}
      {isPasswordModalOpen && (
        <div
          onClick={() => setIsPasswordModalOpen(false)}
          className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF4E8] w-full max-w-md rounded-[30px] p-6 md:p-8 space-y-6 shadow-2xl relative"
          >
            <div className="flex justify-between items-center border-b border-[#B77145]/20 pb-3">
              <h2 className="text-xl font-semibold text-[#68270B]">
                Update Password
              </h2>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-[#68270B] font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#68270B] mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full h-12 bg-white rounded-full px-4 text-sm focus:outline-none border border-transparent focus:border-[#B77145]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#68270B] mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full h-12 bg-white rounded-full px-4 text-sm focus:outline-none border border-transparent focus:border-[#B77145]"
                />
              </div>

              {passwordError && (
                <p className="text-xs text-red-600 font-medium">
                  {passwordError}
                </p>
              )}
              {passwordSuccess && (
                <p className="text-xs text-green-700 font-medium">
                  {passwordSuccess}
                </p>
              )}

              <button
                type="submit"
                disabled={updatingPassword}
                className="w-full h-12 bg-[#B77145] text-white font-semibold rounded-full hover:opacity-90 transition disabled:opacity-50"
              >
                {updatingPassword ? "Updating..." : "Save New Password"}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* 2. MULTI-STEP "SHARE YOUR STORY" POPUP MODAL (FIGMA MATCH) */}
      {isShareModalOpen && (
        <div
          onClick={resetShareModal}
          className="fixed inset-0 bg-black/40 z-50 flex justify-center items-center p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF4EB] h-95 md:h-135 w-82.5 md:w-125 p-3.75 md:p-6.25 rounded-[20px] md:rounded-[40px] flex flex-col justify-between relative transition-all"
          >
            {/* STEP 1: INITIAL SELECTION CARD */}
            {shareStep === "selection" && (
              <div className="flex flex-col justify-between items-center gap-7.5 md:gap-10">
                <div className="flex flex-col  md:gap-5.5 w-full">
                  <div className="flex justify-start w-full">
                    <button
                      onClick={resetShareModal}
                      className="text-[#B77145] text-xl font-bold cursor-pointer"
                    >
                      <img src={arrow} alt="Arrow" className="rotate-180"/>
                    </button>
                  </div>
                  {/* Avatars */}
                  <div className="flex justify-center h-auto">
                    <img
                      src={users}
                      alt="Community Members"
                      className="w-28.75 md:w-40 h-auto"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="flex flex-col items-center gap-2.5 md:gap-6.25">
                    <h2 className="md:text-[34px] text-[20px] font-medium md:font-normal text-[#B77145] leading-[120%] tracking-[-2%]">
                      Share Your Story
                    </h2>

                    <p className="text-[12px] font-normal md:text-[16px] text-[#B77145] leading-relaxed max-w-60 md:max-w-87.5">
                      Your story can help other individuals and families feel
                      informed, supported, and hopeful throughout their own
                      journey.
                    </p>
                  </div>
                </div>

                {/* Option Buttons */}
                <div className="w-full flex flex-col gap-2.5 md:gap-5 text-[14px] md:text-[16px]">
                  <button
                    onClick={() => setShareStep("review")}
                    className="w-full bg-white text-[#B77145] font-medium md:font-semibold rounded-[40px] hover:bg-gray-50 transition cursor-pointer h-12.5 md:h-15 leading-[124%] tracking-[0%] ]"
                  >
                    Write a review
                  </button>

                  <button
                    onClick={() => setShareStep("video")}
                    className="w-full h-12.5 bg-[#B77145] text-white font-semibold rounded-[40px] hover:opacity-90 transition cursor-pointer md:h-15 leading-[124%] tracking-[0%]"
                  >
                    Record a Video
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: WRITE A REVIEW CARD */}
            {shareStep === "review" && (
              <form
                onSubmit={handleSubmitTextReview}
                className="flex flex-col md:gap-6 h-full "
              >
                <div className="flex flex-col md:gap-6 justify-center">
                  <div className="flex justify-start items-center">
                    <button
                      type="button"
                      onClick={() => setShareStep("selection")}
                      className="text-[#B77145] text-xl font-bold"
                    >
                      <img src={arrow} alt="Arrow" className="rotate-180" />
                    </button>
                  </div>

                  <div className="text-center flex flex-col items-center gap-4 md:gap-5">
                    <h2 className="text-[20px] md:text-[34px] font-medium md:font-normal text-[#B77145]">
                      Write a review
                    </h2>
                    <p className="text-[12px] md:text-[16px] font-normal text-[#B77145] md:leading-tight md:px-4">
                      Record a short video sharing your ManaScience experience
                      and how it has supported your journey.
                    </p>
                  </div>
                </div>

                <div className="flex-1 my-2">
                  <textarea
                    rows={4}
                    required
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Write your feedback here..."
                    className="w-full h-full text-[12px] md:text-[16px] bg-white rounded-[20px] p-5 md:p-7.5  text-[#B77145] placeholder-[#B77145]/60 focus:outline-none  resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading || !reviewText.trim()}
                  className="w-full h-12.5 md:h-15 bg-[#B77145] text-white font-medium text-[14px] md:text-[16px] rounded-full hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? "Sharing..." : "Share"}
                </button>
              </form>
            )}

            {shareStep === "video" && (
              <div className="flex flex-col justify-between h-full gap-5.5 md:gap-12.5">
                <div className="flex flex-col md:gap-6">
                  <div className="flex justify-start items-center">
                    <button
                      type="button"
                      onClick={() => setShareStep("selection")}
                      className="text-[#B77145] text-xl font-bold"
                    >
                      <img src={arrow} alt="Arrow" className="rotate-180" />
                    </button>
                  </div>

                  <div className="text-center flex flex-col items-center gap-2.5 md:gap-5">
                    <h2 className="md:text-[34px] text-[20px] font-medium md:font-normal text-[#B77145]">
                      Upload a Video
                    </h2>
                    <p className="text-[12px] md:text-[16px] font-normal text-[#B77145] md:leading-tight px-5 md:px-4">
                      Record a short video sharing your ManaScience experience
                      and how it has supported your journey.
                    </p>
                  </div>
                </div>

                {/* Video Container Box matching Figma */}
                <div className="relative w-full h-75 rounded-4xl overflow-hidden flex flex-col justify-between p-6 bg-cover bg-center" style={{ backgroundImage: `url(${uploadBg})` }}>
                  {/* Status Badge */}
                  <div className="self-start">
                    <span className="flex items-center px-6 h-10 md:h-15 rounded-full text-[14px] md:text-[16px] font-semibold text-[#B77145] bg-white shadow-sm">
                      {uploading
                        ? "Uploading..."
                        : videoFile
                          ? "Uploaded!"
                          : "Not Recording"}
                    </span>
                  </div>

                  {/* Upload Icon Button */}
                  <div className="self-end">
                    <label
                      className={`cursor-pointer bg-white w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 transition-transform ${uploading ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <input
                        type="file"
                        accept="video/*"
                        capture="environment"
                        disabled={uploading}
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <img src={upload} alt="Upload" />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
