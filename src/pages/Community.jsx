
import React, { useState, useEffect, useRef } from "react";
import logo from "../assets/logo-white.png";
import toggle from "../assets/toggle.svg";
import grid from "../assets/community/grid.svg";
import plus from "../assets/plus.svg";
import plusBrown from "../assets/plusBrown.svg";
import playBtn from "../assets/community/playBTN.svg";

import Nav from "../components/Nav";
import { supabase } from "../supabase";

const Community = () => {
  const [enabled, setEnabled] = useState(false);
  // --- State Functions for the Carousel Modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);

  const [tagsList, setTagsList] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState(null);

  // --- NEW STATE: Tracks active video URL for popup modal ---
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);

  const [showAllGridCards, setShowAllGridCards] = useState(false);

  // Static Mock Data for the Card Elements
  const [deckData, setDeckData] = useState([
    {
      id: 1,
      tag: "Arrowsmith Program",
      title: "Improved reading skills in 8 months",
      desc: '"For the first time, my son wanted to read on his own. After years of struggling with books and avoiding reading, he began picking them up voluntarily. Watching him read with confidence and curiosity was a milestone our family never expected ..."',
      author: "Sarah M.",
      time: "2 mo. ago",
      bgClass: "bg-[#fff] text-[#4a3e3d]",
      tagClass: "border-[#B77145] text-[#B77145] text-white",
      titleClass: "text-[#B77145]",
      descClass: "text-[#68270b]",
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
      tagClass: "border-[#B77145] text-[#B77145] text-white",
      titleClass: "text-[#B77145]",
      descClass: "text-[#68270b]",
      authorClass: "text-[#5c5251]",
    },
    {
      id: 3,
      tag: "Cognitive Growth",
      title: "A Whole New Horizon",
      desc: '"The program targets root difficulties rather than teaching workarounds. We\'ve seen incredible structural progression over a short time."',
      author: "Elena R.",
      time: "3 wk. ago",
      bgClass: "bg-[#B77145] text-white",
      tagClass: "border-none bg-[#fff] text-[#B77145]",
      authorClass: "text-[#5c5251]",
      titleClass: "text-white",
      descClass: "text-[#f7f3f0]",
    },
    {
      id: 4,
      tag: "Arrowsmith Program",
      title: "Improved reading skills in 8 months",
      desc: '"For the first time, my son wanted to read on his own. After years of struggling with books and avoiding reading, he began picking them up voluntarily..."',
      author: "Sarah M.",
      time: "2 mo. ago",
      bgClass: "bg-[#faf4e8] text-[#4a3e3d]",
      tagClass: "border-[#B77145] text-[#B77145] text-white",
      titleClass: "text-[#B77145]",
      descClass: "text-[#68270b]",
      authorClass: "text-[#5c5251]",
    },
    {
      id: 5,
      tag: "Language Mastery",
      title: "Building Confidence Daily",
      desc: '"Watching him read with confidence and curiosity was a milestone our family never expected. The layout process completely transformed his mindset."',
      author: "David K.",
      time: "1 mo. ago",
      bgClass: "bg-[#faf4e8] text-[#4a3e3d]",
      tagClass: "border-[#B77145] text-white",
      titleClass: "text-[#B77145]",
      descClass: "text-[#68270b]",
      authorClass: "text-[#5c5251]",
    },
    {
      id: 6,
      tag: "Cognitive Growth",
      title: "A Whole New Horizon",
      desc: '"The program targets root difficulties rather than teaching workarounds. We\'ve seen incredible structural progression over a short time."',
      author: "Elena R.",
      time: "3 wk. ago",
      bgClass: "bg-[#B77145] text-white",
      tagClass: "border-none bg-[#fff] text-[#B77145]",
      authorClass: "text-[#5c5251]",
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
      bgClass: "bg-[#B77145] text-white",
      tagClass: "border-none bg-[#fff] text-[#B77145]",
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
      bgClass: "bg-[#B77145] text-white",
      tagClass: "border-none bg-[#fff] text-[#B77145]",
      authorClass: "text-[#5c5251]",
      titleClass: "text-white",
      descClass: "text-[#f7f3f0]",
    },
  ]);

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
          community_tags ( name, color )
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

  // --- HANDLER: Opens clicked card in the stack modal using Supabase 'header' ---
  const handleOpenCardInCarousel = (post) => {
    const newCard = {
      id: post.id,
      tag: post.community_tags?.name || "General",
      title: post.header || "Manual Heading", // Pulls dynamically from Supabase header column
      desc: `"${post.content}"`,
      author: post.username,
      time: new Date(post.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      bgClass: "bg-[#fff] text-[#4a3e3d]",
      tagClass: "border-[#B77145] text-[#fff]",
      titleClass: "text-[#B77145]",
      descClass: "text-[#68270b]",
      authorClass: "text-[#5c5251]",
    };

    // Prepend to deckData so it is immediately accessible
    setDeckData((prev) => [newCard, ...prev.filter((c) => c.id !== post.id)]);
    setCurrentIndex(0);
    setEnabled(false); // Switch to circular/stack view layout
    setIsModalOpen(true); // Open the stack modal
  };

  const handleNext = (e) => {
    e.stopPropagation();

    if (isSwiping) return;

    setSwipeDirection("next");
    setIsSwiping(true);

    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % deckData.length);
      setIsSwiping(false);
      setSwipeDirection(null);
    }, 300);
  };

  const handlePrev = (e) => {
    e.stopPropagation();

    if (isSwiping) return;

    setSwipeDirection("prev");
    setIsSwiping(true);

    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + deckData.length) % deckData.length);
      setIsSwiping(false);
      setSwipeDirection(null);
    }, 500);
  };

  const getCardPlacementClass = (idx) => {
    const nextIndex = (currentIndex + 1) % deckData.length;
    const prevIndex = (currentIndex - 1 + deckData.length) % deckData.length;
    const secondIndex = (currentIndex + 2) % deckData.length;

    // ACTIVE CARD
    if (idx === currentIndex) {
      if (isSwiping && swipeDirection === "next") {
        return "opacity-100 z-30 scale-100 translate-y-0 rotate-0 pointer-events-auto";
      }
      if (isSwiping && swipeDirection === "prev") {
        // ease into the "next slot" look instead of vanishing off-screen
        return "opacity-95 z-20 scale-96 -translate-y-[20px] md:-translate-y-[25px] -rotate-3 pointer-events-none";
      }
      return "opacity-100 z-30 scale-100 translate-y-0 rotate-0 pointer-events-auto";
    }

    // NEXT CARD
    if (idx === nextIndex) {
      if (isSwiping && swipeDirection === "prev") {
        // gets pushed one slot further back to make room
        return "opacity-90 z-10 scale-92 -translate-y-[35px] md:-translate-y-[45px] rotate-3 pointer-events-none";
      }
      return "opacity-95 z-20 scale-96 -translate-y-[20px] md:-translate-y-[25px] -rotate-3 pointer-events-none";
    }

    // PREVIOUS CARD — comes to front on prev click
    if (idx === prevIndex) {
      if (isSwiping && swipeDirection === "prev") {
        return "opacity-100 z-30 scale-100 translate-y-0 translate-x-0 rotate-0 pointer-events-auto";
      }
      return "opacity-0 z-0 scale-80 translate-y-[20px] translate-x-[-40px] -rotate-8 pointer-events-none";
    }

    // SECOND CARD BEHIND
    if (idx === secondIndex) {
      if (isSwiping && swipeDirection === "prev") {
        // it's about to fall out of the visible stack
        return "opacity-0 scale-80 pointer-events-none";
      }
      return "opacity-90 z-10 scale-92 -translate-y-[35px] md:-translate-y-[45px] rotate-3 pointer-events-none";
    }

    return "opacity-0 scale-80 pointer-events-none";
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    if (isModalOpen || activeVideoUrl) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen, activeVideoUrl]);

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

  return (
    <main className="lg:pt-0 lg:p-10 manrope w-full max-w-full overflow-x-hidden">
      <section
        className={`text-center text-[#B77145] px-4 ${
          isModalOpen ? "hidden" : "block"
        }`}
      >
        {/* Title Block */}
      </section>

      <section className="flex flex-col mt-11.25 px-[26.25px] gap-6">
        {/* Top Controls Row */}
        <div className="flex justify-between items-center w-full ">
          {/* Left Side: Filter Trigger Toggle (+ button & text) */}
          <div
            onClick={() => {
              setShowFilters(!showFilters);
              setEnabled(true);
            }}
            className="flex gap-4 items-center cursor-pointer select-none group active:scale-95 transition-transform shrink-0"
          >
            <div className="bg-[#B77145] text-white h-10 md:h-[43.75px] w-10 md:w-[43.75px] flex justify-center items-center rounded-full relative overflow-hidden">
              <span className="absolute bg-white w-[10px] md:w-[10px] h-[1.75px] rounded-full transition-transform duration-300 ease-in-out" />
              <span
                className={`absolute bg-white w-[1.75px] h-[10px] md:h-[10px] rounded-full transition-transform duration-300 ease-in-out ${
                  showFilters ? "rotate-90" : "rotate-0"
                }`}
              />
            </div>
            <span className="text-[#B77145] text-[18px] md:text-[15px] font-medium">
              Filter
            </span>
          </div>

          {/* Right Side: Layout Toggle Switch */}
          <div className="shrink-0">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => setEnabled(!enabled)}
                className="sr-only peer"
              />
              <div className="relative w-18 md:w-20 h-10 md:h-11 bg-[#B77145] rounded-full transition-colors duration-200 ease-in-out">
                <span
                  className={`absolute top-1 w-8 md:w-9 h-8 md:h-9 bg-[#FAF4E8] rounded-full flex justify-center items-center transition-all duration-200 ease-in-out ${
                    enabled ? "left-9 md:left-10" : "left-1"
                  }`}
                >
                  <img
                    src={enabled ? grid : toggle}
                    alt="toggle view"
                    className={`object-contain ${
                      enabled ? "w-3.5 h-3.5" : "w-5 h-5 "
                    }`}
                  />
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Bottom Row: Smooth Accordion Filter Items List Dropdown */}
        <div
          className={`grid transition-all duration-300 ease-in-out w-full ${
            showFilters
              ? "grid-rows-[1fr] opacity-100 py-1"
              : "grid-rows-[0fr] opacity-0 py-0 overflow-hidden"
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex items-start gap-2.5 overflow-x-auto scrollbar-none py-1 max-w-full justify-start md:justify-start">
              {/* 'All' Tag */}
              <button
                onClick={() => setSelectedTagId(null)}
                className={`px-6 py-3 rounded-full text-[14.4px] font-medium whitespace-nowrap transition-all duration-150 h-[50px] md:h-[52.5px] min-w-[120px] ${
                  !selectedTagId
                    ? "bg-[#B77145] text-white"
                    : "bg-[#FFFBF3] text-[#B77145] hover:bg-[#f2e7d3]"
                }`}
              >
                All
              </button>

              {tagsList.map((tag) => {
                const isSelected = selectedTagId === tag.id;
                const tagColor = tag.color || "#C85527";

                return (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTagId(tag.id)}
                    className={`px-5 py-3 h-[50px] md:h-[52.5px] md:min-w-[105px] rounded-full text-[14.4px] font-medium whitespace-nowrap transition-all duration-150 flex items-center gap-2.5 cursor-pointer ${
                      isSelected
                        ? "bg-[#B77145] text-white"
                        : "bg-[#FFFBF3] text-[#B77145] hover:bg-[#f2e7d3]"
                    }`}
                  >
                    <div
                      className="w-[4px] h-[4px] min-w-[4px] min-h-[4px] md:w-[6px] md:h-[6px] md:min-w-[6px] md:min-h-[6px] rounded-full inline-block shrink-0 flex-none"
                      style={{
                        backgroundColor: tagColor,
                      }}
                    ></div>
                    <p>{tag.name}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Conditional Layout Injection Section */}
      {enabled ? (
        <section className="w-full px-[26.25px] pt-[30px] flex flex-col items-center">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2.5 w-full max-w-350">
            {communityPosts
              .filter(
                (post) =>
                  post.status === "approved" &&
                  (!selectedTagId || post.tag_id === selectedTagId),
              )
              // If on "All" tab and NOT showing all cards, limit to 8
              .slice(
                0,
                selectedTagId === null && !showAllGridCards ? 8 : undefined,
              )
              .map((post) => {
                const tagColor = post.community_tags?.color || "#B77145";
                const isVideoPost = !!post.video_url;

                // --- 1. VIDEO CARD OPTION ---
                if (isVideoPost) {
                  return (
                    <div
                      key={post.id}
                      className="w-full h-[280px] sm:h-100 bg-[#FFFBF3] rounded-[40px] sm:rounded-4xl mx-auto p-5 md:p-5 flex flex-col justify-between text-white hover:text-[#68270B] bg-repeat-none bg-cover bg-center relative group cursor-pointer transition-all duration-300 overflow-hidden"
                      style={{
                        backgroundImage: post.thumbnail_url
                          ? `linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.5)), url(${post.thumbnail_url})`
                          : "linear-gradient(135deg, #B77145 0%, #68270b 100%)",
                      }}
                    >
                      <div
                        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out z-0"
                        style={{
                          background:
                            "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
                        }}
                      />
                      <div className="px-3.75 py-1.5 h-[40px] md:h-[50px] md:w-[160px] bg-white rounded-full text-[12px] font-medium md:text-[18px] flex justify-center items-center gap-2 text-center text-[#B77145] w-fit max-w-[90%] z-10">
                        <span
                          className="w-[8px] h-[8px] rounded-full inline-block shrink-0"
                          style={{ backgroundColor: tagColor }}
                        />
                        <p className="truncate">
                          {post.community_tags?.name || "General"}
                        </p>
                      </div>

                      <div className="flex justify-between items-end w-full z-10">
                        <div>
                          <h2 className="text-[15px] md:text-[18px] font-medium">
                            {post.username}
                          </h2>
                          <p className="text-[14px] md:text-[12px] font-regular">
                            {new Date(post.created_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveVideoUrl(post.video_url)}
                          className="cursor-pointer"
                        >
                          <img src={playBtn} alt="Play Video" />
                        </button>
                      </div>
                    </div>
                  );
                }

                // --- 2. STANDARD TEXT CARD OPTION ---
                return (
                  <div
                    key={post.id}
                    className="w-full h-[280px] sm:h-100 bg-[#FFFBF3] rounded-[40px] mx-auto transition-transform p-5 md:p-5 flex flex-col justify-between"
                  >
                    <div className="flex flex-col gap-4 md:gap-7.5">
                      <div className="px-3.75 py-1.5 h-[50px] md:h-[60px] md:w-[160px] bg-white rounded-full text-[12px] font-medium md:text-[18px] flex justify-center items-center gap-2 text-center text-[#B77145] w-fit max-w-[90%]">
                        <span
                          className="w-[8px] h-[8px] rounded-full inline-block shrink-0"
                          style={{ backgroundColor: tagColor }}
                        />
                        <p className="truncate">
                          {post.community_tags?.name || "General"}
                        </p>
                      </div>

                      <div className="text-[15px] md:text-[18px] text-[#B77145] leading-[-120%] font-medium pr-[28px]">
                        <p>{post.header}</p>
                      </div>
                    </div>

                    <div className="flex w-full justify-between items-center text-[#68270B]">
                      <div>
                        <h2 className="text-[15px] md:text-[15px] font-medium">
                          {post.username}
                        </h2>
                        <p className="text-[14px] md:text-[12px] font-regular">
                          {new Date(post.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </p>
                      </div>
                      <div
                        onClick={() => handleOpenCardInCarousel(post)}
                        className="bg-[#B77145] h-[40px] w-[40px] md:h-[43.75px] md:w-[43.75px] flex justify-center items-center rounded-full cursor-pointer hover:scale-105 transition-transform"
                      >
                        <img
                          src={plus}
                          alt="more"
                          className="w-[25px] h-[25px]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Render button ONLY if on "All" tab and there are more than 8 approved posts */}
          {selectedTagId === null &&
            communityPosts.filter((p) => p.status === "approved").length >
              8 && (
              <button
                className="mt-[60px] w-35 md:w-45 h-[60px] md:h-20 cursor-pointer bg-[#B77145] text-white font-semibold rounded-full text-[14px] md:text-[16px]"
                onClick={() => setShowAllGridCards(!showAllGridCards)}
              >
                {showAllGridCards ? "View Less" : "View All"}
              </button>
            )}
        </section>
      ) : (
        <section className="w-full min-h-100 lg:h-225 flex justify-center items-center relative overflow-hidden ">
          <div className="absolute inset-0 flex justify-center items-center z-10 text-[#B77145] text-center pointer-events-none px-4">
            <div className="max-w-70 sm:max-w-md md:max-w-xs lg:max-w-xs">
              <p className="text-[12px] lg:text-[18px] font-medium">
                Support, & positive
                <br />
                outcomes real experiences.
              </p>
            </div>
          </div>

          {/* Spinning Container Wrapper */}
          <div className="absolute inset-0 flex justify-center items-center animate-spin-smooth pointer-events-none  md:mt-0 lg:mt-0">
            <div className="h-50 lg:h-140 w-50 lg:w-140 rounded-full relative flex justify-center items-center pointer-events-auto">
              {/* Card 1 */}
              <div className="h-80 w-13.75 lg:h-175 lg:w-28.75 md:h-90 md:w-13 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center pointer-events-none">
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-all bg-cover ${
                    isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
                  }`}
                  style={
                    !isModalOpen
                      ? {
                          backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241707/Frame_2087330989_ysxxoz.png)`,
                          backgroundPosition: "center 0px",
                        }
                      : undefined
                  }
                />
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover rotate-180 ${
                    isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
                  }`}
                  style={
                    !isModalOpen
                      ? {
                          backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330986_u1dmj3.png)`,
                          backgroundPosition: "center 0px",
                        }
                      : undefined
                  }
                />
              </div>

              {/* Card 2 */}
              <div className="h-80 w-13.75 lg:h-175 lg:w-28.75 md:h-90 md:w-13 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-36 pointer-events-none">
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover ${
                    isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
                  }`}
                  style={
                    !isModalOpen
                      ? {
                          backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330985_zlrv98.png)`,
                          backgroundPosition: "center 0px",
                        }
                      : undefined
                  }
                />
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover rotate-180 ${
                    isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
                  }`}
                  style={
                    !isModalOpen
                      ? {
                          backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330987_r5gkiq.png)`,
                          backgroundPosition: "center 0px",
                        }
                      : undefined
                  }
                />
              </div>

              {/* Card 3 */}
              <div className="h-80 w-13.75 lg:h-175 lg:w-28.75 md:h-90 md:w-13 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-72 pointer-events-none">
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover ${
                    isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
                  }`}
                  style={
                    !isModalOpen
                      ? {
                          backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330982_qjfrbd.png)`,
                          backgroundPosition: "center 0px",
                        }
                      : undefined
                  }
                />
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover rotate-180 ${
                    isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
                  }`}
                  style={
                    !isModalOpen
                      ? {
                          backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330980_gn4kbu.png)`,
                          backgroundPosition: "center 0px",
                        }
                      : undefined
                  }
                />
              </div>

              {/* Card 4 */}
              <div className="h-80 w-13.75 lg:h-175 lg:w-28.75 md:h-90 md:w-13 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-108 pointer-events-none">
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover ${
                    isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
                  }`}
                  style={
                    !isModalOpen
                      ? {
                          backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330981_wpmiez.png)`,
                          backgroundPosition: "center 0px",
                        }
                      : undefined
                  }
                />
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover rotate-180 ${
                    isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
                  }`}
                  style={
                    !isModalOpen
                      ? {
                          backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330979_bbliqt.png)`,
                          backgroundPosition: "center 0px",
                        }
                      : undefined
                  }
                />
              </div>

              {/* Card 5 */}
              <div className="h-80 w-13.75 lg:h-175 lg:w-28.75 md:h-90 md:w-13 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-144 pointer-events-none">
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover ${
                    isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
                  }`}
                  style={
                    !isModalOpen
                      ? {
                          backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330983_s7wdtn.png)`,
                          backgroundPosition: "center 0px",
                        }
                      : undefined
                  }
                />
                <div
                  onClick={() => setIsModalOpen(true)}
                  className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover rotate-180 ${
                    isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
                  }`}
                  style={
                    !isModalOpen
                      ? {
                          backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330977_p2nzwo.png)`,
                          backgroundPosition: "center 0px",
                        }
                      : undefined
                  }
                />
              </div>
            </div>
          </div>

          {/* --- Responsive Context Modal Container --- */}
          {isModalOpen && (
            <div
              onClick={() => setIsModalOpen(false)}
              className="pt-30 md:pt-0 fixed inset-0 w-full h-full flex justify-center items-center z-50 bg-[#E5E5E5]/95 md:bg-black/10 backdrop-blur-sm transition-all duration-300"
            >
              <div className="relative w-full max-w-150 flex flex-col items-center justify-center gap-3 pb-5 md:pb-0 md:gap-6 px-4">
                {/* Card Stack Container */}
                <div className="relative w-[320px] h-105 lg:w-105 lg:h-125 order-1">
                  {deckData.map((card, idx) => {
                    const isActive = idx === currentIndex;
                    return (
                      <CarouselCard
                        key={card.id}
                        card={card}
                        isActive={isActive}
                        isSwiping={isSwiping}
                        swipeDirection={swipeDirection}
                        placementClass={getCardPlacementClass(idx)}
                      />
                    );
                  })}
                </div>

                {/* Action Buttons Row Container */}
                <div className="flex items-center justify-center gap-2 order-2 md:absolute md:w-full md:justify-between md:px-0 pointer-events-none">
                  <button
                    onClick={handlePrev}
                    className="w-12 h-12 lg:w-12.5 lg:h-12.5 rounded-full bg-[#B77145] hover:bg-[#9c6c4f] active:scale-95 text-white text-[22px] flex justify-center items-center transition-transform duration-100 pointer-events-auto lg:-translate-x-5"
                  >
                    &#8249;
                  </button>
                  <button
                    onClick={handleNext}
                    className="w-12 h-12 lg:w-12.5 lg:h-12.5 rounded-full bg-[#B77145] hover:bg-[#9c6c4f] active:scale-95 text-white text-[22px] flex justify-center items-center transition-transform duration-100 pointer-events-auto lg:translate-x-5"
                  >
                    &#8250;
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* --- VIDEO PLAYER MODAL --- */}
      {activeVideoUrl && (
        <div
          onClick={() => setActiveVideoUrl(null)}
          className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 backdrop-blur-sm transition-opacity duration-300"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-black rounded-3xl overflow-hidden w-full max-w-3xl shadow-2xl"
          >
            <button
              onClick={() => setActiveVideoUrl(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 text-white rounded-full flex justify-center items-center hover:bg-black transition cursor-pointer"
            >
              ✕
            </button>
            <video
              controls
              autoPlay
              src={activeVideoUrl}
              className="w-full max-h-[80vh] object-contain rounded-3xl"
            />
          </div>
        </div>
      )}
    </main>
  );
};

export default Community;

const CarouselCard = ({
  card,
  isActive,
  isSwiping,
  swipeDirection,
  placementClass,
}) => {
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        setIsOverflowing(
          textRef.current.scrollHeight > textRef.current.clientHeight,
        );
      }
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [card.desc]);

  // Determine the correct shadow color based on the card's background class
  const getShadowColor = (bgClass) => {
    if (bgClass.includes("#B77145")) return "#B77145";
    if (bgClass.includes("#fcf9f5")) return "#fcf9f5";
    if (bgClass.includes("#faf4e8")) return "#faf4e8";
    return "#ffffff";
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        transformOrigin: "bottom center",
        transform:
          isSwiping && isActive && swipeDirection === "next"
            ? "translateX(100%) scale(0.95) rotate(10deg)"
            : isSwiping && isActive && swipeDirection === "prev"
              ? "translateX(-5%) scale(0.95) rotate(-10deg)"
              : undefined,
        // Restored floaty fade out effect for Next (0.3), kept 0 for Prev to avoid ghosting
        opacity:
          isSwiping && isActive && swipeDirection === "next"
            ? 0.3
            : isSwiping && isActive
              ? 0
              : undefined,
        fontFamily: '"Manrope", sans-serif',
      }}
      // Reverted to duration-500 and the custom cubic-bezier easing to get the original placement animation
      className={`absolute w-full h-full rounded-[30px] lg:rounded-[40px] p-6 lg:p-8.75 flex flex-col justify-between transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${card.bgClass} ${placementClass}`}
    >
      <div className="shrink-0 flex flex-col gap-3.75">
        <div className="flex flex-col gap-6.25">
          <div
            className={`h-[40px] md:h-[50px] w-40 border rounded-full text-[13px] lg:text-[13px] ${card.tagClass} flex justify-center items-center text-center bg-[#B77145]`}
          >
            <p className="font-medium">{card.tag}</p>
          </div>
          <h2
            className={`text-[18px] lg:text-[24px] font-normal leading-tight ${card.titleClass} w-full lg:w-2/3`}
          >
            {card.title}
          </h2>
        </div>
        <div className="flex justify-between items-center text-xs lg:text-[14px] font-medium pb-2">
          <span>{card.author}</span>
          <span>{card.time}</span>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 mt-6.25">
        <div
          ref={textRef}
          className="h-full overflow-y-auto pr-1 scrollbar-none"
        >
          <p
            className={`text-[13px] lg:text-[14px] leading-relaxed lg:leading-[1.6] font-medium ${card.descClass}`}
          >
            {card.desc}
          </p>
        </div>

        {/* Only renders if text is longer than the container, and matches background color */}
        {isOverflowing && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-10"
            style={{
              background: `linear-gradient(to top, ${getShadowColor(card.bgClass)} 10%, transparent)`,
            }}
          />
        )}
      </div>
    </div>
  );
};
