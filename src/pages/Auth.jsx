// import { useState } from "react";
// import { supabase } from "../supabase";
// import { useNavigate } from "react-router-dom";
// import bg from "../assets/Ai/bg.svg";

// export default function Auth() {
//   const navigate = useNavigate();
//   const [isLogin, setIsLogin] = useState(true);
//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   async function signup() {
//     const { error } = await supabase.auth.signUp({
//       email,
//       password,
//       options: {
//         data: { name },
//       },
//     });

//     if (error) {
//       alert(error.message);
//       return;
//     }

//     navigate("/profile");
//   }

//   async function login() {
//     const { error } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     if (error) {
//       alert(error.message);
//       return;
//     }

//     navigate("/profile");
//   }

//   async function googleLogin() {
//     await supabase.auth.signInWithOAuth({
//       provider: "google",
//       options: {
//         redirectTo: `${window.location.origin}/profile`,
//       },
//     });
//   }

//   // https://manascience.webflow.io/profile  -> for URL configuration

//   return (
//     <main
//       className="flex justify-center items-center h-dvh w-full text-white manrope bg-cover bg-center bg-no-repeat "
//       style={{ backgroundImage: `url("${bg}")` }}
//     >
//       <section className="bg-white h-[600px] w-[890px] rounded-[40px] flex  py-[15px] px-[10px] flex items-center">
//         <div className=" h-full">

//         </div>

//         <div className="w-[500px] bg-[#FAF4E8] h-full rounded-[40px]">
//           <h1 className="text-2xl font-bold text-center">
//             {isLogin ? "Login to Your Account" : "Create a New Account"}
//           </h1>
//           {!isLogin && (
//             <input
//               placeholder="Name"
//               className="w-full border rounded-lg p-3"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//             />
//           )}

//           <input
//             placeholder="Email"
//             className="w-full border rounded-lg p-3"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//           />

//           <input
//             type="password"
//             placeholder="Password"
//             className="w-full border rounded-lg p-3"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//           />

//           <button
//             onClick={isLogin ? login : signup}
//             className="w-full bg-black text-white py-3 rounded-lg"
//           >
//             {isLogin ? "Login" : "Create Account"}
//           </button>

//           <button
//             onClick={googleLogin}
//             className="w-full bg-blue-600 text-white py-3 rounded-lg"
//           >
//             Continue with Google
//           </button>

//           <button
//             onClick={() => setIsLogin(!isLogin)}
//             className="text-sm text-blue-600"
//           >
//             {isLogin
//               ? "Need an account? Sign up"
//               : "Already have an account? Login"}
//           </button>
//         </div>
//       </section>
//     </main>
//   );
// }

// import { useState } from "react";
// import { supabase } from "../supabase";
// import { useNavigate } from "react-router-dom";
// import bg from "../assets/Ai/bg.svg";
// import Logo from "../assets/Ai/LogoBrown.svg";
// import google from "../assets/form/google.svg";
// import hide from "../assets/form/hide.svg";
// import or from "../assets/form/or.svg";

// export default function Auth() {
//   const navigate = useNavigate();
//   const [isLogin, setIsLogin] = useState(true);
//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);

//   async function signup() {
//     const { error } = await supabase.auth.signUp({
//       email,
//       password,
//       options: {
//         data: { name },
//       },
//     });

//     if (error) {
//       alert(error.message);
//       return;
//     }

//     navigate("/profile");
//   }

//   async function login() {
//     const { error } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     if (error) {
//       alert(error.message);
//       return;
//     }

//     navigate("/profile");
//   }

//   async function googleLogin() {
//     await supabase.auth.signInWithOAuth({
//       provider: "google",
//       options: {
//         redirectTo: `${window.location.origin}/profile`,
//       },
//     });
//   }

//   return (
//     <main
//       className="flex justify-center items-center h-dvh w-full text-black manrope bg-cover bg-center bg-no-repeat"
//       style={{ backgroundImage: `url("${bg}")` }}
//     >

//       {/* Outer Card */}
//       <section className="bg-white h-[600px] w-[890px] rounded-[40px] flex justify-between items-center p-[15px]">
//         {/* Left Side Branding Section */}
//         <div className="flex-1 h-full flex flex-col justify-between p-8">
//           <div>
//             <img src={Logo} alt="Manascience" />
//           </div>
//           <div className="flex flex-col gap-[20px]">
//             <p className="text-[15px] text-[#68270B] font-normal">
//               Begin your journey
//             </p>
//             <h1 className="text-[24px] font-medium text-[#68270B] tracking-[-2%]">
//               Discover your brain. <br />
//               Unlock your potential.
//             </h1>
//           </div>
//         </div>

//         {/* Right Side Form Card*/}
//         <div className="w-[500px] h-[570px] bg-[#FAF4E8] rounded-[40px] p-10 flex flex-col gap-[20px]">

//           <div className="flex flex-col gap-[8px]">
//             <h1 className="text-[28px] font-medium text-[#68270B]">
//               {isLogin ? "Welcome Back!" : "Create Account"}
//             </h1>
//             <p className="text-[16px] font-normal  text-[#68270B]">
//               {isLogin ? "Need an account. " : "Already have an account? "}
//               <button
//                 type="button"
//                 onClick={() => setIsLogin(!isLogin)}
//                 className="text-[16px] font-normal  text-[#68270B] underline cursor-pointer"
//               >
//                 {isLogin ? "Sign up" : "Login"}
//               </button>
//             </p>
//           </div>

//           {/* Form Fields */}
//           <div className="space-y-4">
//             <div className="flex flex-col gap-[15px]">
//               {!isLogin && (
//                 <div>
//                   <label className="block text-[16px] font-normal text-[#68270B] poppin">
//                     Name
//                   </label>
//                   <input
//                     type="text"
//                     className="w-full h-[60px] bg-white border-none rounded-2xl px-4 py-3 text-sm focus:outline-none rounded-[34px]"
//                     value={name}
//                     onChange={(e) => setName(e.target.value)}
//                   />
//                 </div>
//               )}

//               <div>
//                 <input
//                   type="email"
//                   placeholder="Email address"
//                   className="w-full poppin h-[60px] placeholder:text-[#68270B] bg-white border-none rounded-2xl px-4 py-3 text-sm focus:outline-none rounded-[34px]"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                 />
//               </div>

//               <div>
//                 <div className="flex justify-between items-center pb-[4px]">
//                   <label className="block text-[16px] font-normal text-[#68270B] poppin">
//                     Password
//                   </label>
//                   <div className="flex justify-center items-center gap-[5px] cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
//                     <img src={hide} alt="hide" />
//                   <p className="text-[16px] font-normal text-[#68270B]/60">Hide</p>
//                   </div>
//                 </div>
//                 <input
//                   type={showPassword ? "text" : "password"}
//                   className="w-full h-[60px] bg-white border-none rounded-2xl px-4 py-3 text-sm focus:outline-none  rounded-[34px]"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                 />
//                 <p className="text-[14px] font-normal text-[#68270B]/60 mt-[4px]">
//                   {isLogin
//                     ? "Forget Password"
//                     : "Minimum length is 8 characters "}
//                 </p>
//               </div>
//             </div>
//           </div>
//           {/* Action Buttons */}
//           <div className="flex flex-col gap-[7px]">
//             <button
//               onClick={isLogin ? login : signup}
//               className="w-full h-[70px] bg-[#BA5023] text-white font-medium  rounded-[34px]  text-[16px]"
//             >
//               {isLogin ? "Login" : "Save & Continue"}
//             </button>
//            {isLogin ? (
//             <>
//              <img src={or} alt="OR" />
//             <button
//               onClick={googleLogin}
//               className="w-full h-[70px] font-medium  text-[18px] bg-white text-[#232323] rounded-[34px]  text-[18px] flex justify-center items-center gap-[10px]"
//             >
//               <p>Continue with Google</p>
//               <img src={google} alt="google" className="w-[24px] h-[24px]" />
//             </button>
//             </>

//            ) : (
//             <>

//             </>
//            )}
//           </div>
//         </div>
//       </section>
//     </main>
//   );
// }

import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import bg from "../assets/Ai/bg.svg";
import Logo from "../assets/Ai/LogoBrown.svg";
import google from "../assets/form/google.svg";
import hide from "../assets/form/hide.svg";
import or from "../assets/form/or.svg";

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function signup() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      alert(error.message);
      return;
    }

    navigate("/profile");
  }

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    navigate("/profile");
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
      {/* Outer Card */}
      <section className="bg-white min-h-[600px] w-[330px] md:w-[890px] md:h-[600px] rounded-[30px] md:rounded-[40px] flex flex-col md:flex-row justify-between items-center p-[10px] md:p-[15px]">
        {/* Mobile Top Branding / Desktop Left Side Branding */}
        <div className="w-full md:flex-1 h-auto md:h-full flex flex-col justify-between p-4 md:p-8">
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

        {/* Right Side Form Card */}
        <div className="w-full md:w-[500px] min-h-[500px] md:h-[570px] bg-[#FAF4E8] rounded-[24px] md:rounded-[40px] p-5 md:p-10 flex flex-col gap-[15px] md:gap-[20px]">
          <div className="flex flex-col gap-[6px] md:gap-[8px]">
            <h1 className="text-[18px] md:text-[28px] font-semibold md:font-medium text-[#68270B]">
              {isLogin ? "Welcome Back!" : "Create Account"}
            </h1>
            <p className="text-[14px] md:text-[16px] font-normal text-[#68270B]">
              {isLogin ? "Need an account. " : "Already have an account? "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-[14px] md:text-[16px] font-normal text-[#68270B] underline cursor-pointer"
              >
                {isLogin ? "Sign up" : "Login"}
              </button>
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex flex-col gap-[12px] md:gap-[15px]">
              {!isLogin && (
                <div>
                  <label className="block text-[14px] md:text-[16px] font-normal text-[#68270B] poppin mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full h-[50px] md:h-[60px] bg-white border-none rounded-[24px] md:rounded-[34px] px-4 py-3 text-sm focus:outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-[14px] md:text-[16px] font-normal text-[#68270B] poppin">
                  Email address
                </label>
                <input
                  type="email"
                  className="w-full poppin h-[50px] md:h-[60px] bg-white border-none rounded-[24px] md:rounded-[34px] px-4 py-3 text-sm focus:outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

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
                    <p className="text-[14px] md:text-[16px] font-normal text-[#68270B]/60">
                      Hide
                    </p>
                  </div>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full h-[50px] md:h-[60px] bg-white border-none rounded-[24px] md:rounded-[34px] px-4 py-3 text-sm focus:outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-[14px] font-normal text-[#68270B]/60 mt-[4px]">
                  {isLogin
                    ? "Forget Password"
                    : "Minimum length is 8 characters "}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-[7px]">
            <button
              onClick={isLogin ? login : signup}
              className="w-full h-[55px] md:h-[70px] bg-[#BA5023] text-white font-medium rounded-[24px] rounded-[24px] md:rounded-[34px] text-[16px]"
            >
              {isLogin ? "Login" : "Save & Continue"}
            </button>
            {isLogin ? (
              <>
                <img src={or} alt="OR" className="my-1" />
                <button
                  onClick={googleLogin}
                  className="w-full h-[55px] md:h-[70px] font-medium text-[16px] md:text-[18px] bg-white text-[#232323] rounded-[24px] md:rounded-[34px] flex justify-center items-center gap-[10px]"
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

          {/* Mobile Bottom Branding Section */}
          <div className="flex md:hidden flex-col gap-[6px] mt-2">
            <p className="text-[12px] text-[#68270B] font-normal">
              Begin your journey
            </p>
            <h1 className="text-[16px] font-medium text-[#68270B] leading-snug">
              Discover your brain. <br />
              Unlock your potential.
            </h1>
          </div>
        </div>
      </section>
    </main>
  );
}
