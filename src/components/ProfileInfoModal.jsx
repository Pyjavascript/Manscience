import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuArrowLeft,
  LuChevronRight,
  LuEye,
  LuEyeOff,
  LuLock,
  LuLogOut,
  LuPencil,
  LuX,
} from "react-icons/lu";
import { supabase } from "../supabase";
import banner from "../assets/profile/banner.svg";
import UserImg from "../assets/profile/user.svg";
import {
  ROADMAP_RESULTS_TABLE,
  normalizeRoadmapResult,
  buildRoadmapTimeline,
} from "./ManasiAi/helpers";
import { fetchChatHistory } from "./ManasiAi/api";
import { DEFAULT_COUNTRY } from "./ManasiAi/constants";
import {
  COUNTRY_NAMES,
  GENDER_OPTIONS,
  getStateNames,
  isValidPhone,
} from "./ManasiAi/demographics";
import SelectDropdown from "./ManasiAi/SelectDropdown";

// Sizes are px, not Tailwind's rem scale, so Webflow's 14px/16px <html>
// font-size doesn't rescale the pop-up (same rule as the Manasi AI panel).

const FUNCTIONS_URL = "https://obzogpozgoolhededqkb.supabase.co/functions/v1";

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

const classificationText = (code) => {
  if (code === "ND") return "Neurodivergent";
  if (code === "NT") return "Neurotypical";
  return code || null;
};

const capitalize = (text) =>
  text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

const getDisplayName = (user, dbUser) =>
  dbUser?.name ||
  user?.user_metadata?.name ||
  user?.user_metadata?.full_name ||
  user?.email?.split("@")[0] ||
  "New Member";

// Everything the pop-up shows: auth user, users row, subscription, roadmap
async function loadProfileData() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: dbUser }, { data: subscription }, { data: roadmapRow }, chats] =
    await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from(ROADMAP_RESULTS_TABLE)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      fetchChatHistory(user.id),
    ]);

  return {
    user,
    dbUser,
    subscription,
    roadmap: normalizeRoadmapResult(roadmapRow),
    timeline: buildRoadmapTimeline(chats || [], roadmapRow),
  };
}

const SectionTitle = ({ children }) => (
  <h3 className="text-[13px] md:text-[14px] font-medium text-[#B77145]/70 mb-[12px] px-[4px]">
    {children}
  </h3>
);

// Label on the left, value on the right; missing values read "Not added"
const InfoRow = ({ label, value }) => (
  <li className="flex items-center justify-between gap-[16px] px-[20px] md:px-[28px] py-[16px]">
    <span className="text-[13px] md:text-[14px] leading-[140%] text-[#B77145]/70 shrink-0">
      {label}
    </span>
    {value ? (
      <span className="text-[13px] md:text-[14px] leading-[140%] font-medium text-[#5F2305] text-right break-all">
        {value}
      </span>
    ) : (
      <span className="text-[13px] md:text-[14px] leading-[140%] text-[#B77145]/50 italic">
        Not added
      </span>
    )}
  </li>
);

// Full-width row inside a white card that triggers an action
const ActionRow = ({ icon: Icon, label, onClick, disabled }) => (
  <li>
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-[12px] px-[20px] md:px-[28px] py-[16px] text-left text-[13px] md:text-[14px] leading-[140%] font-medium text-[#5F2305] hover:bg-[#FAF4E8]/70 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
    >
      <Icon className="w-[16px] h-[16px] shrink-0 text-[#B77145]" />
      <span className="flex-1">{label}</span>
      <LuChevronRight className="w-[16px] h-[16px] shrink-0 text-[#B77145]/60" />
    </button>
  </li>
);

const TextField = ({ label, ...inputProps }) => (
  <label className="block">
    <span className="block text-[13px] md:text-[14px] font-medium text-[#68270B] mb-[8px]">
      {label}
    </span>
    <input
      {...inputProps}
      className="w-full h-[48px] md:h-[52px] bg-white rounded-full px-[20px] text-[14px] md:text-[15px] text-[#5F2305] placeholder:text-[#B77145]/50 border border-transparent focus:border-[#B77145] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
    />
  </label>
);

const FormMessage = ({ error, success }) =>
  error ? (
    <p className="text-[13px] text-red-600 font-medium">{error}</p>
  ) : success ? (
    <p className="text-[13px] text-green-700 font-medium">{success}</p>
  ) : null;

// ---------- Details (default view) ----------

const DetailsView = ({
  data,
  displayName,
  avatar,
  onEdit,
  onChangePassword,
  onCancelSubscription,
  cancellingSubscription,
  onLogout,
}) => {
  const { user, dbUser, subscription, roadmap, timeline } = data;
  const memberSince = formatDate(dbUser?.created_at || user?.created_at);
  const classification = classificationText(roadmap?.classification);
  const completedCount = timeline.filter((e) => e.isComplete).length;
  const lastRoadmapDate = formatDate(roadmap?.updated_at || roadmap?.created_at);

  return (
    <>
      {/* Identity card: banner strip with the avatar overlapping it */}
      <section className="bg-white rounded-[24px] md:rounded-[30px] overflow-hidden">
        <div className="relative h-[96px] md:h-[112px]">
          <img
            src={banner}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/10" />
        </div>
        <div className="flex flex-col items-center text-center px-[20px] md:px-[28px] pb-[24px] md:pb-[28px] -mt-[48px] md:-mt-[56px]">
          <div className="relative w-[96px] h-[96px] md:w-[112px] md:h-[112px] rounded-full overflow-hidden ring-4 ring-white bg-[#FAF4E8] shadow-md">
            <img
              src={avatar}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="mt-[12px] md:mt-[16px] text-[20px] md:text-[24px] font-medium text-[#5F2305] leading-[120%] tracking-[-2%]">
            {displayName}
          </p>
          <p className="mt-[4px] text-[13px] md:text-[14px] leading-[140%] text-[#B77145] break-all">
            {user?.email}
          </p>
          {memberSince && (
            <span className="mt-[12px] text-[11px] md:text-[12px] font-semibold text-[#B77145] bg-[#FAF4E8] rounded-full px-[12px] py-[4px]">
              Member since {memberSince}
            </span>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="mt-[16px] h-[40px] px-[20px] flex items-center gap-[8px] rounded-full bg-[#68270B] text-white text-[13px] md:text-[14px] font-semibold hover:bg-[#7d3414] transition-colors cursor-pointer"
          >
            <LuPencil className="w-[14px] h-[14px]" /> Edit profile
          </button>
        </div>
      </section>

      <section>
        <SectionTitle>Personal details</SectionTitle>
        <ul className="bg-white rounded-[24px] md:rounded-[30px] divide-y divide-[#B77145]/15">
          <InfoRow label="Full name" value={displayName} />
          <InfoRow label="Email" value={user?.email} />
          <InfoRow label="Phone" value={dbUser?.phone} />
          <InfoRow label="Gender" value={capitalize(dbUser?.gender)} />
          <InfoRow
            label="Age"
            value={dbUser?.age != null ? String(dbUser.age) : null}
          />
          <InfoRow
            label="Location"
            value={
              [dbUser?.state, dbUser?.country].filter(Boolean).join(", ") ||
              dbUser?.location
            }
          />
        </ul>
      </section>

      <section>
        <SectionTitle>Subscription</SectionTitle>
        {subscription ? (
          <ul className="bg-white rounded-[24px] md:rounded-[30px] divide-y divide-[#B77145]/15 overflow-hidden">
            <InfoRow label="Plan" value={capitalize(subscription.plan)} />
            <InfoRow label="Status" value={capitalize(subscription.status)} />
            <InfoRow
              label="Renews on"
              value={formatDate(subscription.current_period_end)}
            />
            <li className="px-[20px] md:px-[28px] py-[14px] flex justify-end">
              <button
                type="button"
                onClick={onCancelSubscription}
                disabled={cancellingSubscription}
                className="h-[40px] px-[20px] rounded-full bg-[#B77145] text-white text-[13px] md:text-[14px] font-semibold hover:opacity-90 transition cursor-pointer disabled:opacity-50"
              >
                {cancellingSubscription ? "Cancelling..." : "Cancel subscription"}
              </button>
            </li>
          </ul>
        ) : (
          <div className="bg-white rounded-[24px] md:rounded-[30px] p-[20px] md:p-[28px] flex items-center justify-between gap-[16px]">
            <p className="text-[13px] md:text-[14px] leading-[140%] text-[#B77145]">
              You don't have an active subscription.
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.href = `${window.location.origin}/subscription`;
              }}
              className="h-[40px] px-[20px] shrink-0 rounded-full bg-[#B77145] text-white text-[13px] md:text-[14px] font-semibold hover:opacity-90 transition cursor-pointer"
            >
              Manage
            </button>
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Roadmap</SectionTitle>
        {roadmap ? (
          <ul className="bg-white rounded-[24px] md:rounded-[30px] divide-y divide-[#B77145]/15">
            <InfoRow label="Profile" value={classification} />
            <InfoRow label="Last completed" value={lastRoadmapDate} />
            <InfoRow
              label="Roadmaps taken"
              value={String(Math.max(completedCount, 1))}
            />
          </ul>
        ) : (
          <div className="bg-white rounded-[24px] md:rounded-[30px] p-[20px] md:p-[28px]">
            <p className="text-[13px] md:text-[14px] leading-[140%] text-[#B77145]">
              {timeline.length > 0
                ? "Your roadmap isn't finished yet. Results will show here once you complete it."
                : "You haven't taken a roadmap yet."}
            </p>
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Account</SectionTitle>
        <ul className="bg-white rounded-[24px] md:rounded-[30px] divide-y divide-[#B77145]/15 overflow-hidden">
          <ActionRow
            icon={LuLock}
            label="Change password"
            onClick={onChangePassword}
          />
          <ActionRow icon={LuLogOut} label="Log out" onClick={onLogout} />
        </ul>
      </section>
    </>
  );
};

// ---------- Edit profile ----------

const FieldLabel = ({ children }) => (
  <span className="block text-[13px] md:text-[14px] font-medium text-[#68270B] mb-[8px]">
    {children}
  </span>
);

// Stored gender may differ in case from the dropdown options
const toGenderOption = (gender) =>
  GENDER_OPTIONS.find((opt) => opt.toLowerCase() === gender?.toLowerCase()) ||
  "";

const EditProfileView = ({ user, dbUser, displayName, avatar, onSaved, onCancel }) => {
  const [name, setName] = useState(displayName);
  const [phone, setPhone] = useState(dbUser?.phone || "");
  const [gender, setGender] = useState(toGenderOption(dbUser?.gender));
  const [age, setAge] = useState(dbUser?.age != null ? String(dbUser.age) : "");
  const [country, setCountry] = useState(dbUser?.country || DEFAULT_COUNTRY);
  const [state, setState] = useState(dbUser?.state || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(avatar);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Free the local preview URL when it's replaced or the view closes
  useEffect(() => {
    if (!avatarFile) return;
    return () => URL.revokeObjectURL(avatarPreview);
  }, [avatarFile, avatarPreview]);

  // Countries without a state list get a free-text field instead
  const stateOptions = useMemo(() => getStateNames(country), [country]);

  // A new country invalidates the chosen state
  const changeCountry = (next) => {
    if (next === country) return;
    setCountry(next);
    setState("");
  };

  const trimmedPhone = phone.trim();
  const phoneInvalid = trimmedPhone !== "" && !isValidPhone(trimmedPhone);
  const ageNumber = age === "" ? null : Number(age);
  const ageInvalid =
    ageNumber !== null &&
    (!Number.isInteger(ageNumber) || ageNumber < 1 || ageNumber > 120);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (phoneInvalid) {
      setError("Enter a valid phone number.");
      return;
    }
    if (ageInvalid) {
      setError("Enter an age between 1 and 120.");
      return;
    }
    setSaving(true);

    try {
      let avatarUrl = dbUser?.avatar_url || null;

      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const filePath = `${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;

        avatarUrl = supabase.storage.from("avatars").getPublicUrl(filePath)
          .data.publicUrl;
      }

      const { error: dbError } = await supabase
        .from("users")
        .update({
          name: name.trim(),
          phone: trimmedPhone,
          gender: gender || null,
          age: ageNumber,
          country: country || null,
          state: state.trim() || null,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);
      if (dbError) throw dbError;

      // Keep the auth metadata in sync with the users row
      await supabase.auth.updateUser({
        data: { name: name.trim(), full_name: name.trim() },
      });

      onSaved({ name: name.trim(), avatarUrl });
    } catch (err) {
      setError(`Couldn't update your profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-[24px] md:rounded-[30px] p-[20px] md:p-[28px] flex flex-col gap-[20px]"
    >
      <div className="flex flex-col items-center gap-[12px]">
        <div className="w-[96px] h-[96px] md:w-[112px] md:h-[112px] rounded-full overflow-hidden bg-[#FAF4E8]">
          <img
            src={avatarPreview}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <label className="h-[36px] px-[18px] flex items-center rounded-full bg-[#FAF4E8] text-[#B77145] text-[13px] md:text-[14px] font-semibold cursor-pointer hover:bg-[#F3E7D3] transition-colors">
          Change photo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setAvatarFile(file);
                setAvatarPreview(URL.createObjectURL(file));
              }
            }}
          />
        </label>
      </div>

      <div className="flex flex-col gap-[16px] [&_input]:bg-[#FAF4E8]">
        <TextField
          label="Your full name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField label="Email address" type="email" value={user?.email || ""} disabled />
        <TextField
          label="Phone number"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={phoneInvalid}
        />
      </div>

      <div className="flex flex-col gap-[16px]">
        <h4 className="text-[13px] md:text-[14px] font-medium text-[#B77145]/70 px-[4px]">
          Demographics
        </h4>

        <div className="grid grid-cols-2 gap-[12px]">
          <div className="min-w-0">
            <FieldLabel>Gender</FieldLabel>
            <SelectDropdown
              value={gender}
              onChange={setGender}
              options={GENDER_OPTIONS}
              placeholder="Select"
              triggerClassName="w-full h-[48px] md:h-[52px] bg-[#FAF4E8] rounded-full px-[20px] text-[14px] md:text-[15px] text-[#5F2305] placeholder:text-[#B77145]/50 border border-transparent focus:border-[#B77145] focus:outline-none"
            />
          </div>
          <label className="block min-w-0">
            <FieldLabel>Age</FieldLabel>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Age"
              aria-invalid={ageInvalid}
              className="w-full h-[48px] md:h-[52px] bg-[#FAF4E8] rounded-full px-[20px] text-[14px] md:text-[15px] text-[#5F2305] placeholder:text-[#B77145]/50 border border-transparent focus:border-[#B77145] focus:outline-none no-spinner"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-[12px]">
          <div className="min-w-0">
            <FieldLabel>Country</FieldLabel>
            <SelectDropdown
              value={country}
              onChange={changeCountry}
              options={COUNTRY_NAMES}
              placeholder="Country"
              triggerClassName="w-full h-[48px] md:h-[52px] bg-[#FAF4E8] rounded-full px-[20px] text-[14px] md:text-[15px] text-[#5F2305] placeholder:text-[#B77145]/50 border border-transparent focus:border-[#B77145] focus:outline-none"
              matchTriggerWidth
              searchable
            />
          </div>
          <div className="min-w-0">
            <FieldLabel>State</FieldLabel>
            {stateOptions.length > 0 ? (
              <SelectDropdown
                value={state}
                onChange={setState}
                options={stateOptions}
                placeholder="State"
                triggerClassName="w-full h-[48px] md:h-[52px] bg-[#FAF4E8] rounded-full px-[20px] text-[14px] md:text-[15px] text-[#5F2305] placeholder:text-[#B77145]/50 border border-transparent focus:border-[#B77145] focus:outline-none"
                matchTriggerWidth
                searchable
              />
            ) : (
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State / Province"
                aria-label="State or province"
                autoComplete="address-level1"
                className="w-full h-[48px] md:h-[52px] bg-[#FAF4E8] rounded-full px-[20px] text-[14px] md:text-[15px] text-[#5F2305] placeholder:text-[#B77145]/50 border border-transparent focus:border-[#B77145] focus:outline-none"
              />
            )}
          </div>
        </div>
      </div>

      <FormMessage error={error} />

      <div className="flex gap-[12px]">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 h-[48px] md:h-[52px] rounded-full bg-[#B77145] text-white text-[14px] md:text-[15px] font-semibold hover:opacity-90 transition cursor-pointer disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-[48px] md:h-[52px] rounded-full bg-[#FAF4E8] text-[#B77145] text-[14px] md:text-[15px] font-semibold hover:bg-[#F3E7D3] transition-colors cursor-pointer"
        >
          Discard
        </button>
      </div>
    </form>
  );
};

// ---------- Change password ----------

const PasswordView = ({ onDone }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updating, setUpdating] = useState(false);

  // Go back to the details shortly after a successful update
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(onDone, 1500);
    return () => clearTimeout(timer);
  }, [success, onDone]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setUpdating(true);
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;
      setSuccess("Password updated successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  const ToggleIcon = showPasswords ? LuEyeOff : LuEye;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-[24px] md:rounded-[30px] p-[20px] md:p-[28px] flex flex-col gap-[20px]"
    >
      <div className="flex flex-col gap-[16px] [&_input]:bg-[#FAF4E8]">
        <div className="relative">
          <TextField
            label="New password"
            type={showPasswords ? "text" : "password"}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 8 characters"
          />
          <button
            type="button"
            onClick={() => setShowPasswords((v) => !v)}
            aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
            className="absolute right-[8px] bottom-[6px] md:bottom-[8px] w-[36px] h-[36px] flex items-center justify-center rounded-full text-[#B77145]/70 hover:text-[#B77145] cursor-pointer"
          >
            <ToggleIcon className="w-[18px] h-[18px]" />
          </button>
        </div>
        <TextField
          label="Confirm new password"
          type={showPasswords ? "text" : "password"}
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter password"
        />
      </div>

      <FormMessage error={error} success={success} />

      <button
        type="submit"
        disabled={updating || !!success}
        className="w-full h-[48px] md:h-[52px] rounded-full bg-[#B77145] text-white text-[14px] md:text-[15px] font-semibold hover:opacity-90 transition cursor-pointer disabled:opacity-50"
      >
        {updating ? "Updating..." : "Save new password"}
      </button>
    </form>
  );
};

// ---------- Pop-up shell ----------

const VIEW_TITLES = {
  details: "My Profile",
  edit: "Edit Profile",
  password: "Change Password",
};

// Profile pop-up: details plus edit profile, subscription, password and
// log out. Loads its own data so it can open from anywhere.
const ProfileInfoModal = ({ onClose, onLogout, onProfileUpdated }) => {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [view, setView] = useState("details");
  const [cancellingSubscription, setCancellingSubscription] = useState(false);

  // Height of the details view, kept as the minimum for the edit and
  // password views so the pop-up doesn't shrink when switching
  const dialogRef = useRef(null);
  const [detailsHeight, setDetailsHeight] = useState(null);

  useEffect(() => {
    if (view !== "details" || !data || !dialogRef.current) return;
    const el = dialogRef.current;
    // Observe so the height stays right after images load / screen resizes
    const observer = new ResizeObserver(() => setDetailsHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [view, data]);

  useEffect(() => {
    let cancelled = false;
    loadProfileData()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        console.error("Error loading profile:", err.message);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Escape steps back from a sub-view, or closes from the details
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (view === "details") onClose();
      else setView("details");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [view, onClose]);

  const backToDetails = useCallback(() => setView("details"), []);

  async function logout() {
    if (onLogout) {
      onLogout();
      return;
    }
    await supabase.auth.signOut();
    window.location.href = `${window.location.origin}/auth`;
  }

  async function cancelSubscription() {
    if (!window.confirm("Cancel subscription?")) return;

    try {
      setCancellingSubscription(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session.access_token}` };

      await fetch(`${FUNCTIONS_URL}/cancel-subscription`, {
        method: "POST",
        headers,
      });
      await fetch(`${FUNCTIONS_URL}/delete-subscription`, {
        method: "POST",
        headers,
      });

      setData((prev) => ({ ...prev, subscription: null }));
      alert("Subscription cancelled successfully.");
    } catch (err) {
      alert(`Error cancelling subscription: ${err.message}`);
    } finally {
      setCancellingSubscription(false);
    }
  }

  const handleProfileSaved = (updated) => {
    onProfileUpdated?.(updated);
    setReloadKey((k) => k + 1);
    setView("details");
  };

  const displayName = data ? getDisplayName(data.user, data.dbUser) : "";
  const avatar = data?.dbUser?.avatar_url || UserImg;

  const renderBody = () => {
    if (loadError) {
      return (
        <p className="py-[24px] text-center text-[14px] text-[#B77145]">
          Couldn't load your profile. Please try again.
        </p>
      );
    }
    if (!data) {
      return (
        <p className="py-[24px] text-center text-[14px] text-[#B77145]">
          Loading…
        </p>
      );
    }
    if (view === "edit") {
      return (
        <EditProfileView
          user={data.user}
          dbUser={data.dbUser}
          displayName={displayName}
          avatar={avatar}
          onSaved={handleProfileSaved}
          onCancel={backToDetails}
        />
      );
    }
    if (view === "password") {
      return <PasswordView onDone={backToDetails} />;
    }
    return (
      <DetailsView
        data={data}
        displayName={displayName}
        avatar={avatar}
        onEdit={() => setView("edit")}
        onChangePassword={() => setView("password")}
        onCancelSubscription={cancelSubscription}
        cancellingSubscription={cancellingSubscription}
        onLogout={logout}
      />
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-white/70 z-50 flex justify-center items-center p-[16px] backdrop-blur-xs"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        style={
          view !== "details" && detailsHeight
            ? { minHeight: detailsHeight }
            : undefined
        }
        role="dialog"
        aria-modal="true"
        aria-label={VIEW_TITLES[view]}
        className="bg-[#FAF4EB] w-full max-w-[600px] max-h-[90vh] rounded-[32px] md:rounded-[40px] overflow-y-auto scrollbar-none shadow-xl manrope text-[#5F2305] select-text"
      >
        <div className="sticky top-0 z-10 bg-[#FAF4EB] flex items-center justify-between gap-[16px] px-[20px] md:px-[32px] pt-[24px] md:pt-[32px] pb-[20px]">
          <div className="flex items-center gap-[8px] min-w-0">
            {view !== "details" && (
              <button
                type="button"
                onClick={backToDetails}
                aria-label="Back"
                className="w-[40px] h-[40px] -ml-[8px] shrink-0 flex items-center justify-center rounded-full text-[#68270B] hover:bg-[#68270B]/8 transition cursor-pointer"
              >
                <LuArrowLeft className="w-[20px] h-[20px]" />
              </button>
            )}
            <h2 className="truncate text-[22px] md:text-[28px] font-medium text-[#5F2305] leading-[120%] tracking-[-2%]">
              {VIEW_TITLES[view]}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-[40px] h-[40px] shrink-0 flex items-center justify-center rounded-full text-[#68270B] hover:bg-[#68270B]/8 transition cursor-pointer"
          >
            <LuX className="w-[20px] h-[20px]" />
          </button>
        </div>

        <div className="flex flex-col gap-[32px] md:gap-[40px] px-[20px] md:px-[32px] pb-[24px] md:pb-[32px]">
          {renderBody()}
        </div>
      </div>
    </div>
  );
};

export default ProfileInfoModal;
