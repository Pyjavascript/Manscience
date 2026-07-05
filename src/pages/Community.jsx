import React, { useState, useEffect } from "react";
import logo from "../assets/logo-white.png";
import toggle from "../assets/toggle.svg";
import grid from "../assets/grid.svg";
import { supabase } from "../supabase";
const Community = () => {
  const [enabled, setEnabled] = useState(false);
  // --- State Functions for the Carousel Modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const [tagsList, setTagsList] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState(null);

  // Static Mock Data for the Card Elements
  const deckData = [
    {
      id: 1,
      tag: "Arrowsmith Program",
      title: "Improved reading skills in 8 months",
      desc: '"For the first time, my son wanted to read on his own. After years of struggling with books and avoiding reading, he began picking them up voluntarily. Watching him read with confidence and curiosity was a milestone our family never expected...After years of struggling with books and avoiding reading, he began picking them up voluntarily. Watching him read with confidence and curiosity was a milestone our family never expected...After years of struggling with books and avoiding reading, he began picking them up voluntarily. Watching him read with confidence and curiosity was a milestone our family never expected... as a milestone our family never expected...as a milestone our family never expected..."',
      author: "Sarah M.",
      time: "2 mo. ago",
      bgClass: "bg-[#f0eae1] text-[#4a3e3d]",
      tagClass: "border-[#b05a36] text-[#b05a36]",
      titleClass: "text-[#b05a36]",
      descClass: "text-[#5c5251]",
    },
    {
      id: 2,
      tag: "Language Mastery",
      title: "Building Confidence Daily",
      desc: '"Watching him read with confidence and curiosity was a milestone our family never expected. The layout process completely transformed his mindset."',
      author: "David K.",
      time: "1 mo. ago",
      bgClass: "bg-[#fcf9f5] text-[#4a3e3d]",
      tagClass: "border-[#b05a36] text-[#b05a36]",
      titleClass: "text-[#b05a36]",
      descClass: "text-[#5c5251]",
    },
    {
      id: 3,
      tag: "Cognitive Growth",
      title: "A Whole New Horizon",
      desc: '"The program targets root difficulties rather than teaching workarounds. We\'ve seen incredible structural progression over a short time."',
      author: "Elena R.",
      time: "3 wk. ago",
      bgClass: "bg-[#b05a36] text-white",
      tagClass: "border-white text-white",
      titleClass: "text-white",
      descClass: "text-[#f7f3f0]",
    },
    {
      id: 4,
      tag: "Arrowsmith Program",
      title: "Improved reading skills in 8 months",
      desc: '"For the first time, my son wanted to read on his own. After years of struggling with books and avoiding reading, he began picking them up voluntarily. Watching him read with confidence and curiosity was a milestone our family never expected...After years of struggling with books and avoiding reading, he began picking them up voluntarily. Watching him read with confidence and curiosity was a milestone our family never expected...After years of struggling with books and avoiding reading, he began picking them up voluntarily. Watching him read with confidence and curiosity was a milestone our family never expected... as a milestone our family never expected...as a milestone our family never expected..."',
      author: "Sarah M.",
      time: "2 mo. ago",
      bgClass: "bg-[#f0eae1] text-[#4a3e3d]",
      tagClass: "border-[#b05a36] text-[#b05a36]",
      titleClass: "text-[#b05a36]",
      descClass: "text-[#5c5251]",
    },
    {
      id: 5,
      tag: "Language Mastery",
      title: "Building Confidence Daily",
      desc: '"Watching him read with confidence and curiosity was a milestone our family never expected. The layout process completely transformed his mindset."',
      author: "David K.",
      time: "1 mo. ago",
      bgClass: "bg-[#fcf9f5] text-[#4a3e3d]",
      tagClass: "border-[#b05a36] text-[#b05a36]",
      titleClass: "text-[#b05a36]",
      descClass: "text-[#5c5251]",
    },
    {
      id: 6,
      tag: "Cognitive Growth",
      title: "A Whole New Horizon",
      desc: '"The program targets root difficulties rather than teaching workarounds. We\'ve seen incredible structural progression over a short time."',
      author: "Elena R.",
      time: "3 wk. ago",
      bgClass: "bg-[#b05a36] text-white",
      tagClass: "border-white text-white",
      titleClass: "text-white",
      descClass: "text-[#f7f3f0]",
    },
    {
      id: 7,
      tag: "Cognitive Growth",
      title: "A Whole New Horizon",
      desc: '"The program targets root difficulties rather than teaching workarounds. We\'ve seen incredible structural progression over a short time."',
      author: "Elena R.",
      time: "3 wk. ago",
      bgClass: "bg-[#b05a36] text-white",
      tagClass: "border-white text-white",
      titleClass: "text-white",
      descClass: "text-[#f7f3f0]",
    },
    {
      id: 8,
      tag: "Cognitive Growth",
      title: "A Whole New Horizon",
      desc: '"The program targets root difficulties rather than teaching workarounds. We\'ve seen incredible structural progression over a short time."',
      author: "Elena R.",
      time: "3 wk. ago",
      bgClass: "bg-[#b05a36] text-white",
      tagClass: "border-white text-white",
      titleClass: "text-white",
      descClass: "text-[#f7f3f0]",
    },
  ];

  const [communityPosts, setCommunityPosts] = useState([]);

  useEffect(() => {
    fetchCommunityData();
  }, []);

  async function fetchCommunityData() {
    try {
      const { data, error } = await supabase
        .from("community_hub")
        .select(
          `
          *,
          community_tags ( name )
        `,
        )
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCommunityPosts(data || []);
    } catch (err) {
      console.error("Error reading community content:", err.message);
    }
  }

  const handleNext = (e) => {
    e.stopPropagation();
    if (isSwiping) return;
    setIsSwiping(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % deckData.length);
      setIsSwiping(false);
    }, 300);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + deckData.length) % deckData.length);
  };

  const getCardPlacementClass = (idx) => {
    if (idx === currentIndex)
      return "opacity-100 z-30 scale-100 translate-y-0 rotate-0 pointer-events-auto";
    if (idx === (currentIndex + 1) % deckData.length)
      return "opacity-95 z-20 scale-96 -translate-y-[20px] md:-translate-y-[25px] -rotate-3 pointer-events-none";
    if (idx === (currentIndex + 2) % deckData.length)
      return "opacity-90 z-10 scale-92 -translate-y-[35px] md:-translate-y-[45px] rotate-3 pointer-events-none";
    return "opacity-0 scale-80 pointer-events-none";
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  async function fetchFilters() {
    try {
      const { data, error } = await supabase
        .from("community_tags")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setTagsList(data || []);
    } catch (err) {
      console.error("Failed fetching layout filters:", err.message);
    }
  }

  const testimonials = communityPosts.filter((post) => {
    const isApproved = post.status === "approved";

    const isTestimonial =
      post.community_tags?.name?.toLowerCase() === "testimonials";

    const matchesSelectedTag = !selectedTagId || post.tag_id === selectedTagId;

    return isApproved && isTestimonial && matchesSelectedTag;
  });
  return (
    <main className="lg:p-10 py-7.5 manrope">
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

      <section
        className={`text-center text-[#B05A36] lg:pt-17.5 pt-12.5 px-5 ${isModalOpen ? "hidden md:hidden lg:hidden" : "block md:block lg:block"}`}
      >
        <div className="lg:px-80">
          <h1 className="font-normal lg:text-[60px] text-[32px]">
            Stories from our community
          </h1>
        </div>

        <div className="lg:px-107.5">
          <p className="text-[16px] lg:text-[24px] font-normal">
            Real experiences from families, practitioners, and individuals
            across 20+ countries.
          </p>
        </div>
      </section>

      <section className="flex justify-between items-center mt-11.25 px-3.75 relative">
        {/* Left Side: Filter Toggler Button */}
        <div
          onClick={() => setShowFilters(!showFilters)}
          className="flex gap-5 cursor-pointer select-none group active:scale-95 transition-transform shrink-0"
        >
          {/* Circle Icon - Stays exactly your style, just changes icon when open */}
          <div className="bg-[#B05A36] text-white text-[24px] h-12.5 w-12.5 flex justify-center items-center rounded-full">
            <ion-icon
              name={showFilters ? "close-outline" : "add-outline"}
            ></ion-icon>
          </div>

          {/* Text and Arrow/Plus - Stays exactly your style, updates icon when open */}
          <div className="hidden lg:flex justify-center items-center text-[#B05A36] text-[24px] font-no gap-1">
            <p>Filter</p>
            <div className="h-full flex justify-center items-center">
              <ion-icon
                name={showFilters ? "chevron-up-outline" : "add-outline"}
              ></ion-icon>
            </div>
          </div>
        </div>

        {/* Right Side: Dynamic Supabase Filters & Your Toggle Switch */}
        <div className="flex items-center justify-end gap-5 flex-1 min-w-0">
          {showFilters && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 pl-4 pr-1">
              <button
                onClick={() => setSelectedTagId(null)}
                className={`px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition duration-150 ${
                  !selectedTagId
                    ? "bg-[#B05A36] text-white shadow-sm"
                    : "border border-[#B05A36] text-[#B05A36] hover:bg-[#FAF4E8]"
                }`}
              >
                All
              </button>
              {tagsList.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTagId(tag.id)}
                  className={`px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition duration-150 ${
                    selectedTagId === tag.id
                      ? "bg-[#B05A36] text-white shadow-sm"
                      : "border border-[#B05A36] text-[#B05A36] hover:bg-[#FAF4E8]"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          {/* Layout Toggle Switch - Kept exactly your style */}
          <div className="shrink-0">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => setEnabled(!enabled)}
                className="sr-only peer"
              />

              <div className="relative w-21.25 h-12.5 bg-[#B05A36] rounded-full transition-colors duration-200 ease-in-out">
                <span
                  className={`absolute top-[6.5px] w-9.25 h-9.25 bg-[#FAF4E8] rounded-full flex justify-center items-center transition-transform duration-200 ease-in-out ${
                    enabled ? "translate-x-10.5" : "translate-x-1.75"
                  }`}
                >
                  <div className="h-full w-full flex justify-center items-center rounded-full">
                    <img
                      src={enabled ? grid : toggle}
                      alt="toggle"
                      className="ml-px"
                    />
                  </div>
                </span>
              </div>
            </label>
          </div>
        </div>
      </section>

      {/* Conditional Layout Injection Section */}
      {enabled ? (
        /* Grid Layout View Mode (Configured to 4 cards in a row on laptop/desktop viewports) */
        <section className="w-full mt-15 lg:mt-24 px-3.75 flex flex-col items-center">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 w-full max-w-350">
            {communityPosts
              .filter(
                (post) =>
                  post.status === "approved" &&
                  (!selectedTagId || post.tag_id === selectedTagId),
              )
              .map((post) => (
                <div
                  key={post.id}
                  className=" w-full max-w-83.75 h-52.5 sm:h-100 bg-[#FAF4E8] rounded-[20px] sm:rounded-4xl mx-auto transition-transform p-2.5 md:p-5 flex flex-col justify-between"
                >
                  <div className="flex flex-col gap-4 md:gap-15">
                    <div
                      className={`px-1.5 py-0.5 md:h-10 md:w-43.75 border rounded-[20px] text-[12px] font-normal md:text-[16px] flex justify-center items-center text-center text-[#B05A36] w-[90%]`}
                    >
                      <p>{post.community_tags?.name || "General"}</p>
                    </div>
                    <div className="text-[13px] md:text-[20px] text-[#B05A36] leading-[120%] ">
                      <p>{post.content}</p>
                    </div>
                  </div>
                  <div className="flex w-full justify-between">
                    <div>
                      <h2 className="text-[12px] md:text-[15px]">
                        {post.username}
                      </h2>
                      <p className="text-[10px]">
                        {new Date(post.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="bg-[#B05A36] text-white text-[20px] md:text-[24px] h-7.5 w-7.5 md:h-12.5 md:w-12.5 flex justify-center items-center rounded-full">
                      <ion-icon name="add-outline"></ion-icon>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <button className="mt-12 bg-[#B05A36] text-white font-medium py-3 px-8 rounded-full text-[14px] sm:text-[16px]">
            View All
          </button>
        </section>
      ) : (
        /* Default Spinning Wheel Carousel View Mode */
        <section className="w-full min-h-125  lg:h-175 mt-15 lg:mt-32 flex justify-center items-center relative overflow-hidden lg:overflow-visible">
          <div className="absolute top-10 lg:top-1/2 -translate-y-1/2 z-10 text-[#B05A36] text-center pointer-events-none">
            <h1 className="text-[32px] lg:text-[45px]">MANASCIENCE</h1>
            <div className="max-w-70 sm:max-w-md lg:max-w-md">
              <p className="text-[12px]  lg:text-[18px] w-auto">
                Real experiences that reflect meaningful progress, support, &
                positive outcomes real experiences.
              </p>
            </div>
          </div>

          <div className="w-206.25 h-full flex justify-center items-center relative ">
            <div className="h-50 lg:h-140 w-50 lg:w-140 rounded-full relative animate-spin-smooth flex justify-center items-center  mt-10 md:mt-20">
              {/* Card 1 */}
              <div className="h-70 w-12.5 lg:h-210 lg:w-35 md:h-90 md:w-13 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center pointer-events-none">
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full h-15 lg:h-41.25  rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover ${isModalOpen ? "opacity-50" : "opacity-100"}`}
                  style={{
                    backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/f_auto,q_auto/01_ljve7j)`,
                    backgroundPosition: "center 0px",
                  }}
                ></div>
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full h-15 lg:h-41.25 bg-center bg-cover rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity ${isModalOpen ? "opacity-50" : "opacity-100"}`}
                  style={{ backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/v1783261178/02_m9nzpu.png)` }}
                ></div>
              </div>

              {/* Card 2 */}
              <div className="h-70 w-12.5 lg:h-210 lg:w-35 md:h-90 md:w-13  absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-36 pointer-events-none">
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full h-15 lg:h-41.25 bg-center bg-cover rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity ${isModalOpen ? "opacity-50" : "opacity-100"}`}
                  style={{ backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/v1783261273/04_nygx31.jpg)` }}
                ></div>
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full h-15 lg:h-41.25 bg-center bg-cover rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity ${isModalOpen ? "opacity-50" : "opacity-100"}`}
                  style={{ backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/v1783261273/03_ybwukf.png)` }}
                ></div>
              </div>

              {/* Card 3 */}
              <div className="h-70 w-12.5 lg:h-210 lg:w-35 md:h-90 md:w-13 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-72 pointer-events-none">
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full h-15 lg:h-41.25 bg-center bg-cover rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity ${isModalOpen ? "opacity-50" : "opacity-100"}`}
                  style={{ backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/v1783261274/09_jkepdg.png)` }}
                ></div>
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full h-15 lg:h-41.25 bg-center bg-cover rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity ${isModalOpen ? "opacity-50" : "opacity-100"}`}
                  style={{
                    backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/v1783261275/05_iizylf.png)`,
                    backgroundPosition: "center 0px",
                  }}
                ></div>
              </div>

              {/* Card 4 */}
              <div className="h-70 w-12.5 lg:h-210 lg:w-35 md:h-90 md:w-13 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-108 pointer-events-none">
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full h-15 lg:h-41.25 bg-center bg-cover rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity ${isModalOpen ? "opacity-50" : "opacity-100"}`}
                  style={{ backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/v1783261275/08_v1as17.png)` }}
                ></div>
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full h-15 lg:h-41.25 bg-center bg-cover rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity ${isModalOpen ? "opacity-50" : "opacity-100"}`}
                  style={{ backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/v1783261275/10_vcg7uz.png)` }}
                ></div>
              </div>

              {/* Card 5 */}
              <div className="h-70 w-12.5 lg:h-210 lg:w-35 md:h-90 md:w-13 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-144 pointer-events-none">
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full h-15 lg:h-41.25 bg-center bg-cover rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity ${isModalOpen ? "opacity-50" : "opacity-100"}`}
                  style={{
                    backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/v1783261277/07_shd07t.png)`,
                    backgroundPosition: "center 0px",
                  }}
                ></div>
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full h-15 lg:h-41.25 bg-center bg-cover rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity ${isModalOpen ? "opacity-50" : "opacity-100"}`}
                  style={{ backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/v1783261279/06_igpmof.png)` }}
                ></div>
              </div>
            </div>
          </div>

          {/* --- Responsive Context Modal Container --- */}
          {isModalOpen && (
            <div
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 -mx-5 w-[calc(100%+2.5rem)] lg:mx-0 lg:w-full h-full flex justify-center items-center z-50 overflow-visible transition-opacity duration-300"
            >
              <div className="relative w-full max-w-150 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-0 ">
                <div className="relative w-[320px] h-105 lg:w-122.5 lg:h-150 order-1">
                  {deckData.map((card, idx) => {
                    const isActive = idx === currentIndex;
                    return (
                      <div
                        key={card.id}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          transformOrigin: "bottom center",
                          transform:
                            isSwiping && isActive
                              ? "translateX(100%) scale(0.95) rotate(10deg)"
                              : undefined,
                          opacity: isSwiping && isActive ? 0.3 : undefined,
                          fontFamily: '"Manrope", sans-serif',
                        }}
                        className={`absolute w-full h-full rounded-[30px] lg:rounded-4xl p-6 lg:p-8.75 flex flex-col justify-between transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${card.bgClass} ${getCardPlacementClass(idx)}`}
                      >
                        <div className="overflow-y-auto max-h-[90%] pr-1 scrollbar-none">
                          <div
                            className={`h-7.5 w-40 border rounded-[20px] text-[12px] font-normal lg:text-[0.75rem] mb-3 lg:mb-5 ${card.tagClass} flex justify-center items-center text-center`}
                          >
                            <p>{card.tag}</p>
                          </div>
                          <h2
                            className={`text-[18px] lg:text-[32px] font-normal leading-tight mb-3 lg:mb-5 ${card.titleClass} w-full lg:w-2/3`}
                          >
                            {card.title}
                          </h2>
                          <p
                            className={`text-[13px] lg:text-[0.9rem] leading-relaxed lg:leading-[1.6] text-black font-normal ${card.descClass}`}
                          >
                            {card.desc}
                          </p>
                        </div>
                        <div className="mt-auto pt-2 flex justify-between items-center text-xs lg:text-[0.85rem] font-medium ">
                          <span>{card.author}</span>
                          <span>{card.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons Row Container */}
                <div className="flex items-center justify-center gap-2 order-2 md:absolute md:w-full md:justify-between md:px-0 pointer-events-none">
                  <button
                    onClick={handlePrev}
                    className="w-12 h-12 lg:w-12.5 lg:h-12.5 rounded-full bg-[#B05A36] hover:bg-[#9c6c4f] active:scale-95 text-white text-[22px] flex justify-center items-center shadow-md transition-transform duration-100 pointer-events-auto lg:-translate-x-5"
                  >
                    &#8249;
                  </button>
                  <button
                    onClick={handleNext}
                    className="w-12 h-12 lg:w-12.5 lg:h-12.5 rounded-full bg-[#b05a36] hover:bg-[#9c6c4f] active:scale-95 text-white text-[22px] flex justify-center items-center shadow-md transition-transform duration-100 pointer-events-auto lg:translate-x-5"
                  >
                    &#8250;
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
};

export default Community;
