import { useState } from "react";
import { supabase } from "../supabase";
import { FaUserMd, FaCloudUploadAlt, FaFileAlt, FaTimes } from "react-icons/fa";

export default function PractitionerForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "",
    education: "",
    experience: "",
    approach_to_care: "",
    therapies_offered: "",
    research_papers: "",
  });

  const [profileImage, setProfileImage] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const uploadFile = async (file, folder) => {
    const fileName = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("practitioners")
      .upload(`${folder}/${fileName}`, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("practitioners")
      .getPublicUrl(`${folder}/${fileName}`);

    return data.publicUrl;
  };

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCertificateChange = (e) => {
    const files = Array.from(e.target.files);
    // This allows appending files securely if they select multiple times
    setCertificates((prev) => [...prev, ...files]);
  };

  const removeCertificate = (indexToRemove) => {
    setCertificates((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");

      let profileImageUrl = "";
      if (profileImage) {
        profileImageUrl = await uploadFile(profileImage, "profile-images");
      }

      const certificateImages = [];
      for (const cert of certificates) {
        const url = await uploadFile(cert, "certificates");
        certificateImages.push({ url });
      }

      const { error: invokeError } = await supabase.functions.invoke(
        "submit-practitioner",
        {
          body: {
            ...form,
            profile_image: profileImageUrl,
            certificate_images: certificateImages,
          },
        }
      );

      if (invokeError) throw invokeError;

      setSubmitted(true);
      setForm({
        name: "",
        email: "",
        phone: "",
        specialization: "",
        education: "",
        experience: "",
        approach_to_care: "",
        therapies_offered: "",
        research_papers: "",
      });
      setProfileImage(null);
      setCertificates([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-xl w-full bg-white border border-gray-200 p-10 rounded-3xl shadow-sm text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
            ✓
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Application Submitted
          </h2>
          <p className="mt-3 text-gray-500 text-sm leading-relaxed">
            Thank you for applying. Your professional profile has been securely sent 
            to management for review and will become live in the system directory upon approval.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-3xl overflow-hidden">
        
        {/* Form Banner Header */}
        <div className="p-8 border-b border-gray-100 bg-slate-50 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#5932EA] text-white flex items-center justify-center shadow-md shadow-indigo-100">
            <FaUserMd size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Practitioner Application
            </h1>
         
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
              <strong>Submission Error:</strong> {error}
            </div>
          )}

          {/* Section 1: Identity & Contact */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
              1. Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 px-1">Full Name *</label>
                <input
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Dr. Jane Doe"
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#5932EA] focus:bg-white transition"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 px-1">Email Address *</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="jane.doe@example.com"
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#5932EA] focus:bg-white transition"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 px-1">Phone Number</label>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#5932EA] focus:bg-white transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 px-1">Medical Specialization</label>
                <input
                  name="specialization"
                  type="text"
                  value={form.specialization}
                  onChange={handleChange}
                  placeholder="Clinical Psychology, Neurofeedback, etc."
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#5932EA] focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section 2: Professional Experience & Background */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
              2. Experience & Background
            </h3>
            <div className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 px-1">Education History</label>
                <textarea
                  name="education"
                  value={form.education}
                  onChange={handleChange}
                  placeholder="List your academic degrees, universities, and graduation years..."
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-3.5 text-sm h-28 resize-none focus:outline-none focus:border-[#5932EA] focus:bg-white transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 px-1">Professional Experience</label>
                <textarea
                  name="experience"
                  value={form.experience}
                  onChange={handleChange}
                  placeholder="Detail your clinical practices, years active, and former roles..."
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-3.5 text-sm h-28 resize-none focus:outline-none focus:border-[#5932EA] focus:bg-white transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 px-1">Approach to Care</label>
                <textarea
                  name="approach_to_care"
                  value={form.approach_to_care}
                  onChange={handleChange}
                  placeholder="Describe your general methodology and patient relationship style..."
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-3.5 text-sm h-28 resize-none focus:outline-none focus:border-[#5932EA] focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 px-1">Therapies Offered</label>
                  <textarea
                    name="therapies_offered"
                    value={form.therapies_offered}
                    onChange={handleChange}
                    placeholder="e.g. CBT, EMDR, Somatic Experiencing"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-3.5 text-sm h-28 resize-none focus:outline-none focus:border-[#5932EA] focus:bg-white transition"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 px-1">Research Papers & Publications</label>
                  <textarea
                    name="research_papers"
                    value={form.research_papers}
                    onChange={handleChange}
                    placeholder="List DOI links or titles of your published materials..."
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-3.5 text-sm h-28 resize-none focus:outline-none focus:border-[#5932EA] focus:bg-white transition"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section 3: Document Attachments */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
              3. Verification Documents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Profile Image Area */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-600 px-1">Profile Image</span>
                <label className="group border border-dashed border-gray-200 hover:border-[#5932EA] hover:bg-slate-50/50 rounded-2xl p-6 transition flex flex-col items-center justify-center cursor-pointer text-center min-h-35">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfileImage(e.target.files[0])}
                    className="hidden"
                  />
                  <FaCloudUploadAlt size={28} className="text-gray-300 group-hover:text-[#5932EA] transition mb-2" />
                  <span className="text-sm font-medium text-gray-700">
                    {profileImage ? profileImage.name : "Choose profile portrait"}
                  </span>
                  <span className="text-gray-400 text-xs mt-1">PNG, JPG up to 5MB</span>
                </label>
              </div>

              {/* Certificates Area */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-600 px-1">Certificates & Licenses</span>
                <label className="group border border-dashed border-gray-200 hover:border-[#5932EA] hover:bg-slate-50/50 rounded-2xl p-6 transition flex flex-col items-center justify-center cursor-pointer text-center min-h-35">
                  {/* Multiple parameter active natively */}
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleCertificateChange}
                    className="hidden"
                  />
                  <FaCloudUploadAlt size={28} className="text-gray-300 group-hover:text-[#5932EA] transition mb-2" />
                  <span className="text-sm font-medium text-gray-700">Click to attach files</span>
                  <span className="text-gray-400 text-xs mt-1">Select multiple Images or PDFs</span>
                </label>
              </div>

            </div>

            {/* Render selected certificates list with clear indicators and deletion capabilities */}
            {certificates.length > 0 && (
              <div className="mt-4 bg-slate-50 border border-gray-100 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Selected Certificates ({certificates.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {certificates.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-xs">
                      <div className="flex items-center gap-2 max-w-[85%]">
                        <FaFileAlt className="text-indigo-400 shrink-0" />
                        <span className="text-gray-700 font-medium truncate">{file.name}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeCertificate(idx)}
                        className="text-gray-400 hover:text-red-500 p-1 transition"
                      >
                        <FaTimes size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger Row */}
          <div className="pt-4 flex justify-end">
            <button
              disabled={submitting}
              className="w-full sm:w-auto bg-[#5932EA] hover:bg-[#4a27cc] text-white py-3.5 px-10 rounded-xl font-medium shadow-lg shadow-indigo-100 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? "Processing Submission..." : "Submit Application Form"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}