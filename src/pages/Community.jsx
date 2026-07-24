import React, { useState, useEffect } from "react";
import logo from "../assets/logo-white.png";
import toggle from "../assets/toggle.svg";
import grid from "../assets/grid.svg";
import Nav from "../components/Nav";
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
      bgClass: "bg-[#fff] text-[#4a3e3d]",
      tagClass: "border-[#BA5023] text-[#BA5023] text-white",
      titleClass: "text-[#BA5023]",
      descClass: "text-[#5c5251]",
      authorClass: "text-[#5c5251]",
    },
    {
      id: 2,
      tag: "Language Mastery",
      title: "Building Confidence Daily",
      desc: '"Watching him read with confidence and curiosity was a milestone our family never expected. The layout process completely transformed his mindset."',
      author: "David K.",
      time: "1 mo. ago",
      bgClass: "bg-[#fcf9f5] text-[#4a3e3d]",
      tagClass: "border-[#BA5023] text-[#BA5023] text-white",
      titleClass: "text-[#BA5023]",
      descClass: "text-[#5c5251]",
    },
    {
      id: 3,
      tag: "Cognitive Growth",
      title: "A Whole New Horizon",
      desc: '"The program targets root difficulties rather than teaching workarounds. We\'ve seen incredible structural progression over a short time."',
      author: "Elena R.",
      time: "3 wk. ago",
      bgClass: "bg-[#BA5023] text-white",
      tagClass: "border-none bg-[#fff] text-[#BA5023]",
      authorClass: "text-[#5c5251]",
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
      tagClass: "border-[#BA5023] text-[#BA5023] text-white",
      titleClass: "text-[#BA5023]",
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
      tagClass: "border-[#BA5023] text-white",
      titleClass: "text-[#BA5023]",
      descClass: "text-[#5c5251]",
    },
    {
      id: 6,
      tag: "Cognitive Growth",
      title: "A Whole New Horizon",
      desc: '"The program targets root difficulties rather than teaching workarounds. We\'ve seen incredible structural progression over a short time."',
      author: "Elena R.",
      time: "3 wk. ago",
      bgClass: "bg-[#BA5023] text-white",
      tagClass: "border-none bg-[#fff] text-[#BA5023]",
      aurthorClass: "text-[#5c5251]",

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
      bgClass: "bg-[#BA5023] text-white",
      tagClass: "border-none bg-[#fff] text-[#BA5023]",
      authorClass: "text-[#5c5251]",
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
      bgClass: "bg-[#BA5023] text-white",
      tagClass: "border-none bg-[#fff] text-[#BA5023]",
      authorClass: "text-[#5c5251]",
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
      {/* <Nav /> */}
      <section
        className={`text-center text-[#BA5023] pt-8 md:pt-14 px-4 ${
          isModalOpen ? "hidden" : "block"
        }`}
      >
        {/* Title Block */}
        <div className="max-w-[255px] md:max-w-[430px] mx-auto">
          <h1 className="font-normal text-[34px] md:text-[54px] leading-[120%] md:leading-[110%] tracking-[-0.05em]">
            Stories from our community
          </h1>
        </div>

        {/* Subtitle Block */}
        <div className="max-w-[300px] md:max-w-[310px] mx-auto mt-2 md:mt-3">
          <p className="text-[14px] md:text-[15px] font-normal md:font-medium leading-[140%] tracking-normal md:tracking-[-0.02em]">
            Real experiences from families, practitioners, and individuals
            across 20+ countries.
          </p>
        </div>
      </section>

      <section className="flex flex-col mt-11.25 px-3.75 gap-6">
        {/* Top Controls Row */}
        <div className="flex justify-between items-center w-full">
          {/* Left Side: Filter / Close Button Toggle */}
          {showFilters ? (
            /* OPEN STATE: Light Pill Close Button (Matches Figma) */
            <button
              onClick={() => setShowFilters(false)}
              className="flex items-center gap-3 px-6 py-3 rounded-full bg-[#FAF4E8] text-[#BA5023] text-[20px] font-normal hover:bg-[#f3ebd9] transition duration-150 cursor-pointer select-none active:scale-95"
            >
              <ion-icon
                name="close-outline"
                style={{ fontSize: "20px" }}
              ></ion-icon>
              <span>Close</span>
            </button>
          ) : (
            /* CLOSED STATE: Circle + Icon + Filter Text */
            <div
              onClick={() => {
                setShowFilters(true);
                setEnabled(true);
              }}
              className="flex gap-4 items-center cursor-pointer select-none group active:scale-95 transition-transform shrink-0"
            >
              <div className="bg-[#BA5023] text-white text-[24px] h-12.5 w-12.5 flex justify-center items-center rounded-full">
                <ion-icon name="add-outline"></ion-icon>
              </div>
              <span className="text-[#BA5023] text-[24px] font-normal">
                Filter
              </span>
            </div>
          )}

          {/* Right Side: Layout Toggle Switch */}
          <div className="shrink-0">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => setEnabled(!enabled)}
                className="sr-only peer"
              />

              <div className="relative w-21.25 h-12.5 bg-[#BA5023] rounded-full transition-colors duration-200 ease-in-out">
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

        {/* Bottom Row: Filter Items List (Rendered below the top controls) */}
        {showFilters && (
          <div className="flex justify-start w-full animate-fadeIn">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1 px-2 max-w-full justify-start md:justify-center">
              {/* 'All' Tag */}
              <button
                onClick={() => setSelectedTagId(null)}
                className={`px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                  !selectedTagId
                    ? "bg-[#C85527] text-white shadow-sm"
                    : "bg-[#FAF4E8] text-[#C85527] hover:bg-[#f2e7d3]"
                }`}
              >
                All
              </button>

              {/* Dynamic Tag Items with Color Dots */}
              {tagsList.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTagId(tag.id)}
                  className={`px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150 flex items-center gap-2 ${
                    selectedTagId === tag.id
                      ? "bg-[#C85527] text-white shadow-sm"
                      : "bg-[#FAF4E8] text-[#C85527] hover:bg-[#f2e7d3]"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedTagId === tag.id ? "bg-white" : "bg-[#C85527]"
                    }`}
                  ></span>
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Conditional Layout Injection Section */}
      {enabled ? (
        /* Grid Layout View Mode (Configured to 4 cards in a row on laptop/desktop viewports) */
        <section className="w-full mt-25 lg:mt-24 px-3.75 flex flex-col items-center">
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
                      className={`px-1.5 py-0.5 md:h-10 md:w-43.75 border rounded-[20px] text-[12px] font-normal md:text-[16px] flex justify-center items-center text-center text-[#BA5023] w-[90%]`}
                    >
                      <p>{post.community_tags?.name || "General"}</p>
                    </div>
                    <div className="text-[13px] md:text-[20px] text-[#BA5023] leading-[120%] ">
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
                    <div className="bg-[#BA5023] text-white text-[20px] md:text-[24px] h-7.5 w-7.5 md:h-12.5 md:w-12.5 flex justify-center items-center rounded-full">
                      <ion-icon name="add-outline"></ion-icon>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <button
            className="mt-12 cursor-pointer bg-[#BA5023] text-white font-medium py-3 px-8 rounded-full text-[14px] sm:text-[16px]"
            onClick={() => setSelectedTagId(null)}
          >
            View All
          </button>
        </section>
      ) : (
        /* Default Spinning Wheel Carousel View Mode */
        <section className="w-full min-h-125 mt-25 lg:h-175 lg:mt-32 flex justify-center items-center relative overflow-hidden lg:overflow-visible">
          <div className="absolute top-10 lg:top-1/2 -translate-y-1/2 z-10 text-[#BA5023] text-center pointer-events-none">
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
                  style={{
                    backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/v1783261178/02_m9nzpu.png)`,
                  }}
                ></div>
              </div>

              {/* Card 2 */}
              <div className="h-70 w-12.5 lg:h-210 lg:w-35 md:h-90 md:w-13  absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-36 pointer-events-none">
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full h-15 lg:h-41.25 bg-center bg-cover rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity ${isModalOpen ? "opacity-50" : "opacity-100"}`}
                  style={{
                    backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/v1783261273/04_nygx31.jpg)`,
                  }}
                ></div>
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full h-15 lg:h-41.25 bg-center bg-cover rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity ${isModalOpen ? "opacity-50" : "opacity-100"}`}
                  style={{
                    backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/v1783261273/03_ybwukf.png)`,
                  }}
                ></div>
              </div>

              {/* Card 3 */}
              <div className="h-70 w-12.5 lg:h-210 lg:w-35 md:h-90 md:w-13 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-72 pointer-events-none">
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full h-15 lg:h-41.25 bg-center bg-cover rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity ${isModalOpen ? "opacity-50" : "opacity-100"}`}
                  style={{
                    backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/v1783261274/09_jkepdg.png)`,
                  }}
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
                  style={{
                    backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/v1783261275/08_v1as17.png)`,
                  }}
                ></div>
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full h-15 lg:h-41.25 bg-center bg-cover rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity ${isModalOpen ? "opacity-50" : "opacity-100"}`}
                  style={{
                    backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/v1783261275/10_vcg7uz.png)`,
                  }}
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
                  style={{
                    backgroundImage: `url(https://res.cloudinary.com/nscfi7sz/image/upload/v1783261279/06_igpmof.png)`,
                  }}
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
                            className={`h-[40px] w-40 border rounded-full text-[13px] font-normal lg:text-[13px] mb-3 lg:mb-5 ${card.tagClass} flex justify-center items-center text-center  bg-[#BA5023]`}
                          >
                            <p>{card.tag}</p>
                          </div>
                          <h2
                            className={`text-[18px] lg:text-[32px] font-normal leading-tight mb-3 lg:mb-5 ${card.titleClass} w-full lg:w-2/3`}
                          >
                            {card.title}
                          </h2>
                          <div className="mt-auto mb-[30px] pt-2 flex justify-between items-center text-xs lg:text-[0.85rem] font-medium text-[#68270B]">
                            <span>{card.author}</span>
                            <span>{card.time}</span>
                          </div>
                          <p
                            className={`text-[13px] lg:text-[0.9rem] leading-relaxed lg:leading-[1.6] text-[#68270B] font-normal ${card.descClass}`}
                          >
                            {card.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons Row Container */}
                <div className="flex items-center justify-center gap-2 order-2 md:absolute md:w-full md:justify-between md:px-0 pointer-events-none">
                  <button
                    onClick={handlePrev}
                    className="w-12 h-12 lg:w-12.5 lg:h-12.5 rounded-full bg-[#BA5023] hover:bg-[#9c6c4f] active:scale-95 text-white text-[22px] flex justify-center items-center shadow-md transition-transform duration-100 pointer-events-auto lg:-translate-x-5"
                  >
                    &#8249;
                  </button>
                  <button
                    onClick={handleNext}
                    className="w-12 h-12 lg:w-12.5 lg:h-12.5 rounded-full bg-[#BA5023] hover:bg-[#9c6c4f] active:scale-95 text-white text-[22px] flex justify-center items-center shadow-md transition-transform duration-100 pointer-events-auto lg:translate-x-5"
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
