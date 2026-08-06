// import React, { useState, useEffect } from "react";
// import logo from "../assets/logo-white.png";
// import toggle from "../assets/toggle.svg";
// import grid from "../assets/grid.svg";
// import plus from "../assets/plus.svg";
// import plusBrown from "../assets/plusBrown.svg";

// import Nav from "../components/Nav";
// import { supabase } from "../supabase";
// const Community = () => {
//   const [enabled, setEnabled] = useState(false);
//   // --- State Functions for the Carousel Modal ---
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [isSwiping, setIsSwiping] = useState(false);

//   const [tagsList, setTagsList] = useState([]);
//   const [showFilters, setShowFilters] = useState(false);
//   const [selectedTagId, setSelectedTagId] = useState(null);

//   // Static Mock Data for the Card Elements
//   const deckData = [
//     {
//       id: 1,
//       tag: "Arrowsmith Program",
//       title: "Improved reading skills in 8 months",
//       desc: '"For the first time, my son wanted to read on his own. After years of struggling with books and avoiding reading, he began picking them up voluntarily. Watching him read with confidence and curiosity was a milestone our family never expected...After years of struggling with books and avoiding reading, he began picking them up voluntarily. Watching him read with confidence and curiosity was a milestone our family never expected...After years of struggling with books and avoiding reading, he began picking them up voluntarily. Watching him read with confidence and curiosity was a milestone our family never expected... as a milestone our family never expected...as a milestone our family never expected..."',
//       author: "Sarah M.",
//       time: "2 mo. ago",
//       bgClass: "bg-[#fff] text-[#4a3e3d]",
//       tagClass: "border-[#B77145] text-[#B77145] text-white",
//       titleClass: "text-[#B77145]",
//       descClass: "text-[#68270b]",
//       authorClass: "text-[#5c5251]",
//     },
//     {
//       id: 2,
//       tag: "Language Mastery",
//       title: "Building Confidence Daily",
//       desc: '"Watching him read with confidence and curiosity was a milestone our family never expected. The layout process completely transformed his mindset."',
//       author: "David K.",
//       time: "1 mo. ago",
//       bgClass: "bg-[#fcf9f5] text-[#4a3e3d]",
//       tagClass: "border-[#B77145] text-[#B77145] text-white",
//       titleClass: "text-[#B77145]",
//       descClass: "text-[#68270b]",
//       authorClass: "text-[#5c5251]",
//     },
//     {
//       id: 3,
//       tag: "Cognitive Growth",
//       title: "A Whole New Horizon",
//       desc: '"The program targets root difficulties rather than teaching workarounds. We\'ve seen incredible structural progression over a short time."',
//       author: "Elena R.",
//       time: "3 wk. ago",
//       bgClass: "bg-[#B77145] text-white",
//       tagClass: "border-none bg-[#fff] text-[#B77145]",
//       authorClass: "text-[#5c5251]",
//       titleClass: "text-white",
//       descClass: "text-[#f7f3f0]",
//     },
//     {
//       id: 4,
//       tag: "Arrowsmith Program",
//       title: "Improved reading skills in 8 months",
//       desc: '"For the first time, my son wanted to read on his own. After years of struggling with books and avoiding reading, he began picking them up voluntarily. Watching him read with confidence and curiosity was a milestone our family never expected...After years of struggling with books and avoiding reading, he began picking them up voluntarily. Watching him read with confidence and curiosity was a milestone our family never expected...After years of struggling with books and avoiding reading, he began picking them up voluntarily. Watching him read with confidence and curiosity was a milestone our family never expected... as a milestone our family never expected...as a milestone our family never expected..."',
//       author: "Sarah M.",
//       time: "2 mo. ago",
//       bgClass: "bg-[#f0eae1] text-[#4a3e3d]",
//       tagClass: "border-[#B77145] text-[#B77145] text-white",
//       titleClass: "text-[#B77145]",
//       descClass: "text-[#68270b]",
//       authorClass: "text-[#5c5251]",
//     },
//     {
//       id: 5,
//       tag: "Language Mastery",
//       title: "Building Confidence Daily",
//       desc: '"Watching him read with confidence and curiosity was a milestone our family never expected. The layout process completely transformed his mindset."',
//       author: "David K.",
//       time: "1 mo. ago",
//       bgClass: "bg-[#fcf9f5] text-[#4a3e3d]",
//       tagClass: "border-[#B77145] text-white",
//       titleClass: "text-[#B77145]",
//       descClass: "text-[#68270b]",
//       authorClass: "text-[#5c5251]",
//     },
//     {
//       id: 6,
//       tag: "Cognitive Growth",
//       title: "A Whole New Horizon",
//       desc: '"The program targets root difficulties rather than teaching workarounds. We\'ve seen incredible structural progression over a short time."',
//       author: "Elena R.",
//       time: "3 wk. ago",
//       bgClass: "bg-[#B77145] text-white",
//       tagClass: "border-none bg-[#fff] text-[#B77145]",
//       aurthorClass: "text-[#5c5251]",

//       titleClass: "text-white",
//       descClass: "text-[#f7f3f0]",
//     },
//     {
//       id: 7,
//       tag: "Cognitive Growth",
//       title: "A Whole New Horizon",
//       desc: '"The program targets root difficulties rather than teaching workarounds. We\'ve seen incredible structural progression over a short time."',
//       author: "Elena R.",
//       time: "3 wk. ago",
//       bgClass: "bg-[#B77145] text-white",
//       tagClass: "border-none bg-[#fff] text-[#B77145]",
//       authorClass: "text-[#5c5251]",
//       titleClass: "text-white",
//       descClass: "text-[#f7f3f0]",
//     },
//     {
//       id: 8,
//       tag: "Cognitive Growth",
//       title: "A Whole New Horizon",
//       desc: '"The program targets root difficulties rather than teaching workarounds. We\'ve seen incredible structural progression over a short time."',
//       author: "Elena R.",
//       time: "3 wk. ago",
//       bgClass: "bg-[#B77145] text-white",
//       tagClass: "border-none bg-[#fff] text-[#B77145]",
//       authorClass: "text-[#5c5251]",
//       titleClass: "text-white",
//       descClass: "text-[#f7f3f0]",
//     },
//   ];

//   const [communityPosts, setCommunityPosts] = useState([]);

//   useEffect(() => {
//     fetchCommunityData();
//   }, []);

//   async function fetchCommunityData() {
//     try {
//       const { data, error } = await supabase
//         .from("community_hub")
//         .select(
//           `
//           *,
//           community_tags ( name, color )
//         `,
//         )
//         .eq("status", "approved")
//         .order("created_at", { ascending: false });

//       if (error) throw error;
//       setCommunityPosts(data || []);
//     } catch (err) {
//       console.error("Error reading community content:", err.message);
//     }
//   }

//   const handleNext = (e) => {
//     e.stopPropagation();
//     if (isSwiping) return;
//     setIsSwiping(true);
//     setTimeout(() => {
//       setCurrentIndex((prev) => (prev + 1) % deckData.length);
//       setIsSwiping(false);
//     }, 300);
//   };

//   const handlePrev = (e) => {
//     e.stopPropagation();
//     setCurrentIndex((prev) => (prev - 1 + deckData.length) % deckData.length);
//   };

//   const getCardPlacementClass = (idx) => {
//     if (idx === currentIndex)
//       return "opacity-100 z-30 scale-100 translate-y-0 rotate-0 pointer-events-auto";
//     if (idx === (currentIndex + 1) % deckData.length)
//       return "opacity-95 z-20 scale-96 -translate-y-[20px] md:-translate-y-[25px] -rotate-3 pointer-events-none";
//     if (idx === (currentIndex + 2) % deckData.length)
//       return "opacity-90 z-10 scale-92 -translate-y-[35px] md:-translate-y-[45px] rotate-3 pointer-events-none";
//     return "opacity-0 scale-80 pointer-events-none";
//   };

//   useEffect(() => {
//     fetchFilters();
//   }, []);
//   useEffect(() => {
//     if (isModalOpen) {
//       document.body.style.overflow = "hidden";
//     } else {
//       document.body.style.overflow = "unset";
//     }

//     return () => {
//       document.body.style.overflow = "unset";
//     };
//   }, [isModalOpen]);

//   async function fetchFilters() {
//     try {
//       const { data, error } = await supabase
//         .from("community_tags")
//         .select("*")
//         .order("name", { ascending: true });

//       if (error) throw error;
//       setTagsList(data || []);
//     } catch (err) {
//       console.error("Failed fetching layout filters:", err.message);
//     }
//   }

//   const testimonials = communityPosts.filter((post) => {
//     const isApproved = post.status === "approved";

//     const isTestimonial =
//       post.community_tags?.name?.toLowerCase() === "testimonials";

//     const matchesSelectedTag = !selectedTagId || post.tag_id === selectedTagId;

//     return isApproved && isTestimonial && matchesSelectedTag;
//   });
//   return (
//     // <main className="lg:p-10 py-7.5 manrope">
//     <main className="lg:pt-0 lg:p-10 manrope w-full max-w-full overflow-x-hidden">
//       {/* <Nav /> */}
//       <section
//         className={`text-center text-[#B77145]  px-4 ${
//           isModalOpen ? "hidden" : "block"
//         }`}
//       >
//         {/* Title Block */}
//       </section>

//       <section className="flex flex-col mt-11.25 px-3.75 gap-6">
//         {/* Top Controls Row */}
//         <div className="flex justify-between items-center w-full">
//           {/* Left Side: Filter / Close Button Toggle */}
//           {showFilters ? (
//             /* OPEN STATE: Light Pill Close Button (Matches Figma) */
//             <button
//               onClick={() => setShowFilters(false)}
//               className="flex items-center gap-3 px-6 py-3 rounded-full bg-[#FAF4E8] text-[#B77145] text-[20px] font-normal hover:bg-[#f3ebd9] transition duration-150 cursor-pointer select-none active:scale-95"
//             >
//               {/* <ion-icon
//                 name="close-outline"
//                 style={{ fontSize: "20px" }}
//               ></ion-icon> */}
//               <img src={plusBrown} className="rotate-45" alt="more" />

//               <span>Close</span>
//             </button>
//           ) : (
//             <div
//               onClick={() => {
//                 setShowFilters(true);
//                 setEnabled(true);
//               }}
//               className="flex gap-4 items-center cursor-pointer select-none group active:scale-95 transition-transform shrink-0"
//             >
//               <div className="bg-[#B77145] text-white text-[24px] h-10 md:h-12.5 w-10 md:w-12.5 flex justify-center items-center rounded-full">
//                 {/* <ion-icon name="add-outline"></ion-icon> */}
//                 <img src={plus} alt="more" className="w-6 md:w-auto" />
//               </div>
//               <span className="text-[#B77145] text-[18px] md:text-[24px] font-normal">
//                 Filter
//               </span>
//             </div>
//           )}

//           {/* Right Side: Layout Toggle Switch */}
//           <div className="shrink-0">
//             <label className="flex items-center gap-3 cursor-pointer select-none">
//               <input
//                 type="checkbox"
//                 checked={enabled}
//                 onChange={() => setEnabled(!enabled)}
//                 className="sr-only peer"
//               />

//               <div className="relative w-18 md:w-20 h-10 md:h-11 bg-[#B77145] rounded-full transition-colors duration-200 ease-in-out">
//                 <span
//                   className={`absolute top-1 w-8 md:w-9 h-8 md:h-9 bg-[#FAF4E8] rounded-full flex justify-center items-center transition-all transition-left duration-200 ease-in-out ${
//                     enabled ? "left-9 md:left-10" : "left-1"
//                   }`}
//                 >
//                   <img
//                     src={enabled ? grid : toggle}
//                     alt="toggle view"
//                     className={`object-contain ${enabled ? "w-4 h-4" : "w-5 h-5 "}`}
//                   />
//                 </span>
//               </div>
//             </label>
//           </div>
//         </div>

//         {/* Bottom Row: Filter Items List (Rendered below the top controls) */}
//         {showFilters && (
//           <div className="flex justify-start w-full animate-fadeIn">
//             <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-1 px-2 max-w-full justify-start md:justify-center">
//               {/* 'All' Tag */}
//               <button
//                 onClick={() => setSelectedTagId(null)}
//                 className={`px-17.5 py-5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150 ${
//                   !selectedTagId
//                     ? "bg-[#B77145] text-white"
//                     : "bg-[#FFFBF3] text-[#B77145] hover:bg-[#f2e7d3]"
//                 }`}
//               >
//                 All
//               </button>

//               {tagsList.map((tag) => {
//                 const isSelected = selectedTagId === tag.id;
//                 const tagColor = tag.color || "#C85527";

//                 return (
//                   <button
//                     key={tag.id}
//                     onClick={() => setSelectedTagId(tag.id)}
//                     className={`px-4.25 py-5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150 flex items-center gap-2.5 cursor-pointer ${
//                       isSelected
//                         ? "bg-[#C85527] text-white"
//                         : "bg-[#FAF4E8] text-[#C85527] hover:bg-[#f2e7d3]"
//                     }`}
//                   >
//                     <span
//                       className="w-2 h-2 rounded-full inline-block transition-colors duration-150"
//                       style={{
//                         backgroundColor: isSelected ? "#FFFFFF" : tagColor,
//                       }}
//                     />
//                     {tag.name}
//                   </button>
//                 );
//               })}
//             </div>
//           </div>
//         )}
//       </section>

//       {/* Conditional Layout Injection Section */}
//       {enabled ? (
//         <section className="w-full mt-25 lg:mt-24 px-3.75 flex flex-col items-center">
//           <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2.5 w-full max-w-350">
//             {communityPosts
//               .filter(
//                 (post) =>
//                   post.status === "approved" &&
//                   (!selectedTagId || post.tag_id === selectedTagId),
//               )
//               .map((post) => {
//                 const tagColor = post.community_tags?.color || "#B77145";

//                 return (
//                   <div
//                     key={post.id}
//                     className="w-full h-[280px] sm:h-100 bg-[#FFFBF3] rounded-[40px] sm:rounded-4xl mx-auto transition-transform p-5  md:p-2.5 md:p-5 flex flex-col justify-between"
//                   >
//                     <div className="flex flex-col gap-4 md:gap-7.5">
//                       {/* Tag Pill with Color Dot */}
//                       <div className="px-3.75 py-1.5 h-[50px] md:h-[60px] md:w-[160px] bg-white rounded-full text-[12px] font-medium md:text-[18px] flex justify-center items-center gap-2 text-center text-[#B77145] w-fit max-w-[90%]">
//                         <span
//                           className="w-[8px] h-[8px] rounded-full inline-block shrink-0"
//                           style={{ backgroundColor: tagColor }}
//                         />
//                         <p className="truncate">
//                           {post.community_tags?.name || "General"}
//                         </p>
//                       </div>

//                       <div className="text-[15px] md:text-[20px] text-[#B77145] leading-[-120%] font-medium pr-[28px]">
//                         <p>{post.content}</p>
//                       </div>
//                     </div>

//                     <div className="flex w-full justify-between items-center text-[#B77145]">
//                       <div>
//                         <h2 className="text-[15px] md:text-[18px] font-medium">
//                           {post.username}
//                         </h2>
//                         <p className="text-[14px] md:text-[12px] font-regular">
//                           {new Date(post.created_at).toLocaleDateString(
//                             "en-US",
//                             {
//                               month: "short",
//                               day: "numeric",
//                               year: "numeric",
//                             },
//                           )}
//                         </p>
//                       </div>
//                       <div className="bg-[#B77145] h-[40px] w-[40px] md:h-12.5 md:w-12.5 flex justify-center items-center rounded-full">
//                         {/* <ion-icon name="add-outline"></ion-icon> */}
//                         <img src={plus} alt="more" />
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//           </div>

//           <button
//             className="mt-12 w-40 h-20 cursor-pointer bg-[#B77145] text-white font-semibold rounded-full text-[14px] mdtext-[16px]"
//             onClick={() => setSelectedTagId(null)}
//           >
//             View All
//           </button>
//         </section>
//       ) : (
//         <section className="w-full min-h-125 lg:h-225 flex justify-center items-center relative overflow-hidden">
//           <div className="absolute top-65 md:top-10 lg:top-1/2 left-0 md:left-1/2 -translate-x-1/2 lg:-translate-y-1/2 z-10 text-[#B77145] text-center pointer-events-none px-4 w-full">
//             <div className="max-w-70 sm:max-w-md md:max-w-xs lg:max-w-xs mx-auto">
//               <p className="text-[12px] lg:text-[18px] font-medium w-auto">
//                 Support, & positive
//                 <br />
//                 outcomes real experiences.
//               </p>
//             </div>
//           </div>

//           {/* animate-spin-smooth  - animation name  */}
//           {/* Spinning Container Wrapper - Prevents Scrolling & Center Aligned */}
//           <div className="absolute inset-0 flex justify-center items-center animate-spin-smooth pointer-events-none mt-20 md:mt-40 lg:mt-0">
//             <div className="h-50 lg:h-140 w-50 lg:w-140 rounded-full relative flex justify-center items-center pointer-events-auto">
//               {/* Card 1 */}
//               <div className="h-80 w-13.75 lg:h-175 lg:w-28.75 md:h-90 md:w-13 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center pointer-events-none">
//                 <div
//                   onClick={() => setIsModalOpen(true)}
//                   className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-all bg-cover ${
//                     isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
//                   }`}
//                   style={
//                     !isModalOpen
//                       ? {
//                           backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241707/Frame_2087330989_ysxxoz.png)`,
//                           backgroundPosition: "center 0px",
//                         }
//                       : undefined
//                   }
//                 >
//                   <div
//                     className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
//                     style={{
//                       background:
//                         "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
//                     }}
//                   />
//                 </div>
//                 <div
//                   onClick={() => setIsModalOpen(true)}
//                   className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover rotate-180 ${
//                     isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
//                   }`}
//                   style={
//                     !isModalOpen
//                       ? {
//                           backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330986_u1dmj3.png)`,
//                           backgroundPosition: "center 0px",
//                         }
//                       : undefined
//                   }
//                 >
//                   <div
//                     className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
//                     style={{
//                       background:
//                         "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
//                     }}
//                   />
//                 </div>
//               </div>

//               {/* Card 2 */}
//               <div className="h-80 w-13.75 lg:h-175 lg:w-28.75 md:h-90 md:w-13 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-36 pointer-events-none">
//                 <div
//                   onClick={() => setIsModalOpen(true)}
//                   className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover ${
//                     isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
//                   }`}
//                   style={
//                     !isModalOpen
//                       ? {
//                           backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330985_zlrv98.png)`,
//                           backgroundPosition: "center 0px",
//                         }
//                       : undefined
//                   }
//                 >
//                   <div
//                     className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
//                     style={{
//                       background:
//                         "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
//                     }}
//                   />
//                 </div>
//                 <div
//                   onClick={() => setIsModalOpen(true)}
//                   className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover rotate-180 ${
//                     isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
//                   }`}
//                   style={
//                     !isModalOpen
//                       ? {
//                           backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330987_r5gkiq.png)`,
//                           backgroundPosition: "center 0px",
//                         }
//                       : undefined
//                   }
//                 >
//                   <div
//                     className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
//                     style={{
//                       background:
//                         "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
//                     }}
//                   />
//                 </div>
//               </div>

//               {/* Card 3 */}
//               <div className="h-80 w-13.75 lg:h-175 lg:w-28.75 md:h-90 md:w-13 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-72 pointer-events-none">
//                 <div
//                   onClick={() => setIsModalOpen(true)}
//                   className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover ${
//                     isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
//                   }`}
//                   style={
//                     !isModalOpen
//                       ? {
//                           backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330982_qjfrbd.png)`,
//                           backgroundPosition: "center 0px",
//                         }
//                       : undefined
//                   }
//                 >
//                   <div
//                     className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
//                     style={{
//                       background:
//                         "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
//                     }}
//                   />
//                 </div>
//                 <div
//                   onClick={() => setIsModalOpen(true)}
//                   className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover rotate-180 ${
//                     isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
//                   }`}
//                   style={
//                     !isModalOpen
//                       ? {
//                           backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330980_gn4kbu.png)`,
//                           backgroundPosition: "center 0px",
//                         }
//                       : undefined
//                   }
//                 >
//                   <div
//                     className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
//                     style={{
//                       background:
//                         "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
//                     }}
//                   />
//                 </div>
//               </div>

//               {/* Card 4 */}
//               <div className="h-80 w-13.75 lg:h-175 lg:w-28.75 md:h-90 md:w-13 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-108 pointer-events-none">
//                 <div
//                   onClick={() => setIsModalOpen(true)}
//                   className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover ${
//                     isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
//                   }`}
//                   style={
//                     !isModalOpen
//                       ? {
//                           backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330981_wpmiez.png)`,
//                           backgroundPosition: "center 0px",
//                         }
//                       : undefined
//                   }
//                 >
//                   <div
//                     className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
//                     style={{
//                       background:
//                         "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
//                     }}
//                   />
//                 </div>
//                 <div
//                   onClick={() => setIsModalOpen(true)}
//                   className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover rotate-180 ${
//                     isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
//                   }`}
//                   style={
//                     !isModalOpen
//                       ? {
//                           backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330979_bbliqt.png)`,
//                           backgroundPosition: "center 0px",
//                         }
//                       : undefined
//                   }
//                 >
//                   <div
//                     className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
//                     style={{
//                       background:
//                         "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
//                     }}
//                   />
//                 </div>
//               </div>

//               {/* Card 5 */}
//               <div className="h-80 w-13.75 lg:h-175 lg:w-28.75 md:h-90 md:w-13 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center rotate-144 pointer-events-none">
//                 <div
//                   onClick={() => setIsModalOpen(true)}
//                   className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover ${
//                     isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
//                   }`}
//                   style={
//                     !isModalOpen
//                       ? {
//                           backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330983_s7wdtn.png)`,
//                           backgroundPosition: "center 0px",
//                         }
//                       : undefined
//                   }
//                 >
//                   <div
//                     className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
//                     style={{
//                       background:
//                         "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
//                     }}
//                   />
//                 </div>
//                 <div
//                   onClick={() => setIsModalOpen(true)}
//                   className={`relative overflow-hidden group w-full h-16.25 lg:h-36.25 rounded-lg lg:rounded-[20px] pointer-events-auto cursor-pointer transition-opacity bg-cover rotate-180 ${
//                     isModalOpen ? "opacity-20 bg-[#B77145]/25" : "opacity-100"
//                   }`}
//                   style={
//                     !isModalOpen
//                       ? {
//                           backgroundImage: `url(https://res.cloudinary.com/dspwbbjyt/image/upload/v1785241706/Frame_2087330977_p2nzwo.png)`,
//                           backgroundPosition: "center 0px",
//                         }
//                       : undefined
//                   }
//                 >
//                   <div
//                     className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
//                     style={{
//                       background:
//                         "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
//                     }}
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* --- Responsive Context Modal Container --- */}
//           {isModalOpen && (
//             <div
//               onClick={() => setIsModalOpen(false)}
//               className="pt-30 md:pt-0 fixed inset-0 w-full h-full flex justify-center items-center z-50 bg-black/10 transition-opacity duration-300"
//             >
//               <div className="relative w-full max-w-150 flex flex-col items-center justify-center gap-3 pb-5 md:pb-0 md:gap-6 px-4">
//                 {/* Card Stack Container */}
//                 <div className="relative w-[320px] h-105 lg:w-105 lg:h-125 order-1">
//                   {deckData.map((card, idx) => {
//                     const isActive = idx === currentIndex;
//                     return (
//                       <div
//                         key={card.id}
//                         onClick={(e) => e.stopPropagation()}
//                         style={{
//                           transformOrigin: "bottom center",
//                           transform:
//                             isSwiping && isActive
//                               ? "translateX(100%) scale(0.95) rotate(10deg)"
//                               : undefined,
//                           opacity: isSwiping && isActive ? 0.3 : undefined,
//                           fontFamily: '"Manrope", sans-serif',
//                         }}
//                         className={`absolute w-full h-full rounded-[30px] lg:rounded-4xl p-6 lg:p-8.75 flex flex-col justify-between transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${card.bgClass} ${getCardPlacementClass(idx)}`}
//                       >
//                         <>
//                           <div className="shrink-0 flex flex-col gap-3.75">
//                             <div className="flex flex-col gap-6.25">
//                               <div
//                               className={`h-10 md:h-12.5 w-40 border rounded-full text-[13px] font-normal lg:text-[13px] ${card.tagClass} flex justify-center items-center text-center bg-[#B77145]`}
//                             >
//                               <p>{card.tag}</p>
//                             </div>
//                             <h2
//                               className={`text-[18px] lg:text-[28px] font-normal leading-tight ${card.titleClass} w-full lg:w-2/3`}
//                             >
//                               {card.title}
//                             </h2>
//                             </div>
//                             <div className="flex justify-between items-center text-xs lg:text-[14px] font-medium pb-2">
//                               <span>{card.author}</span>
//                               <span>{card.time}</span>
//                             </div>
//                           </div>

//                           <div className="flex-1 overflow-y-auto min-h-0 pr-1 mt-6.25 scrollbar-none">
//                             <p
//                               className={`text-[13px] lg:text-[14px] leading-relaxed lg:leading-[1.6] font-medium ${card.descClass}`}
//                             >
//                               {card.desc}
//                             </p>
//                           </div>
//                         </>
//                       </div>
//                     );
//                   })}
//                 </div>

//                 {/* Action Buttons Row Container */}
//                 <div className="flex items-center justify-center gap-2 order-2 md:absolute md:w-full md:justify-between md:px-0 pointer-events-none">
//                   <button
//                     onClick={handlePrev}
//                     className="w-12 h-12 lg:w-12.5 lg:h-12.5 rounded-full bg-[#B77145] hover:bg-[#9c6c4f] active:scale-95 text-white text-[22px] flex justify-center items-center transition-transform duration-100 pointer-events-auto lg:-translate-x-5"
//                   >
//                     &#8249;
//                   </button>
//                   <button
//                     onClick={handleNext}
//                     className="w-12 h-12 lg:w-12.5 lg:h-12.5 rounded-full bg-[#B77145] hover:bg-[#9c6c4f] active:scale-95 text-white text-[22px] flex justify-center items-center transition-transform duration-100 pointer-events-auto lg:translate-x-5"
//                   >
//                     &#8250;
//                   </button>
//                 </div>
//               </div>
//             </div>
//           )}
//         </section>
//       )}
//     </main>
//   );
// };

// export default Community;

import React, { useState, useEffect } from "react";
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

  const [tagsList, setTagsList] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState(null);

  // --- NEW STATE: Tracks active video URL for popup modal ---
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);

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
      desc: '"For the first time, my son wanted to read on his own. After years of struggling with books and avoiding reading, he began picking them up voluntarily. Watching him read with confidence and curiosity was a milestone our family never expected...After years of struggling with books and avoiding reading, he began picking them up voluntarily. Watching him read with confidence and curiosity was a milestone our family never expected...After years of struggling with books and avoiding reading, he began picking them up voluntarily. Watching him read with confidence and curiosity was a milestone our family never expected... as a milestone our family never expected...as a milestone our family never expected..."',
      author: "Sarah M.",
      time: "2 mo. ago",
      bgClass: "bg-[#f0eae1] text-[#4a3e3d]",
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
      bgClass: "bg-[#fcf9f5] text-[#4a3e3d]",
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
        className={`text-center text-[#B77145]  px-4 ${
          isModalOpen ? "hidden" : "block"
        }`}
      >
        {/* Title Block */}
      </section>

      <section className="flex flex-col mt-11.25 px-3.75 gap-6">
        {/* Top Controls Row */}
        <div className="flex justify-between items-center w-full">
          {/* Left Side: Filter / Close Button Toggle */}
          {showFilters ? (
            <button
              onClick={() => setShowFilters(false)}
              className="flex items-center gap-3 px-6 py-3 rounded-full bg-[#FAF4E8] text-[#B77145] text-[20px] font-normal hover:bg-[#f3ebd9] transition duration-150 cursor-pointer select-none active:scale-95"
            >
              <img src={plusBrown} className="rotate-45" alt="more" />
              <span>Close</span>
            </button>
          ) : (
            <div
              onClick={() => {
                setShowFilters(true);
                setEnabled(true);
              }}
              className="flex gap-4 items-center cursor-pointer select-none group active:scale-95 transition-transform shrink-0"
            >
              <div className="bg-[#B77145] text-white text-[24px] h-10 md:h-12.5 w-10 md:w-12.5 flex justify-center items-center rounded-full">
                <img src={plus} alt="more" className="w-6 md:w-auto" />
              </div>
              <span className="text-[#B77145] text-[18px] md:text-[24px] font-normal">
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

              <div className="relative w-18 md:w-20 h-10 md:h-11 bg-[#B77145] rounded-full transition-colors duration-200 ease-in-out">
                <span
                  className={`absolute top-1 w-8 md:w-9 h-8 md:h-9 bg-[#FAF4E8] rounded-full flex justify-center items-center transition-all transition-left duration-200 ease-in-out ${
                    enabled ? "left-9 md:left-10" : "left-1"
                  }`}
                >
                  <img
                    src={enabled ? grid : toggle}
                    alt="toggle view"
                    className={`object-contain ${enabled ? "w-4 h-4" : "w-5 h-5 "}`}
                  />
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Bottom Row: Filter Items List */}
        {showFilters && (
          <div className="flex justify-start w-full animate-fadeIn">
            <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-1 px-2 max-w-full justify-start md:justify-center">
              <button
                onClick={() => setSelectedTagId(null)}
                className={`px-17.5 py-5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150 ${
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
                    className={`px-4.25 py-5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150 flex items-center gap-2.5 cursor-pointer ${
                      isSelected
                        ? "bg-[#C85527] text-white"
                        : "bg-[#FAF4E8] text-[#C85527] hover:bg-[#f2e7d3]"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full inline-block transition-colors duration-150"
                      style={{
                        backgroundColor: isSelected ? "#FFFFFF" : tagColor,
                      }}
                    />
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Conditional Layout Injection Section */}
      {enabled ? (
        <section className="w-full mt-25 lg:mt-24 px-3.75 flex flex-col items-center">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2.5 w-full max-w-350">
            {communityPosts
              .filter(
                (post) =>
                  post.status === "approved" &&
                  (!selectedTagId || post.tag_id === selectedTagId),
              )
              .map((post) => {
                const tagColor = post.community_tags?.color || "#B77145";
                const isVideoPost = !!post.video_url;

                // --- 1. VIDEO CARD OPTION (No Description Text) ---
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
                      {/* Radial Gradient Hover Overlay */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out z-0"
                        style={{
                          background:
                            "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
                        }}
                      />
                      <div className="px-3.75 py-1.5 h-[50px] md:h-[60px] md:w-[160px] bg-white rounded-full text-[12px] font-medium md:text-[18px] flex justify-center items-center gap-2 text-center text-[#B77145] w-fit max-w-[90%]">
                        <span
                          className="w-[8px] h-[8px] rounded-full inline-block shrink-0"
                          style={{ backgroundColor: tagColor }}
                        />
                        <p className="truncate">
                          {post.community_tags?.name || "General"}
                        </p>
                      </div>

                      {/* Bottom: ONLY Author Name, Time & Play Button */}
                      <div className="flex justify-between items-end w-full z-10 ">
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

                        {/* Play Video Trigger Button */}
                        <button
                          onClick={() => setActiveVideoUrl(post.video_url)}
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
                    className="w-full h-[280px] sm:h-100 bg-[#FFFBF3] rounded-[40px] sm:rounded-4xl mx-auto transition-transform p-5 md:p-5 flex flex-col justify-between"
                  >
                    <div className="flex flex-col gap-4 md:gap-7.5">
                      {/* Tag Pill with Color Dot */}
                      <div className="px-3.75 py-1.5 h-[50px] md:h-[60px] md:w-[160px] bg-white rounded-full text-[12px] font-medium md:text-[18px] flex justify-center items-center gap-2 text-center text-[#B77145] w-fit max-w-[90%]">
                        <span
                          className="w-[8px] h-[8px] rounded-full inline-block shrink-0"
                          style={{ backgroundColor: tagColor }}
                        />
                        <p className="truncate">
                          {post.community_tags?.name || "General"}
                        </p>
                      </div>

                      <div className="text-[15px] md:text-[20px] text-[#B77145] leading-[-120%] font-medium pr-[28px]">
                        <p>{post.content}</p>
                      </div>
                    </div>

                    <div className="flex w-full justify-between items-center text-[#68270B]">
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
                      <div className="bg-[#B77145] h-[40px] w-[40px] md:h-12.5 md:w-12.5 flex justify-center items-center rounded-full">
                        <img src={plus} alt="more" />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <button
            className="mt-12 w-40 h-20 cursor-pointer bg-[#B77145] text-white font-semibold rounded-full text-[14px] mdtext-[16px]"
            onClick={() => setSelectedTagId(null)}
          >
            View All
          </button>
        </section>
      ) : (
        <section className="w-full min-h-125 lg:h-225 flex justify-center items-center relative overflow-hidden">
          <div className="absolute top-65 md:top-10 lg:top-1/2 left-0 md:left-1/2 -translate-x-1/2 lg:-translate-y-1/2 z-10 text-[#B77145] text-center pointer-events-none px-4 w-full">
            <div className="max-w-70 sm:max-w-md md:max-w-xs lg:max-w-xs mx-auto">
              <p className="text-[12px] lg:text-[18px] font-medium w-auto">
                Support, & positive
                <br />
                outcomes real experiences.
              </p>
            </div>
          </div>

          <div className="absolute inset-0 flex justify-center items-center animate-spin-smooth pointer-events-none mt-20 md:mt-40 lg:mt-0">
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
                >
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
                    style={{
                      background:
                        "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
                    }}
                  />
                </div>
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
                >
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
                    style={{
                      background:
                        "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
                    }}
                  />
                </div>
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
                >
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
                    style={{
                      background:
                        "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
                    }}
                  />
                </div>
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
                >
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
                    style={{
                      background:
                        "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
                    }}
                  />
                </div>
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
                >
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
                    style={{
                      background:
                        "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
                    }}
                  />
                </div>
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
                >
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
                    style={{
                      background:
                        "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
                    }}
                  />
                </div>
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
                >
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
                    style={{
                      background:
                        "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
                    }}
                  />
                </div>
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
                >
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
                    style={{
                      background:
                        "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
                    }}
                  />
                </div>
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
                >
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
                    style={{
                      background:
                        "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
                    }}
                  />
                </div>
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
                >
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
                    style={{
                      background:
                        "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.4) 40%, transparent 75%)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* --- Responsive Context Modal Container --- */}
          {isModalOpen && (
            <div
              onClick={() => setIsModalOpen(false)}
              className="pt-30 md:pt-0 fixed inset-0 w-full h-full flex justify-center items-center z-50 bg-black/10 transition-opacity duration-300"
            >
              <div className="relative w-full max-w-150 flex flex-col items-center justify-center gap-3 pb-5 md:pb-0 md:gap-6 px-4">
                {/* Card Stack Container */}
                <div className="relative w-[320px] h-105 lg:w-105 lg:h-125 order-1">
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
                        <>
                          <div className="shrink-0 flex flex-col gap-3.75">
                            <div className="flex flex-col gap-6.25">
                              <div
                                className={`h-10 md:h-12.5 w-40 border rounded-full text-[13px] font-normal lg:text-[13px] ${card.tagClass} flex justify-center items-center text-center bg-[#B77145]`}
                              >
                                <p>{card.tag}</p>
                              </div>
                              <h2
                                className={`text-[18px] lg:text-[28px] font-normal leading-tight ${card.titleClass} w-full lg:w-2/3`}
                              >
                                {card.title}
                              </h2>
                            </div>
                            <div className="flex justify-between items-center text-xs lg:text-[14px] font-medium pb-2">
                              <span>{card.author}</span>
                              <span>{card.time}</span>
                            </div>
                          </div>

                          <div className="flex-1 overflow-y-auto min-h-0 pr-1 mt-6.25 scrollbar-none">
                            <p
                              className={`text-[13px] lg:text-[14px] leading-relaxed lg:leading-[1.6] font-medium ${card.descClass}`}
                            >
                              {card.desc}
                            </p>
                          </div>
                        </>
                      </div>
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
