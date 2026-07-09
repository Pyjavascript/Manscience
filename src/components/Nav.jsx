import React from "react";
import logo from "../assets/logo-white.png";
const Nav = () => {
  return (
    <section className="px-5">
      <nav className="w-full bg-[#B05A36] flex justify-between items-center p-1.25 md:p-3 lg:p-3.75 rounded-full lg:gap-57.5">
        <div className="h-8.75">
          <img src={logo} alt="logo" className="h-full text-white" />
        </div>

        <div className="flex justify-center items-center gap-15 md:gap-10">
          <div className="hidden md:flex lg:flex md:gap-7 lg:gap-15 text-white lg:text-[15px] md:text-[12px] font-semibold">
            <p>About Us</p>
            <p>Neuroplasticity</p>
            <p>Therapy Library</p>
            <p>Contact Us</p>
          </div>

          <div className="flex justify-center items-center gap-2">
            <div className="hidden bg-white p-2.5 text-[29px] rounded-full md:w-10 lg:w-12.5 md:h-10 lg:h-12.5 md:flex md:text-[20px] md:p-2.5 lg:flex justify-center items-center text-[#B05A36]">
              <ion-icon name="search-outline"></ion-icon>
            </div>

            <div className="hidden md:flex lg:text-[18px] md:text-[12px] bg-white text-[#B05A36] lg:h-12.5 md:h-10 md:w-25 lg:flex justify-center items-center md:px-0 rounded-4xl lg:w-37.5">
              <p>Get Started</p>
            </div>

            <div className="bg-white p-2.5 text-[29px] rounded-full h-10 w-10 lg:w-12.5 lg:h-12.5 flex justify-center items-center text-[#B05A36]">
              <ion-icon name="menu-outline"></ion-icon>
            </div>
          </div>
        </div>
      </nav>
    </section>
  );
};

export default Nav;
