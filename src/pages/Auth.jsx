import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import bg from "../assets/Ai/bg.svg";
import Logo from "../assets/form/LogoBrown.svg";
import google from "../assets/form/google.svg";
import hide from "../assets/form/hide.svg";
import or from "../assets/form/or.svg";

export default function Auth() {
  const navigate = useNavigate();
  // authMode can be: "login", "signup", or "forgot"
  const [authMode, setAuthMode] = useState("login");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resending, setResending] = useState(false);

  // Field-specific error messages
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const maskEmail = (str) => {
    if (!str || !str.includes("@")) return str;
    const [local, domain] = str.split("@");
    const maskedLocal =
      local.length > 2
        ? local[0] + "*".repeat(local.length - 2) + local[local.length - 1]
        : local;
    return `${maskedLocal}@${domain}`;
  };

  const resetErrors = () => {
    setEmailError("");
    setPasswordError("");
  };

  async function signup() {
    resetErrors();

    if (password.length < 8) {
      setPasswordError("Minimum 8 Characters Required");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/profile`,
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("email")) {
        setEmailError(error.message);
      } else if (error.message.toLowerCase().includes("password")) {
        setPasswordError(error.message);
      } else {
        setEmailError(error.message);
      }
      return;
    }

    if (data.user && !data.session) {
      setIsSubmitted(true);
    } else {
      navigate("/profile");
    }
  }

  async function login() {
    resetErrors();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        setEmailError("Invalid email or password");
        setPasswordError("Invalid email or password");
      } else {
        setPasswordError(error.message);
      }
      return;
    }

    navigate("/profile");
  }

  async function handleForgotPassword(e) {
    e?.preventDefault();
    resetErrors();

    if (!email) {
      setEmailError("Please enter your email address");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setEmailError(error.message);
    } else {
      alert("Password reset link sent to your email!");
      setAuthMode("login");
    }
  }

  async function resendVerificationEmail() {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/profile`,
      },
    });

    setResending(false);
    if (error) {
      alert(error.message);
    } else {
      alert("Verification link resent successfully!");
    }
  }

  async function googleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    });
  }

  return (
    <main
      className="flex justify-center items-center min-h-dvh w-full text-black manrope bg-cover bg-center bg-no-repeat p-4 md:p-0"
      style={{ backgroundImage: `url("${bg}")` }}
    >
      {/* Outer White Card */}
      <section className="bg-white min-h-[600px] w-[330px] md:w-[890px] md:h-[600px] rounded-[30px] md:rounded-[40px] flex flex-col md:flex-row justify-between items-center p-[12px] md:p-[15px] gap-3 md:gap-0">
        
        {/* Mobile Top Branding / Desktop Left Side Branding */}
        <div className="w-full md:flex-1 h-auto md:h-full flex flex-col justify-between p-2 md:p-8">
          <div>
            <img src={Logo} alt="Manascience" className="h-6 md:h-auto" />
          </div>
          <div className="hidden md:flex flex-col gap-[20px]">
            <p className="text-[15px] text-[#68270B] font-normal">
              Begin your journey
            </p>
            <h1 className="text-[24px] font-medium text-[#68270B] tracking-[-2%]">
              Discover your brain. <br />
              Unlock your potential.
            </h1>
          </div>
        </div>

        {/* Right Side Inner Beige Card */}
        <div className="w-full md:w-[500px] h-[440px] md:h-[570px] bg-[#FAF4E8] rounded-[30px] md:rounded-[40px] p-5 md:p-10 flex flex-col justify-between">
          {isSubmitted ? (
            /* VERIFY EMAIL VIEW */
            <div className="flex flex-col justify-between h-full">
              <div className="flex flex-col gap-[12px] md:gap-[20px]">
                <h1 className="text-[20px] md:text-[28px] font-semibold md:font-medium text-[#68270B]">
                  Verify your Email
                </h1>
                <p className="text-[13px] md:text-[16px] font-normal text-[#68270B] leading-relaxed">
                  A verification email has been sent to{" "}
                  <span className="font-semibold">{maskEmail(email)}</span>.
                  Click the link to activate your account.
                </p>
                <p className="text-[12px] md:text-[14px] font-normal text-[#68270B]">
                  Not the Correct Email?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubmitted(false);
                      resetErrors();
                    }}
                    className="underline cursor-pointer font-medium"
                  >
                    Change Email address
                  </button>
                </p>
              </div>

              <div className="flex flex-col gap-[10px] mt-auto">
                <p className="text-[12px] md:text-[14px] font-normal text-[#68270B]">
                  Didn't receive the email?{" "}
                  <button
                    type="button"
                    onClick={resendVerificationEmail}
                    disabled={resending}
                    className="underline cursor-pointer font-medium"
                  >
                    {resending ? "Sending..." : "Resend Email"}
                  </button>
                </p>

                <button
                  onClick={resendVerificationEmail}
                  disabled={resending}
                  className="w-full h-[50px] md:h-[70px] bg-[#B77145] text-white font-medium rounded-[24px] md:rounded-[34px] text-[15px] md:text-[16px]"
                >
                  {resending ? "Resending..." : "Resend Email"}
                </button>
              </div>
            </div>
          ) : authMode === "forgot" ? (
            /* FORGOT PASSWORD VIEW (Matches Figma) */
            <div className="flex flex-col justify-between h-full">
              <div className="flex flex-col gap-[6px] md:gap-[8px]">
                <h1 className="text-[18px] md:text-[28px] font-semibold md:font-medium text-[#68270B]">
                  Forgot password?
                </h1>
                <p className="text-[13px] md:text-[16px] font-normal text-[#68270B] leading-snug">
                  Don't worry! It happens. Please enter the email associated with your account.
                </p>
              </div>

              {/* Email Input */}
              <div>
                <div>
                  <label className="block text-[14px] md:text-[16px] font-normal text-[#68270B] poppin mb-1">
                    Email address
                  </label>
                  <input
                    type="email"
                    className={`w-full poppin h-[50px] md:h-[60px] bg-white rounded-[24px] md:rounded-[34px] px-4 py-3 text-sm focus:outline-none transition-all ${
                      emailError
                        ? "border border-[#ED0000]"
                        : "border border-transparent"
                    }`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                    }}
                  />
                 
                </div>
              </div>

              {/* Action Section */}
              <div className="flex flex-col gap-[10px]">
                <p className="text-[13px] font-normal text-[#68270B]">
                  Remember password?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      resetErrors();
                    }}
                    className="underline cursor-pointer font-medium"
                  >
                    Log in
                  </button>
                </p>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="w-full h-[50px] md:h-[70px] bg-[#B77145] text-white font-medium rounded-[24px] md:rounded-[34px] text-[16px]"
                >
                  Send Code
                </button>
              </div>
            </div>
          ) : (
            /* REGULAR LOGIN / SIGNUP VIEW */
            <div className="flex flex-col gap-[15px] md:gap-[20px] h-full justify-between">
              <div className="flex flex-col gap-[6px] md:gap-[8px]">
                <h1 className="text-[18px] md:text-[28px] font-semibold md:font-medium text-[#68270B]">
                  {authMode === "login" ? "Welcome Back!" : "Create Account"}
                </h1>
                <p className="text-[14px] md:text-[16px] font-normal text-[#68270B]">
                  {authMode === "login" ? "Need an account. " : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === "login" ? "signup" : "login");
                      resetErrors();
                    }}
                    className="text-[14px] md:text-[16px] font-normal text-[#68270B] underline cursor-pointer"
                  >
                    {authMode === "login" ? "Sign up" : "Login"}
                  </button>
                </p>
              </div>

              {/* Form Fields */}
              <div className="space-y-3 md:space-y-4">
                <div className="flex flex-col gap-[12px] md:gap-[15px]">
                  {authMode === "signup" && (
                    <div>
                      <label className="block text-[14px] md:text-[16px] font-normal text-[#68270B] poppin mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        className="poppin w-full h-[50px] md:h-[60px] bg-white border border-transparent rounded-[24px] md:rounded-[34px] px-4 py-3 text-sm focus:outline-none"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Email Field */}
                  <div>
                    <label className="block text-[14px] md:text-[16px] font-normal text-[#68270B] poppin mb-1">
                      Email address
                    </label>
                    <input
                      type="email"
                      className={`w-full poppin h-[50px] md:h-[60px] bg-white rounded-[24px] md:rounded-[34px] px-4 py-3 text-sm focus:outline-none transition-all ${
                        emailError
                          ? "border border-[#ED0000]"
                          : "border border-transparent"
                      }`}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError("");
                      }}
                    />
                    
                  </div>

                  {/* Password Field */}
                  <div>
                    <div className="flex justify-between items-center pb-[4px]">
                      <label className="block text-[14px] md:text-[16px] font-normal text-[#68270B] poppin">
                        Password
                      </label>
                      <div
                        className="flex justify-center items-center gap-[5px] cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <img src={hide} alt="hide" />
                        <p className="hidden md:block text-[14px] md:text-[16px] font-normal text-[#68270B]">
                          {showPassword ? "Hide" : "Show"}
                        </p>
                      </div>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`poppin w-full h-[50px] md:h-[60px] bg-white rounded-[24px] md:rounded-[34px] px-4 py-3 text-sm focus:outline-none transition-all ${
                        passwordError
                          ? "border border-[#ED0000]"
                          : "border border-transparent"
                      }`}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError("");
                      }}
                    />
                    {passwordError ? (
                      <p className="text-[14px] font-normal text-[#ED0000] mt-[4px]">
                        {passwordError}
                      </p>
                    ) : authMode === "login" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("forgot");
                          resetErrors();
                        }}
                        className="text-[14px] font-normal text-[#68270B] mt-[4px] cursor-pointer hover:underline block text-left"
                      >
                        Forget Password
                      </button>
                    ) : (
                      <p className="text-[14px] font-normal text-[#68270B] mt-[4px]">
                        Minimum length is 8 characters
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-[7px]">
                <button
                  onClick={authMode === "login" ? login : signup}
                  className="w-full h-[50px] md:h-[70px] bg-[#B77145] text-white font-medium rounded-[24px] md:rounded-[34px] text-[16px]"
                >
                  {authMode === "login" ? "Login" : "Save & Continue"}
                </button>
                {authMode === "login" ? (
                  <>
                    <img src={or} alt="OR" className="my-1" />
                    <button
                      onClick={googleLogin}
                      className="w-full h-[50px] md:h-[70px] font-medium text-[16px] md:text-[18px] bg-white text-[#232323] rounded-[24px] md:rounded-[34px] flex justify-center items-center gap-[10px]"
                    >
                      <p>Continue with Google</p>
                      <img
                        src={google}
                        alt="google"
                        className="w-[20px] md:w-[24px] h-[20px] md:h-[24px]"
                      />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Branding Section */}
        <div className="w-full flex md:hidden flex-col gap-[2px] px-3 pb-2 self-start">
          <p className="text-[12px] text-[#68270B] font-normal">
            Begin your journey
          </p>
          <h1 className="text-[15px] font-medium text-[#68270B] leading-snug">
            Discover your brain. <br />
            Unlock your potential.
          </h1>
        </div>
      </section>
    </main>
  );
}