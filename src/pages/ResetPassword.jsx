import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import bg from "../assets/Ai/bg.svg";
import Logo from "../assets/form/LogoBrown.svg";
import hide from "../assets/form/hide.svg";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Error States
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleResetPassword(e) {
    e.preventDefault();
    setPasswordError("");
    setConfirmError("");

    // 1. Validation checks
    if (password.length < 8) {
      setPasswordError("Minimum length is 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match");
      return;
    }

    setLoading(true);

    // 2. Call Supabase to update the password
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);

    if (error) {
      setPasswordError(error.message);
    } else {
      alert("Password updated successfully!");
      navigate("/profile"); // Redirect to profile or login
    }
  }

  return (
    <main
      className="flex justify-center items-center min-h-dvh w-full text-black manrope bg-cover bg-center bg-no-repeat p-4 md:p-0"
      style={{ backgroundImage: `url("${bg}")` }}
    >
      <section className="bg-white min-h-[600px] w-[330px] md:w-[890px] md:h-[600px] rounded-[30px] md:rounded-[40px] flex flex-col md:flex-row items-center p-[12px] md:p-[15px] gap-3 md:gap-0">
        {/* Branding Section */}
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

        {/* Reset Password Form Card */}
        <div className="w-full md:w-[500px] h-[440px] md:h-[570px] bg-[#FAF4E8] rounded-[30px] md:rounded-[40px] p-5 md:p-10 flex flex-col justify-between">
          <form
            onSubmit={handleResetPassword}
            className="flex flex-col  gap-[50px] md:gap-[50px] h-full"
          >
            <div className="flex flex-col gap-[40px]">
              {/* Heading */}
              <div className="flex flex-col gap-[6px]">
                <h1 className="text-[20px] md:text-[28px] font-semibold text-[#68270B]">
                  Reset password
                </h1>
                <p className="text-[14px] text-[#68270B]">
                  Please type something you'll remember
                </p>
              </div>

              {/* Form Fields */}
              <div className="flex flex-col gap-[15px] ">
                {/* New Password */}
                <div>
                  <div className="flex justify-between items-center pb-[4px]">
                    <label className="block text-[14px] font-normal text-[#68270B] poppin">
                      New Password
                    </label>
                    <button
                      type="button"
                      className="flex items-center gap-[5px] cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <img src={hide} alt="hide" />
                      <span className="hidden md:inline text-[14px] text-[#68270B]">
                        {showPassword ? "Hide" : "Show"}
                      </span>
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`w-full h-[50px] md:h-[60px] bg-white rounded-[24px] md:rounded-[34px] px-4 py-3 text-sm focus:outline-none transition-all ${
                      passwordError
                        ? "border border-[#ED0000]"
                        : "border border-transparent"
                    }`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p
                    className={`text-[13px] mt-1 ${passwordError ? "text-[#ED0000]" : "text-[#68270B]"}`}
                  >
                    {passwordError || "Minimum length is 8 characters"}
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="flex justify-between items-center pb-[4px]">
                    <label className="block text-[14px] font-normal text-[#68270B] poppin">
                      Confirm Password
                    </label>
                    <button
                      type="button"
                      className="flex items-center gap-[5px] cursor-pointer"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      <img src={hide} alt="hide" />
                      <span className="hidden md:inline text-[14px] text-[#68270B]">
                        {showConfirmPassword ? "Hide" : "Show"}
                      </span>
                    </button>
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={`w-full h-[50px] md:h-[60px] bg-white rounded-[24px] md:rounded-[34px] px-4 py-3 text-sm focus:outline-none transition-all ${
                      confirmError
                        ? "border border-[#ED0000]"
                        : "border border-transparent"
                    }`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {confirmError && (
                    <p className="text-[13px] text-[#ED0000] mt-1">
                      {confirmError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[50px] md:h-[70px] bg-[#B77145] text-white font-medium rounded-[24px] md:rounded-[34px] text-[16px]"
            >
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
