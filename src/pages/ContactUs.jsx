import { useState } from "react";
import { MapPin, Mail, BriefcaseBusiness } from "lucide-react";
// Paste your Web3Forms access key here (get one free at https://web3forms.com)
const WEB3FORMS_ACCESS_KEY = "94dd8fb0-9c0f-4495-b6d7-15e7d6385b42";

const EMPTY_FORM = { name: "", email: "", phone: "", message: "" };

const CONTACT_INFO = [
  { icon: MapPin, title: "Our Office", value: "Kolkata, India" },
  {
    icon: Mail,
    title: "General Enquiries",
    value: "Team@manascience.in",
    href: "mailto:Team@manascience.in",
  },
  {
    icon: BriefcaseBusiness,
    title: "Career",
    value: "careers@manascience.in",
    href: "mailto:careers@manascience.in",
  },
];

const validate = ({ name, email, phone }) => {
  const errors = {};
  const digits = phone.replace(/\D/g, "");

  if (name.trim().length < 2) errors.name = "Enter your name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
    errors.email = "Enter a valid email";
  if (!/^[+\d\s()-]+$/.test(phone) || digits.length < 7 || digits.length > 15)
    errors.phone = "Enter a valid phone number";

  return errors;
};

// Label + input pair used by every field in the card
const Field = ({ id, label, error, children }) => (
  <div className="flex flex-col">
    <label
      htmlFor={id}
      className="mb-1.5 md:mb-2 px-0.5 text-[11px] md:text-[13px] lg:text-[14px] font-medium leading-[130%] text-[#8C4626]"
    >
      {label}
    </label>
    {children}
    {error && (
      <p className="mt-1 px-3 text-[11px] md:text-[12px] text-red-500">{error}</p>
    )}
  </div>
);

// Full contact page at /contact-us: info on the left, form card on the right
const ContactUs = () => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = { ...form, [name]: value };
    setForm(next);
    if (submitted) setErrors(validate(next));
    if (status !== "idle" && status !== "sending") setStatus("idle");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setSubmitted(true);
    if (Object.keys(found).length) return;

    // Honeypot: bots fill this hidden field, people never see it
    if (e.currentTarget.botcheck?.checked) return;

    setStatus("sending");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: `New contact enquiry from ${form.name.trim()}`,
          from_name: "ManaScience Contact Form",
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          message: form.message.trim() || "(No message)",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Web3Forms rejected the submission");
    } catch (err) {
      console.error("Contact form failed:", err);
      setStatus("error");
      return;
    }
    setStatus("sent");
    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitted(false);
  };

  const inputClass = (field) =>
    `w-full h-10 md:h-12 lg:h-[52px] px-3 md:px-4 rounded-full bg-white border text-[11px] md:text-[13px] lg:text-[14px] text-[#68270B] placeholder:text-[#B77145]/55 outline-none transition ${
      errors[field] ? "border-red-300" : "border-transparent focus:border-[#B77145]/40"
    }`;

  return (
    <section className="manrope w-full bg-white">
      <div className="mx-auto w-full max-w-[1328px] px-4 md:px-8 lg:px-14 py-6 md:py-12 lg:py-14 grid grid-cols-[minmax(0,1fr)] md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,580px)] gap-7 md:gap-10 lg:gap-16">
        {/* Left: heading + contact details */}
        <div className="flex flex-col md:justify-between">
          <div className="pt-4">
            <span className="inline-flex items-center h-8 md:h-10 lg:h-11 px-4 md:px-5 lg:px-6 rounded-full bg-[#FAF4E8] text-[11px] md:text-[13px] lg:text-[15px] font-medium text-[#B77145]">
              Get in Touch
            </span>
            <h1 className="mt-3 md:mt-4 text-[32px] md:text-[52px] lg:text-[64px] font-normal leading-[110%] tracking-[-0.02em] text-[#B77145]">
              Contact us
            </h1>
            <p className="mt-2 md:mt-4 text-[12px] md:text-[14px] lg:text-[16px] leading-[140%] text-[#B77145]">
              Guidance for every next step.
              <br />
              Discover. Understand. Decide. Grow.
            </p>
          </div>

          <ul className="mt-9 md:mt-12 flex flex-col gap-5 md:gap-7 lg:gap-8 md:pb-4">
            {CONTACT_INFO.map(({ icon: Icon, title, value, href }) => (
              <li key={title} className="flex items-center gap-3 md:gap-4">
                <span className="shrink-0 flex items-center justify-center w-8 h-8 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full bg-[#FAF4E8] text-[#B77145]">
                  <Icon className="w-4 h-4 md:w-[18px] md:h-[18px] lg:w-5 lg:h-5" strokeWidth={1.75} />
                </span>
                <div className="text-[12px] md:text-[14px] lg:text-[15px] leading-[135%] text-[#B77145]">
                  <p>{title}</p>
                  {href ? (
                    <a href={href} className="hover:text-[#68270B] transition">
                      {value}
                    </a>
                  ) : (
                    <p>{value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: form card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="w-full flex flex-col gap-3.5 md:gap-5 p-4 md:p-5 rounded-[24px] md:rounded-[32px] bg-[#FAF4E8]"
        >
          <input
            type="checkbox"
            name="botcheck"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />
          <Field id="contact-us-name" label="Full Name" error={errors.name}>
            <input
              id="contact-us-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={form.name}
              onChange={handleChange}
              aria-invalid={!!errors.name}
              className={inputClass("name")}
            />
          </Field>

          <Field id="contact-us-email" label="Email Address" error={errors.email}>
            <input
              id="contact-us-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Your email address"
              value={form.email}
              onChange={handleChange}
              aria-invalid={!!errors.email}
              className={inputClass("email")}
            />
          </Field>

          <Field id="contact-us-phone" label="Phone Number" error={errors.phone}>
            <input
              id="contact-us-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="Your phone number"
              value={form.phone}
              onChange={handleChange}
              aria-invalid={!!errors.phone}
              className={inputClass("phone")}
            />
          </Field>

          <Field id="contact-us-message" label="Message (Optional)">
            <textarea
              id="contact-us-message"
              name="message"
              rows={4}
              maxLength={2000}
              placeholder="Tell us how we can help you."
              value={form.message}
              onChange={handleChange}
              className="w-full h-24 md:h-28 lg:h-[116px] px-3 md:px-4 py-2.5 md:py-3 rounded-[16px] md:rounded-[20px] bg-white border border-transparent focus:border-[#B77145]/40 text-[11px] md:text-[13px] lg:text-[14px] leading-[150%] text-[#68270B] placeholder:text-[#B77145]/55 outline-none resize-none transition"
            />
          </Field>

          <div className="mt-0.5 md:mt-1">
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full h-10 md:h-12 lg:h-[54px] rounded-full bg-[#B77145] text-white text-[12px] md:text-[14px] lg:text-[15px] font-medium hover:bg-[#68270B] transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {status === "sending" ? "Sending..." : "Submit"}
            </button>
            {status === "sent" && (
              <p className="mt-2 text-center text-[11px] md:text-[13px] text-[#B77145]">
                Thank you! We'll get back to you soon.
              </p>
            )}
            {status === "error" && (
              <p className="mt-2 text-center text-[11px] md:text-[13px] text-red-500">
                Couldn't send. Please try again.
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
};

export default ContactUs;
