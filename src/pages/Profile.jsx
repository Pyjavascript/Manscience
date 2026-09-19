import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import users from "../assets/share.svg";
import arrow from "../assets/profile/arrow.svg";
import upload from "../assets/profile/upload.svg";
import uploadBg from "../assets/profile/uploadBg.svg";
import banner from "../assets/profile/banner.svg";
import UserImg from "../assets/profile/user.svg";
import hide from "../assets/form/hide.svg";
import show from "../assets/form/show.svg";
import logo from "../assets/Ai/ai.svg";
import inparrowbrown from "../assets/Ai/inparrowbrown.svg";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [dbUser, setDbUser] = useState(null);

  // --- EDIT PROFILE MODAL STATES ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAvatar, setEditAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

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

  const [showPasswords, setShowPasswords] = useState(false);

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
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    setDbUser(userData);
  }

  useEffect(() => {
    if (isEditModalOpen && user) {
      setEditName(
        dbUser?.name ||
          user?.user_metadata?.name ||
          user?.user_metadata?.full_name ||
          "",
      );
      setEditPhone(dbUser?.phone || "");
      setAvatarPreview(dbUser?.avatar_url || UserImg);
      setEditAvatar(null);
    }
  }, [isEditModalOpen, user, dbUser]);

  useEffect(() => {
    const isAnyModalOpen =
      isShareModalOpen || isPasswordModalOpen || isEditModalOpen;

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isShareModalOpen, isPasswordModalOpen]);

  // --- ACCOUNT MANAGEMENT ACTIONS ---

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setSubscription(null);
    // navigate("/auth");
    window.location.href = `${window.location.origin}/auth`;
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
      // navigate("/auth");
      window.location.href = `${window.location.origin}/auth`;
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

  // --- EDIT PROFILE HANDLER ---
  async function handleProfileUpdate(e) {
    e.preventDefault();
    setIsUpdatingProfile(true);

    try {
      let newAvatarUrl = dbUser?.avatar_url || null;

      // Handle Image Upload if a new one was selected
      if (editAvatar) {
        const fileExt = editAvatar.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // IMPORTANT: You must have a bucket named "avatars" created in Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, editAvatar, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        newAvatarUrl = publicUrlData.publicUrl;
      }

      // Update public.users table
      const { error: dbError } = await supabase
        .from("users")
        .update({
          name: editName,
          phone: editPhone,
          avatar_url: newAvatarUrl,
        })
        .eq("id", user.id);

      if (dbError) throw dbError;

      // Also update Auth metadata to keep everything in sync
      await supabase.auth.updateUser({
        data: { name: editName, full_name: editName },
      });

      alert("Profile updated successfully!");
      loadProfile();
      setIsEditModalOpen(false);
    } catch (err) {
      alert(`Error updating profile: ${err.message}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  }

  // --- SHARE STORY SUBMISSION HANDLERS ---

  const userDisplayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "New Member";
  const displayAvatar = dbUser?.avatar_url || UserImg;
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
    <main className="min-h-screen flex flex-col items-center manrope ">
      <div className="w-full flex flex-col gap-[10px] md:gap-[20px]">
        {/* Cover Header Banner */}
        <div className="relative w-full h-[500px] md:h-[380px] rounded-[40px] md:rounded-[54px] overflow-hidden flex flex-col">
          {/* Background Banner Image */}
          <img
            src={banner}
            alt="Profile Cover"
            className="absolute inset-0 w-full h-full object-cover z-0"
          />

          {/* Overlay Gradient (Optional: helps text readability against bright images) */}
          <div className="absolute inset-0 bg-black/10 z-0"></div>

          {/* Logo */}
          <div className="absolute top-6 right-6 sm:top-10 sm:right-10 z-10">
            <img
              src={logo}
              alt="logo"
              className="w-10 md:w-14 h-auto object-contain"
            />
          </div>

          {/* User Info Bar (Positioned at the bottom over the banner) */}
          <div className="absolute bottom-0 left-0 w-full flex flex-row sm:items-end justify-between p-6.25 sm:p-7.5 z-10 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-2.5 md:gap-[20px]">
              <div className="w-20 h-20 md:w-25 md:h-25 rounded-full overflow-hidden  shrink-0 ">
                <img
                  src={displayAvatar}
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="pb-1.5 md:pb-2.5 pt-1">
                <h1 className="text-2xl text-[25px] md:text-[42px] lg:text-[44px] font-medium text-white md:max-w-max">
                  {userDisplayName}
                </h1>
                <p className="text-[10px] md:text-[16px] text-white font-medium mt-1.25 md:mt-2.5">
                  {user?.email || "guest@manascience.com"}
                </p>
              </div>
            </div>

            <div className="pb-1 sm:pb-3 flex justify-end items-end cursor-pointer">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="bg-[#68270B] text-white text-[14px] md:text-[12px] font-semibold rounded-full transition h-12.5 w-12.5 md:h-12.5 md:w-12.5 flex items-center justify-center cursor-pointer"
              >
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Featured Action Cards (Meet Manasi & Roadmap) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px] md:gap-[20px] w-full">
          {/* Card 1: Meet Manasi */}
          <div
            className="w-full rounded-[40px] md:rounded-[60px] p-5 md:p-10 flex flex-col justify-between h-[140px] md:h-[260px] relative overflow-hidden"
            style={{
              backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1789386749/profile-bg_zdzkkz.svg)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Brain Sparkle Icon (Inline SVG) */}
            <div className="w-8 h-8 md:w-[40px] md:h-[40px]">
              <img src={logo} alt="logo" />
            </div>

            <div className="flex justify-between items-end w-full">
              <h3 className="text-white text-[16px] md:text-[18px] lg:text-[30px] font-medium leading-[120%] tracking-tight">
                Meet Manasi!
                <br />
                Your AI Brain Guide
              </h3>

              <button
                className="flex items-center justify-end  bg-white/30 hover:bg-white/30 backdrop-blur-md rounded-full transition cursor-pointer min-w-[105px] lg:min-w-[180px] h-[45px] md:h-[60px] lg:h-[70px] px-[12px] gap-[15px] md:gap-[18px]"
                onClick={() => {
                  window.location.href = `${window.location.origin}/subscription`;
                }}
              >
                <span
                  className="text-white text-[10px] md:text-[12px] lg:text-[15px] font-semibold lg:pl-[15px]"
                  onClick={() => {
                    window.location.href = `${window.location.origin}/subscription`;
                  }}
                >
                  Subscribe
                </span>
                <div
                  className="bg-white text-[#B5673C] w-[30px] h-[30px] lg:w-[50px] lg:h-[50px] rounded-full flex items-center justify-center"
                  onClick={() => {
                    window.location.href = `${window.location.origin}/subscription`;
                  }}
                >
                  <img
                    src={inparrowbrown}
                    alt="arrow"
                    className="h-[8px] lg:w-[10px] w-[8px] lg:h-[10px]"
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Card 2: Check my Roadmap */}
          <div className="w-full bg-[#FAF4E8] rounded-[40px] md:rounded-[60px] p-5 md:p-10 flex flex-col justify-between h-[140px] md:h-[260px]">
            <div className="flex flex-col gap-[10px] md:gap-[20px]">
              <h3 className="text-[20px] md:text-[28px] lg:text-[30px] font-medium text-[#5F2305] leading-[120%] tracking-[-2%]">
                Check my Roadmap
              </h3>
              <p className="text-[10px] md:text-[16px] lg:text-[18px] font-medium text-[#5F2305] leading-[130%] max-w-[160px] md:max-w-[280px]">
                Take the next step in your journey with 20% off your order.
              </p>
            </div>

            <div
              className="flex justify-end items-end w-full"
              onClick={() => {
                window.location.href = `${window.location.origin}/coming-soon`;
              }}
            >
              <button
                className="bg-[#68270B] text-white text-[10px] md:text-[16px] font-semibold md:font-semibold rounded-full transition h-[45px] w-[90px] md:h-[70px] md:min-w-[140px]   md:h-[50px] lg:h-[70px] md:w-[110px] lg:min-w-[140px] px-6 md:px-10 flex items-center justify-center cursor-pointer"
                onClick={() => {
                  window.location.href = `${window.location.origin}/coming-soon`;
                }}
              >
                Manage
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 pt-2 items-stretch bg-[#FAF4E8] rounded-[40px] md:rounded-[40px]">
          {/* Card 1: Share Your Story */}
          <div className="md:py-10 py-[40px] px-[60px] flex flex-col justify-center items-center text-center min-h-75 md:h-100">
            <div className="flex flex-col items-center justify-center max-w-full gap-[15px] md:gap-[20px]">
              <div className="">
                <img src={users} alt="Users" className="w-35 md:w-40 h-auto" />
              </div>

              <div className="flex flex-col items-center gap-2.5 md:gap-[14px]">
                <h3 className="text-[24px] md:text-[40px] font-normal text-[#B77145] leading-[120%] tracking-[-4%]">
                  Share Your Story
                </h3>

                <p className="text-[14px] md:text-[15px] font-normal text-[#B77145] leading-[120%] md:leading-[128%] max-w-85 mx-auto">
                  Your story can help others feel informed, supported, and
                  hopeful.
                </p>
              </div>
            </div>

            {/* CLICKING SHARE OPENS POPUP */}
            <div className="mt-[20px] md:mt-[20px] flex justify-center w-full">
              <button
                onClick={() => {
                  setIsShareModalOpen(true);
                  setShareStep("selection");
                }}
                className="bg-[#B77145] hover:opacity-90 text-white transition h-[60px] md:h-20 w-27.5 md:w-[160px] text-[14px] md:text-[16px] font-semibold rounded-[30px] md:rounded-[40px] flex items-center justify-center cursor-pointer hover:scale-[1.02]"
              >
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Action Options List */}
        <div className="flex flex-col gap-[10px] md:gap-[20px]">
          {/* Manage Subscription */}
          <div className="w-full bg-[#FAF4E8] rounded-[20px] md:rounded-[40px] flex items-center justify-between h-20 md:h-35 px-5 md:px-10">
            <span className="text-[16px] md:text-[24px] font-medium text-[#B77145] leading-[120%] tracking-[-3%]">
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
                onClick={() => {
                  window.location.href = `${window.location.origin}/subscription`;
                }}
                className="bg-[#B77145] hover:opacity-90 text-white text-[14px] md:text-[16px] font-semibold rounded-[30px] md:rounded-[40px] transition md:h-20 h-15 w-27.5 md:w-[160px] cursor-pointer"
              >
                Manage
              </button>
            )}
          </div>

          {/* Change Password */}
          <div className="w-full bg-[#FAF4E8] rounded-[20px] md:rounded-[40px] flex items-center justify-between px-5 md:px-10 h-20 md:h-35">
            <span className="text-[16px] md:text-[24px] font-medium text-[#B77145] leading-[120%] tracking-[-3%]">
              Change Password
            </span>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="bg-[#B77145] hover:opacity-90 text-white text-[14px] md:text-[16px] font-semibold rounded-[30px] md:rounded-[40px] transition md:h-20 h-15  w-27.5 md:w-[160px] cursor-pointer"
            >
              Update
            </button>
          </div>

          {/* Log Out */}
          <div className="w-full bg-[#FAF4E8] rounded-[20px] md:rounded-[40px] flex items-center justify-between px-5 md:px-10 h-20 md:h-35">
            <span className="text-[16px] md:text-[24px] font-medium text-[#B77145] leading-[120%] tracking-[-3%]">
              Log out
            </span>
            <button
              onClick={logout}
              className="bg-[#B77145] hover:opacity-90 text-white text-[14px] md:text-[16px] font-semibold rounded-[30px] md:rounded-[40px] transition md:h-20 h-15  w-27.5 md:w-[160px] cursor-pointer"
            >
              Log Out
            </button>
          </div>

          {/* Delete Account */}
          <div className="w-full bg-[#FAF4E8] rounded-[20px] md:rounded-[40px] flex items-center justify-between px-5 md:px-10 h-20 md:h-35">
            <span className="text-[16px] md:text-[24px] font-medium text-[#B77145] leading-[120%] tracking-[-3%] cursor-pointer">
              Delete Account
            </span>
            <button
              onClick={deleteAccount}
              className="bg-[#68270B] hover:bg-[#47220f] text-white text-[14px] md:text-[16px] font-semibold rounded-[30px] md:rounded-[40px] transition md:h-20 h-15  w-27.5 md:w-[160px] cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* 0. EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div
          onClick={() => setIsEditModalOpen(false)}
          className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF4EB] w-full max-w-[700px] max-h-[90vh] rounded-[40px] p-6 md:p-12 relative flex flex-col md:flex-row gap-6 md:gap-14 border-none shadow-none overflow-y-scroll scrollbar-none"
          >
            {/* Close Button */}
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-6 right-6 text-[#68270B] font-bold text-xl hover:opacity-70 p-2"
            >
              ✕
            </button>

            {/* Left side: Avatar */}
            <div className="flex flex-col items-center gap-4 shrink-0 w-full md:w-auto mt-4 md:mt-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-gray-200">
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <label className="bg-white text-[#B77145] text-[14px] md:text-[16px] font-medium rounded-[30px] h-10 md:h-12 w-24 md:w-28 flex items-center justify-center cursor-pointer transition">
                Edit
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setEditAvatar(file);
                      setAvatarPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            </div>

            {/* Right side: Form Inputs */}
            <form
              onSubmit={handleProfileUpdate}
              className="flex-1 flex flex-col gap-6"
            >
              {/* Name */}
              <div>
                <label className="block text-[14px] font-medium text-[#68270B] mb-2">
                  Your Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-12 md:h-14 bg-white rounded-[30px] px-6 text-[#B77145] text-[14px] md:text-[16px] focus:outline-none placeholder-[#B77145]/50 border-none shadow-none"
                />
              </div>

              {/* Email (Disabled/Read-only) */}
              <div>
                <label className="block text-[14px] font-medium text-[#68270B] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full h-12 md:h-14 bg-white rounded-[30px] px-6 text-[#B77145] text-[14px] md:text-[16px] opacity-70 cursor-not-allowed focus:outline-none border-none shadow-none"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[14px] font-medium text-[#68270B] mb-2">
                  Phone number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full h-12 md:h-14 bg-white rounded-[30px] px-6 text-[#B77145] text-[14px] md:text-[16px] focus:outline-none placeholder-[#B77145]/50 border-none shadow-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-row justify-start gap-4 mt-2">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="bg-[#B77145] hover:opacity-90 text-white font-medium rounded-[30px] h-12 md:h-14 w-28 md:w-32 transition text-[14px] md:text-[16px] disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingProfile ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-white hover:bg-gray-50 text-[#B77145] font-medium rounded-[30px] h-12 md:h-14 w-28 md:w-32 transition text-[14px] md:text-[16px] cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              {/* New Password Input */}
              <div>
                <label className="block text-sm font-medium text-[#68270B] mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="m-0 w-full h-12 bg-white rounded-full pl-4 pr-12 text-sm focus:outline-none border border-transparent focus:border-[#B77145]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="password-toggle-btn"
                  >
                    <img
                      src={showPasswords ? hide : show}
                      alt="Toggle password visibility"
                      className="w-7 h-7 opacity-60 hover:opacity-100 transition-opacity"
                    />
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label className="block text-sm font-medium text-[#68270B] mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full h-12 bg-white rounded-full pl-4 pr-12 text-sm focus:outline-none border border-transparent focus:border-[#B77145]"
                  />
                </div>
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
                className="w-full h-15 bg-[#B77145] text-white font-semibold rounded-full hover:opacity-90 transition disabled:opacity-50"
              >
                {updatingPassword ? "Updating..." : "Save New Password"}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* 2. MULTI-STEP "SHARE YOUR STORY" POPUP MODAL */}
      {isShareModalOpen && (
        <div
          onClick={resetShareModal}
          className="fixed inset-0 bg-white/70 z-50 flex justify-center items-center p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF4EB] w-[330px] md:w-[500px] max-h-[90vh] overflow-y-auto p-4 md:p-8 rounded-[20px] md:rounded-[40px] flex flex-col justify-between relative transition-all shadow-xl"
          >
            {/* STEP 1: INITIAL SELECTION CARD */}
            {shareStep === "selection" && (
              <div className="flex flex-col justify-between items-center gap-6 md:gap-8 w-full">
                <div className="flex flex-col gap-4 w-full">
                  <div className="flex justify-start w-full">
                    <button
                      onClick={resetShareModal}
                      className="text-[#B77145] text-xl font-bold cursor-pointer"
                    >
                      <img
                        src={arrow}
                        alt="Arrow"
                        className="rotate-180 w-5 h-5"
                      />
                    </button>
                  </div>
                  {/* Avatars */}
                  <div className="flex justify-center h-auto">
                    <img
                      src={users}
                      alt="Community Members"
                      className="w-28 md:w-40 h-auto object-contain"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center text-center gap-3">
                  <h2 className="text-[20px] md:text-[34px] font-medium md:font-normal text-[#B77145] leading-[120%] tracking-[-2%]">
                    Share Your Story
                  </h2>

                  <p className="text-[12px] md:text-[16px] font-normal text-[#B77145] leading-relaxed max-w-[320px]">
                    Your story can help other individuals and families feel
                    informed, supported, and hopeful throughout their own
                    journey.
                  </p>
                </div>

                {/* Option Buttons */}
                <div className="w-full flex flex-col gap-3 md:gap-4 text-[14px] md:text-[16px]">
                  <button
                    onClick={() => setShareStep("review")}
                    className="w-full bg-white text-[#B77145] font-medium md:font-semibold rounded-[40px] hover:bg-gray-50 transition cursor-pointer h-12 md:h-[70px] flex items-center justify-center leading-[124%]"
                  >
                    Write a review
                  </button>

                  <button
                    onClick={() => setShareStep("video")}
                    className="w-full bg-[#B77145] text-white font-semibold rounded-[40px] hover:opacity-90 transition cursor-pointer h-12 md:h-[70px] flex items-center justify-center leading-[124%]"
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
                className="flex flex-col gap-4 md:gap-6 h-full w-full"
              >
                <div className="flex flex-col gap-4 justify-center w-full">
                  <div className="flex justify-start items-center">
                    <button
                      type="button"
                      onClick={() => setShareStep("selection")}
                      className="text-[#B77145] text-xl font-bold cursor-pointer"
                    >
                      <img
                        src={arrow}
                        alt="Arrow"
                        className="rotate-180 w-5 h-5"
                      />
                    </button>
                  </div>

                  <div className="text-center flex flex-col items-center gap-2 md:gap-3">
                    <h2 className="text-[20px] md:text-[34px] font-medium md:font-normal text-[#B77145]">
                      Write a review
                    </h2>
                    <p className="text-[12px] md:text-[16px] font-normal text-[#B77145] md:leading-tight px-2">
                      Record a short video sharing your ManaScience experience
                      and how it has supported your journey.
                    </p>
                  </div>
                </div>

                <div className="flex-1 ">
                  <textarea
                    rows={4}
                    required
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Write your feedback here..."
                    className="w-full min-h-[120px] text-[12px] md:text-[16px] bg-white rounded-[20px] p-4 md:p-6 text-[#B77145] placeholder-[#B77145]/60 focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading || !reviewText.trim()}
                  className="w-full h-12 md:h-[70px] bg-[#B77145] text-white font-medium text-[14px] md:text-[16px] rounded-full hover:opacity-90 transition disabled:opacity-50 cursor-pointer flex items-center justify-center"
                >
                  {uploading ? "Sharing..." : "Share"}
                </button>
              </form>
            )}

            {/* STEP 3: VIDEO CARD */}
            {shareStep === "video" && (
              <div className="flex flex-col justify-between h-full gap-4 md:gap-6 w-full">
                <div className="flex flex-col gap-4 w-full">
                  <div className="flex justify-start items-center">
                    <button
                      type="button"
                      onClick={() => setShareStep("selection")}
                      className="text-[#B77145] text-xl font-bold cursor-pointer"
                    >
                      <img
                        src={arrow}
                        alt="Arrow"
                        className="rotate-180 w-5 h-5"
                      />
                    </button>
                  </div>

                  <div className="text-center flex flex-col items-center gap-2">
                    <h2 className="text-[20px] md:text-[34px] font-medium md:font-normal text-[#B77145]">
                      Upload a Video
                    </h2>
                    <p className="text-[12px] md:text-[16px] font-normal text-[#B77145] md:leading-tight px-2">
                      Record a short video sharing your ManaScience experience
                      and how it has supported your journey.
                    </p>
                  </div>
                </div>

                <div
                  className="relative w-full h-[260px] rounded-3xl overflow-hidden flex flex-col justify-between p-5 bg-cover bg-center"
                  style={{ backgroundImage: `url(${uploadBg})` }}
                >
                  <div className="self-start">
                    <span className="flex items-center px-4 h-9 md:h-[60px] rounded-full text-[13px] md:text-[15px] font-semibold text-[#B77145] bg-white shadow-sm">
                      {uploading
                        ? "Uploading..."
                        : videoFile
                          ? "Uploaded!"
                          : "Not Recording"}
                    </span>
                  </div>

                  <div className="self-end">
                    <label
                      className={`cursor-pointer bg-white w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center hover:scale-105 transition-transform ${uploading ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <input
                        type="file"
                        accept="video/*"
                        capture="environment"
                        disabled={uploading}
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <img src={upload} alt="Upload" className="w-5 h-5" />
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
