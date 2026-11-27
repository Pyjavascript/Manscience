
import React, { useState, useEffect, useRef, useMemo } from "react";
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

  const [tagsList, setTagsList] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState(null);

  // --- NEW STATE: Tracks active video URL for popup modal ---
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);

  const [showAllGridCards, setShowAllGridCards] = useState(false);

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

  // --- Deck cards: every approved community_hub post, in the same order as the grid ---
  const deckData = useMemo(() => {
    // Card colour themes, cycled so neighbouring cards in the stack look different
    const themes = [
      {
        bgClass: "bg-[#fff] text-[#4a3e3d]",
        tagClass: "border-[#B77145] text-white",
        titleClass: "text-[#B77145]",
        descClass: "text-[#68270b]",
      },
      {
        bgClass: "bg-[#fcf9f5] text-[#4a3e3d]",
        tagClass: "border-[#B77145] text-white",
        titleClass: "text-[#B77145]",
        descClass: "text-[#68270b]",
      },
      {
        bgClass: "bg-[#B77145] text-white",
        tagClass: "border-none bg-[#fff] text-[#B77145]",
        titleClass: "text-white",
        descClass: "text-[#f7f3f0]",
      },
    ];

    return communityPosts.map((post, i) => ({
      id: post.id,
      tag: post.community_tags?.name || "General",
      title: post.header || "",
      desc: post.content ? `"${post.content}"` : "",
      author: post.username || "",
      time: new Date(post.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      videoUrl: post.video_url || null,
      ...themes[i % themes.length],
    }));
  }, [communityPosts]);

  // --- HANDLER: Opens the stack modal on the clicked grid post ---
  const handleOpenCardInCarousel = (post) => {
    const idx = deckData.findIndex((c) => c.id === post.id);
    setCurrentIndex(idx >= 0 ? idx : 0);
    setEnabled(false); // Switch to circular/stack view layout
    setIsModalOpen(true); // Open the stack modal
  };

  // Circle cards open the deck from the first post
  const openDeckFromStart = () => {
    setCurrentIndex(0);
    setIsModalOpen(true);
  };

  // --- Deck shuffle animation ---
  // The deck is a ring: offset 0 is the front card, offset n-1 is the bottom
  // of the deck (hidden behind the stack).
  //   Next → the front card swings out to the right, drops behind the stack
  //          and settles at the bottom; every other card steps forward.
  //   Prev → the bottom card slides out from behind on the left, comes over
  //          the top and lands in front; every other card steps back.
  // The travelling card uses a keyframe animation (it has to leave the stack
  // before it can change layers); the rest of the stack uses CSS transitions.
  const SHUFFLE_MS = 850;
  const [shuffle, setShuffle] = useState(null); // { id, dir } of the travelling card
  const shuffleLockRef = useRef(false);
  const shuffleTimerRef = useRef(null);

  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const moveDeck = (dir) => {
    const n = deckData.length;
    if (n < 2 || shuffleLockRef.current) return;

    // Card that travels: current front on Next, bottom card on Prev
    const travellerIdx = dir === "next" ? currentIndex : (currentIndex - 1 + n) % n;
    const animate = n >= 4 && !prefersReducedMotion();

    if (animate) {
      shuffleLockRef.current = true;
      setShuffle({ id: deckData[travellerIdx].id, dir });
      clearTimeout(shuffleTimerRef.current);
      shuffleTimerRef.current = setTimeout(() => {
        shuffleLockRef.current = false;
        setShuffle(null);
      }, SHUFFLE_MS);
    }

    setCurrentIndex((prev) => (dir === "next" ? (prev + 1) % n : (prev - 1 + n) % n));
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    moveDeck("next");
  };

  const handlePrev = (e) => {
    e?.stopPropagation();
    moveDeck("prev");
  };

  // Opening the story modal (from a grid card's + or a circle) collapses the
  // filter row so it doesn't show through behind the modal.
  useEffect(() => {
    if (isModalOpen) setShowFilters(false);
  }, [isModalOpen]);

  // Switching from the grid to the circular view collapses the filter row.
  useEffect(() => {
    if (!enabled) setShowFilters(false);
  }, [enabled]);

  // Reset any in-flight shuffle when the modal closes
  useEffect(() => {
    if (isModalOpen) return;
    clearTimeout(shuffleTimerRef.current);
    shuffleLockRef.current = false;
    setShuffle(null);
  }, [isModalOpen]);

  useEffect(() => () => clearTimeout(shuffleTimerRef.current), []);

  // Resting slot for each card, from its distance to the active card.
  // All transforms share the same function list so they interpolate cleanly
  // (and match the keyframes in index.css).
  const getCardStyle = (idx) => {
    const n = deckData.length;
    const offset = (idx - currentIndex + n) % n;
    const card = deckData[idx];

    let style;
    if (offset === 0) {
      style = { transform: "translate3d(0,0,0) rotate(0deg) rotateY(0deg) scale(1)", opacity: 1, zIndex: 30, pointerEvents: "auto" };
    } else if (offset === 1) {
      style = { transform: "translate3d(0,-5%,0) rotate(-3deg) rotateY(0deg) scale(0.96)", opacity: 1, zIndex: 20, pointerEvents: "none" };
    } else if (offset === 2) {
      style = { transform: "translate3d(0,-9%,0) rotate(3deg) rotateY(0deg) scale(0.92)", opacity: 1, zIndex: 10, pointerEvents: "none" };
    } else {
      // bottom of the deck — tucked behind the stack
      style = { transform: "translate3d(0,-9%,0) rotate(0deg) rotateY(0deg) scale(0.88)", opacity: 0, zIndex: 0, pointerEvents: "none" };
    }

    if (shuffle && shuffle.id === card.id) {
      style = {
        ...style,
        animation: `${shuffle.dir === "next" ? "community-card-next" : "community-card-prev"} ${SHUFFLE_MS}ms cubic-bezier(0.45,0,0.2,1) both`,
        transition: "none",
        pointerEvents: "none",
      };
    }
    return style;
  };

  // Keyboard support while the deck is open
  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") handleNext();
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "Escape") setIsModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, deckData, currentIndex]);

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
    <main className="lg:pt-0 lg:pt-10 manrope w-full max-w-full overflow-x-hidden">
      <section
        className={`text-center text-[#B77145] px-4 ${
          isModalOpen ? "hidden" : "block"
        }`}
      >
        {/* Title Block */}
      </section>

      <section className="flex flex-col mt-11.25  gap-6">
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
        <section className="w-full  pt-[30px] flex flex-col items-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 w-full">
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
                      className="w-full h-[260px] sm:h-auto sm:aspect-[4/5] bg-[#FFFBF3] rounded-[28px] xl:rounded-[34px] mx-auto p-4 md:p-5 flex flex-col justify-between text-white hover:text-[#68270B] bg-repeat-none bg-cover bg-center relative group cursor-pointer transition-all duration-300 overflow-hidden"
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
                      <div className="px-3.5 xl:px-4 h-9 xl:h-10 bg-white rounded-full text-[12px] xl:text-[13px] font-medium flex justify-center items-center gap-2 text-center text-[#B77145] w-fit max-w-[90%] z-10">
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
                          <h2 className="text-[14px] xl:text-[16px] font-medium">
                            {post.username}
                          </h2>
                          <p className="text-[12px] xl:text-[13px] font-regular">
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
                          <img src={playBtn} alt="Play Video" className="w-11 h-11 xl:w-auto xl:h-auto" />
                        </button>
                      </div>
                    </div>
                  );
                }

                // --- 2. STANDARD TEXT CARD OPTION ---
                return (
                  <div
                    key={post.id}
                    className="w-full h-[260px] sm:h-auto sm:aspect-[4/5] bg-[#FFFBF3] rounded-[28px] xl:rounded-[34px] mx-auto transition-transform p-4 md:p-5 flex flex-col justify-between"
                  >
                    <div className="flex flex-col gap-3.5 xl:gap-5 min-h-0">
                      <div className="px-3.5 xl:px-4 h-9 xl:h-10 bg-white rounded-full text-[12px] xl:text-[13px] font-medium flex justify-center items-center gap-2 text-center text-[#B77145] w-fit max-w-[90%]">
                        <span
                          className="w-[8px] h-[8px] rounded-full inline-block shrink-0"
                          style={{ backgroundColor: tagColor }}
                        />
                        <p className="truncate">
                          {post.community_tags?.name || "General"}
                        </p>
                      </div>

                      <div className="text-[15px] lg:text-[16px] xl:text-[24.5px] text-[#B77145] leading-snug font-semibold pr-2 xl:pr-[28px] line-clamp-4">
                        <p>{post.header}</p>
                      </div>
                    </div>

                    <div className="flex w-full justify-between items-center text-[#68270B]">
                      <div>
                        <h2 className="text-[14px] xl:text-[15px] font-medium">
                          {post.username}
                        </h2>
                        <p className="text-[12px] xl:text-[13px] font-regular">
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
                        className="bg-[#B77145] h-10 w-10 xl:h-11 xl:w-11 shrink-0 flex justify-center items-center rounded-full cursor-pointer hover:scale-105 transition-transform"
                      >
                        <img
                          src={plus}
                          alt="more"
                          className="w-[22px] h-[22px] xl:w-[25px] xl:h-[25px]"
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
        <section className="w-full min-h-100 md:h-150 lg:h-225 flex justify-center items-center relative overflow-hidden ">
          <div className="absolute inset-0 flex justify-center items-center z-10 text-[#B77145] text-center pointer-events-none px-4">
            <div className="max-w-70 sm:max-w-md md:max-w-xs lg:max-w-xs">
              <p className="text-[12px] md:text-[16px] lg:text-[18px] font-medium">
                Support, & positive
                <br />
                outcomes real experiences.
              </p>
            </div>
          </div>

          {/* Spinning Container Wrapper */}
          <div className="absolute inset-0 flex justify-center items-center animate-spin-smooth pointer-events-none  md:mt-0 lg:mt-0">
            <div className="h-50 md:h-104 lg:h-140 w-50 md:w-104 lg:w-140 rounded-full relative flex justify-center items-center pointer-events-auto">
              {/* Card 1 */}
              <div className="h-80 w-13.75 md:h-130 md:w-21 lg:h-175 lg:w-28.75 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center pointer-events-none">
                <div
                  onClick={openDeckFromStart}
                  className={`relative overflow-hidden group w-full h-16.25 md:h-26.5 lg:h-36.25 rounded-lg md:rounded-2xl lg:rounded-[20px] pointer-events-auto cursor-pointer transition-all bg-cover ${
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
                  onClick={openDeckFromStart}
                  className={`relative overflow-hidden group w-full h-16.25 md:h-26.5 lg:h-36.25 rounded-lg md:rounded-2xl lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover rotate-180 ${
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
              <div className="h-80 w-13.75 md:h-130 md:w-21 lg:h-175 lg:w-28.75 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-36 pointer-events-none">
                <div
                  onClick={openDeckFromStart}
                  className={`relative overflow-hidden group w-full h-16.25 md:h-26.5 lg:h-36.25 rounded-lg md:rounded-2xl lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover ${
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
                  onClick={openDeckFromStart}
                  className={`relative overflow-hidden group w-full h-16.25 md:h-26.5 lg:h-36.25 rounded-lg md:rounded-2xl lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover rotate-180 ${
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
              <div className="h-80 w-13.75 md:h-130 md:w-21 lg:h-175 lg:w-28.75 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-72 pointer-events-none">
                <div
                  onClick={openDeckFromStart}
                  className={`relative overflow-hidden group w-full h-16.25 md:h-26.5 lg:h-36.25 rounded-lg md:rounded-2xl lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover ${
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
                  onClick={openDeckFromStart}
                  className={`relative overflow-hidden group w-full h-16.25 md:h-26.5 lg:h-36.25 rounded-lg md:rounded-2xl lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover rotate-180 ${
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
              <div className="h-80 w-13.75 md:h-130 md:w-21 lg:h-175 lg:w-28.75 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-108 pointer-events-none">
                <div
                  onClick={openDeckFromStart}
                  className={`relative overflow-hidden group w-full h-16.25 md:h-26.5 lg:h-36.25 rounded-lg md:rounded-2xl lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover ${
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
                  onClick={openDeckFromStart}
                  className={`relative overflow-hidden group w-full h-16.25 md:h-26.5 lg:h-36.25 rounded-lg md:rounded-2xl lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover rotate-180 ${
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
              <div className="h-80 w-13.75 md:h-130 md:w-21 lg:h-175 lg:w-28.75 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-144 pointer-events-none">
                <div
                  onClick={openDeckFromStart}
                  className={`relative overflow-hidden group w-full h-16.25 md:h-26.5 lg:h-36.25 rounded-lg md:rounded-2xl lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover ${
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
                  onClick={openDeckFromStart}
                  className={`relative overflow-hidden group w-full h-16.25 md:h-26.5 lg:h-36.25 rounded-lg md:rounded-2xl lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover rotate-180 ${
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
              className="pt-30 md:pt-0 fixed inset-0 w-full h-full flex justify-center items-center z-50 bg-[#E5E5E5]/95 md:bg-black/10 backdrop-blur-sm animate-[community-overlay-in_0.3s_ease-out_both] motion-reduce:animate-none"
            >
              <div className="relative w-full max-w-150 flex flex-col items-center justify-center gap-3 pb-5 md:pb-0 md:gap-6 px-4 animate-[community-deck-in_0.5s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none">
                {/* Card Stack Container */}
                <div
                  // Original card size (320×420, 420×500 on desktop). Width never
                  // exceeds the viewport and height shrinks on short screens.
                  className="relative order-1 w-[min(320px,calc(100vw_-_32px))] h-[min(420px,calc(100dvh_-_240px))] lg:w-105 lg:h-[min(500px,calc(100dvh_-_160px))]"
                  style={{ perspective: "1400px", perspectiveOrigin: "50% 40%" }}
                >
                  {deckData.length === 0 ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute w-full h-full rounded-[30px] lg:rounded-[40px] p-6 lg:p-8.75 flex justify-center items-center text-center bg-white text-[#B77145] text-[15px] font-medium"
                    >
                      No community stories yet.
                    </div>
                  ) : (
                    deckData.map((card, idx) => (
                      <CarouselCard
                        key={card.id}
                        card={card}
                        cardStyle={getCardStyle(idx)}
                        onPlayVideo={setActiveVideoUrl}
                      />
                    ))
                  )}
                </div>

                {/* Action Buttons Row Container */}
                <div className="flex items-center justify-center gap-2 order-2 md:absolute md:w-full md:justify-between md:px-0 pointer-events-none">
                  <button
                    onClick={handlePrev}
                    aria-label="Previous story"
                    className="w-12 h-12 lg:w-12.5 lg:h-12.5 rounded-full bg-[#B77145] hover:bg-[#9c6c4f] active:scale-95 text-white text-[22px] flex justify-center items-center transition-[transform,background-color] duration-150 pointer-events-auto lg:-translate-x-5 outline-none focus-visible:ring-2 focus-visible:ring-[#B77145]/40 focus-visible:ring-offset-2"
                  >
                    &#8249;
                  </button>
                  <button
                    onClick={handleNext}
                    aria-label="Next story"
                    className="w-12 h-12 lg:w-12.5 lg:h-12.5 rounded-full bg-[#B77145] hover:bg-[#9c6c4f] active:scale-95 text-white text-[22px] flex justify-center items-center transition-[transform,background-color] duration-150 pointer-events-auto lg:translate-x-5 outline-none focus-visible:ring-2 focus-visible:ring-[#B77145]/40 focus-visible:ring-offset-2"
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

const CarouselCard = ({ card, cardStyle, onPlayVideo }) => {
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
        ...cardStyle,
        transformOrigin: "50% 100%",
        backfaceVisibility: "hidden",
        willChange: "transform, opacity",
        fontFamily: '"Manrope", sans-serif',
      }}
      // Only transform + opacity are transitioned — z-index switches instantly so
      // cards never slip under/over each other mid-flight.
      className={`absolute w-full h-full rounded-[30px] lg:rounded-[40px] p-6 lg:p-8.75 flex flex-col justify-between transition-[transform,opacity] duration-550 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${card.bgClass}`}
    >
      <div className="shrink-0 flex flex-col gap-3 xl:gap-3.5">
        <div className="flex flex-col gap-4 xl:gap-5">
          {/* Label pill: 160px wide, 40px tall on mobile, 50px from md up */}
          <div
            className={`self-start w-40 max-w-full h-[40px] md:h-[50px] px-4 border rounded-full text-[13px] ${card.tagClass} flex justify-center items-center text-center bg-[#B77145]`}
          >
            <p className="font-medium truncate">{card.tag}</p>
          </div>
          <h2
            className={`text-[16px] md:text-[17px] xl:text-[20px] font-normal leading-tight ${card.titleClass} w-full xl:w-[85%]`}
          >
            {card.title}
          </h2>
        </div>
        <div className="flex justify-between items-center gap-3 text-[11.5px] md:text-[12px] xl:text-[13px] font-medium pb-1">
          <span className="truncate">{card.author}</span>
          <span className="shrink-0">{card.time}</span>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 mt-4 xl:mt-5">
        <div
          ref={textRef}
          className="h-full overflow-y-auto pr-1 scrollbar-none"
        >
          <p
            className={`text-[13px] xl:text-[14px] leading-relaxed xl:leading-[1.6] font-medium ${card.descClass}`}
          >
            {card.desc}
          </p>
          {card.videoUrl && (
            <button
              onClick={() => onPlayVideo?.(card.videoUrl)}
              className="mt-3 flex items-center gap-2 cursor-pointer"
            >
              <img src={playBtn} alt="Play video" className="w-10 h-10" />
              <span className="text-[13px] font-medium">Watch video</span>
            </button>
          )}
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
