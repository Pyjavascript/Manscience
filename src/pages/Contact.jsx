import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, CheckCircle2 } from "lucide-react";
import { supabase } from "../supabase";

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;

const EMPTY_FORM = { name: "", email: "", phone: "", message: "" };

const validate = ({ name, email, phone, message }) => {
  const errors = {};
  const digits = phone.replace(/\D/g, "");

  if (name.trim().length < 2) errors.name = "Enter your name";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
    errors.email = "Enter a valid email";

  if (!/^[+\d\s()-]+$/.test(phone) || digits.length < 7 || digits.length > 15)
    errors.phone = "Enter a valid phone number";

  const len = message.trim().length;
  if (len < MESSAGE_MIN) errors.message = `At least ${MESSAGE_MIN} characters`;
  else if (len > MESSAGE_MAX) errors.message = "Message is too long";

  return errors;
};

// Contact form shown as a pop-up at /contact
const Contact = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  const close = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  // Esc closes the pop-up and the page behind it stops scrolling
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = { ...form, [name]: value };
    setForm(next);
    if (touched[name]) setErrors(validate(next));
  };

  const handleBlur = (e) => {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
    setErrors(validate(form));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setTouched({ name: true, email: true, phone: true, message: true });
    if (Object.keys(found).length) return;

    setStatus("sending");
    const { error } = await supabase.from("contact_messages").insert([
      {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        message: form.message.trim(),
      },
    ]);

    if (error) {
      console.error("Contact form failed:", error);
      setStatus("error");
      return;
    }
    setStatus("sent");
    setForm(EMPTY_FORM);
    setTouched({});
  };

  const showError = (field) => touched[field] && errors[field];

  return (
    <div
      onClick={close}
      className="fixed inset-0 bg-white/70 z-50 flex justify-center items-center p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Contact us"
        className="bg-[#FAF4EB] w-full max-w-[600px] max-h-[90vh] rounded-[32px] md:rounded-[40px] overflow-y-auto scrollbar-none shadow-xl manrope"
      >
        <div className="flex items-center justify-between gap-4 px-5 md:px-8 pt-6 md:pt-8 pb-5">
          <h2 className="text-[22px] md:text-[28px] font-medium text-[#5F2305] leading-[120%] tracking-[-2%]">
            Contact Us
          </h2>
          <button
            onClick={close}
            aria-label="Close"
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#68270B] text-[18px] font-bold hover:bg-[#68270B]/8 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {status === "sent" ? (
          <div className="flex flex-col items-center text-center px-5 md:px-8 pt-4 pb-8 md:pb-10">
            <CheckCircle2 size={44} strokeWidth={1.5} className="text-[#B05A36]" />
            <p className="mt-4 text-[20px] md:text-[24px] font-medium text-[#5F2305] leading-[120%] tracking-[-2%]">
              Message sent
            </p>
            <p className="mt-2 text-[13px] md:text-[14px] leading-[140%] text-[#B77145]">
              We'll get back to you soon.
            </p>
            <button
              onClick={close}
              className="mt-7 h-12 px-10 rounded-full bg-[#B05A36] text-white text-[14px] font-semibold hover:bg-[#68270B] transition cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-5 px-5 md:px-8 pb-6 md:pb-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label
                  htmlFor="contact-name"
                  className="text-[13px] md:text-[14px] font-medium text-[#B77145]/70 mb-2 px-1"
                >
                  Name
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  value={form.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={!!showError("name")}
                  className={`h-12 w-full px-4 rounded-[16px] bg-white border text-[14px] text-[#5F2305] placeholder:text-[#B77145]/40 outline-none transition ${
                    showError("name")
                      ? "border-red-300"
                      : "border-transparent focus:border-[#B77145]/40"
                  }`}
                />
                {showError("name") && (
                  <p className="mt-1.5 px-1 text-[12px] text-red-500">{errors.name}</p>
                )}
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="contact-email"
                  className="text-[13px] md:text-[14px] font-medium text-[#B77145]/70 mb-2 px-1"
                >
                  Email
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={!!showError("email")}
                  className={`h-12 w-full px-4 rounded-[16px] bg-white border text-[14px] text-[#5F2305] placeholder:text-[#B77145]/40 outline-none transition ${
                    showError("email")
                      ? "border-red-300"
                      : "border-transparent focus:border-[#B77145]/40"
                  }`}
                />
                {showError("email") && (
                  <p className="mt-1.5 px-1 text-[12px] text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="contact-phone"
                  className="text-[13px] md:text-[14px] font-medium text-[#B77145]/70 mb-2 px-1"
                >
                  Phone
                </label>
                <input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={!!showError("phone")}
                  className={`h-12 w-full px-4 rounded-[16px] bg-white border text-[14px] text-[#5F2305] placeholder:text-[#B77145]/40 outline-none transition ${
                    showError("phone")
                      ? "border-red-300"
                      : "border-transparent focus:border-[#B77145]/40"
                  }`}
                />
                {showError("phone") && (
                  <p className="mt-1.5 px-1 text-[12px] text-red-500">{errors.phone}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <label
                htmlFor="contact-message"
                className="text-[13px] md:text-[14px] font-medium text-[#B77145]/70 mb-2 px-1"
              >
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={5}
                maxLength={MESSAGE_MAX}
                placeholder="How can we help?"
                value={form.message}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={!!showError("message")}
                className={`w-full px-4 py-3 rounded-[16px] bg-white border text-[14px] leading-[150%] text-[#5F2305] placeholder:text-[#B77145]/40 outline-none resize-none transition ${
                  showError("message")
                    ? "border-red-300"
                    : "border-transparent focus:border-[#B77145]/40"
                }`}
              />
              <div className="mt-1.5 px-1 flex justify-between gap-3 text-[12px]">
                <p className="text-red-500">{showError("message") && errors.message}</p>
                <p className="text-[#B77145]/50 tabular-nums">
                  {form.message.length}/{MESSAGE_MAX}
                </p>
              </div>
            </div>

            {status === "error" && (
              <p className="px-1 text-[13px] text-red-500">
                Couldn't send. Please try again.
              </p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="h-12 w-full sm:w-auto sm:self-end px-8 flex items-center justify-center gap-2 rounded-full bg-[#B05A36] text-white text-[14px] font-semibold hover:bg-[#68270B] transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {status === "sending" ? "Sending..." : "Send"}
              <Send size={15} strokeWidth={2} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Contact;
