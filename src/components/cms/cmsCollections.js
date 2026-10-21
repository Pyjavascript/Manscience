// Editor layouts for the Webflow CMS collections managed from the dashboard.
// Each config mirrors its live page top to bottom; pop-ups follow Question → Answer → Images & data.
// Sections with the same `navGroup` share one outline entry in the editor and are shown as tabs.
// Field keys must match the Webflow field slugs exactly (including their typos).

const withFields = (sections) =>
  sections.map((section) => ({
    ...section,
    fields: section.groups.flatMap((group) => group.fields),
  }));

// ---------------------------------------------------------------------------------------------
// Conditions — live page: /conditions/<slug>
// ---------------------------------------------------------------------------------------------
export const CONDITION_COLLECTION_ID = "6a2153b39dd6cbc89e2cd831";

export const CONDITION_SECTIONS = withFields([
  {
    title: "Page Hero",
    fallbackSubtitle: "Top of the condition page",
    groups: [
      {
        title: "Title",
        fields: [
          { key: "name", label: "Condition name", type: "text", required: true, placeholder: "e.g., Sleep disorder", hint: "Used in the menus and to create the page URL" },
          { key: "main-heading", label: "Main heading", type: "textarea", rows: 2, display: "title", placeholder: "Sleep\nDisorder", hint: "The big title. Press Enter to split it onto two lines" },
          { key: "heading-large-2", label: "Tagline", type: "textarea", rows: 2, display: "heading", hint: "Large line under the title" },
        ],
      },
      {
        title: "Intro",
        fields: [
          { key: "heading-description", label: "Intro paragraph", type: "textarea", rows: 4 },
        ],
      },
      {
        title: "Images",
        fields: [
          { key: "hero-image-desktop", label: "Hero image — desktop", type: "image" },
          { key: "hero-image-mobile", label: "Hero image — mobile", type: "image" },
        ],
      },
    ],
  },
  {
    title: "Pop-up 1",
    navGroup: "Pop-ups",
    labelKey: "pop---question-1",
    fallbackSubtitle: "What is …?",
    groups: [
      {
        title: "Question",
        fields: [
          { key: "pop---question-1", label: "Button text", type: "text", placeholder: "What Is Sleep Disorder ?", hint: "The hero button that opens this pop-up" },
          { key: "modal-1-badge", label: "Badge", type: "text", placeholder: "About Sleep disorder", hint: "Small label at the top of the pop-up" },
          { key: "modal-1-question", label: "Question", type: "text", display: "heading", placeholder: "What is Sleep disorder ?" },
        ],
      },
      {
        title: "Answer",
        fields: [
          { key: "modal-1-question-description", label: "Short intro", type: "textarea", rows: 2, hint: "One line shown above the image" },
          { key: "modal-1-answer", label: "Answer — paragraph 1", type: "textarea", rows: 6 },
          { key: "modal-1-answer-2", label: "Answer — paragraph 2", type: "textarea", rows: 6, hint: "Shown after the stats graphics" },
        ],
      },
      {
        title: "Images",
        fields: [
          { key: "modal-1-image", label: "Pop-up image — desktop", type: "image" },
          { key: "modal-1-image-mobile", label: "Pop-up image — mobile", type: "image" },
          { key: "modal-1-highlight-image-desktop", label: "Video thumbnail — desktop", type: "image" },
          { key: "modal-1-highlight-image-mobile", label: "Video thumbnail — mobile", type: "image" },
        ],
      },
      {
        title: "Follow-up question",
        description: "Shown below the video",
        fields: [
          { key: "highlight-image-quesiton", label: "Question", type: "text", display: "heading", placeholder: "What does Sleep disorder look like?" },
          { key: "highlight-image-answer", label: "Answer", type: "textarea", rows: 4 },
        ],
      },
    ],
  },
  {
    title: "Pop-up 2",
    navGroup: "Pop-ups",
    labelKey: "pop-question-3",
    fallbackSubtitle: "Core signs",
    note: "The numbered signs inside this pop-up aren't fields on this CMS item, so they can't be edited here.",
    groups: [
      {
        title: "Question",
        fields: [
          { key: "pop-question-3", label: "Button text", type: "text", placeholder: "Core Signs", hint: "The hero button and the pop-up title" },
        ],
      },
      {
        title: "Answer",
        fields: [
          { key: "core-symptoms-description", label: "Description", type: "textarea", rows: 4, hint: "Not currently shown on the live page" },
        ],
      },
    ],
  },
  {
    title: "Pop-up 3",
    navGroup: "Pop-ups",
    labelKey: "pop-question-4",
    fallbackSubtitle: "What causes …?",
    note: "The numbered cause cards inside this pop-up aren't fields on this CMS item, so they can't be edited here.",
    groups: [
      {
        title: "Question",
        fields: [
          { key: "pop-question-4", label: "Button text", type: "text", placeholder: "What Causes Sleep Disorder?", hint: "The hero button and the pop-up title" },
        ],
      },
    ],
  },
  {
    title: "Pop-up 4",
    navGroup: "Pop-ups",
    labelKey: "pop-question-5",
    fallbackSubtitle: "When to seek help",
    groups: [
      {
        title: "Question",
        fields: [
          { key: "pop-question-5", label: "Button text", type: "text", placeholder: "When to Seek Help", hint: "The hero button and the pop-up title" },
        ],
      },
      {
        title: "Answer",
        fields: [
          { key: "modal-4-description", label: "Answer", type: "textarea", rows: 10, hint: "Put each point on its own line" },
        ],
      },
      {
        title: "Images & data",
        fields: [
          { key: "tabs-1", label: "Image caption 1", type: "text", placeholder: "Poor sleep" },
          { key: "tabs-2", label: "Image caption 2", type: "text", placeholder: "Tired after sleeping" },
          { key: "tabs-3", label: "Image caption 3", type: "text", placeholder: "Snoring with pause" },
          { key: "tabs-4", label: "Image caption 4", type: "text", placeholder: "Daytime sleepiness" },
          { key: "modal-4-image-desktop", label: "Image — desktop", type: "image" },
          { key: "modal-4-image-mobile", label: "Image — mobile", type: "image" },
        ],
      },
    ],
  },
  {
    title: "Stats",
    fallbackSubtitle: "Global stats section",
    note: "Stat numbers and graphics aren't editable here yet.",
    groups: [
      {
        title: "Labels",
        fields: [
          { key: "stats-label-1", label: "Stat label 1", type: "text", placeholder: "Globally" },
          { key: "stats-label-2", label: "Stat label 2", type: "text", placeholder: "In India" },
          { key: "stats-label-3", label: "Stat label 3", type: "text", placeholder: "Older Adults" },
          { key: "stats-label-4", label: "Stat label 4", type: "text", placeholder: "Undiagnosed" },
        ],
      },
    ],
  },
]);

// Fields shown in the view modal's hero header instead of in its sections
export const CONDITION_VIEW_HEADER = {
  imageKey: "hero-image-desktop",
  titleKey: "main-heading",
  subtitleKey: "heading-large-2",
  descriptionKey: "heading-description",
};

// ---------------------------------------------------------------------------------------------
// Celebrities — the "Meet the Changemakers" carousel on each condition page.
// A celebrity shows on the condition whose name matches its "filter-tag".
// ---------------------------------------------------------------------------------------------
export const CELEBRITY_COLLECTION_ID = "6ab4efc993c2157f92fa99e8";

export const CELEBRITY_FIELDS = [
  { key: "name", label: "Name", type: "text", required: true, placeholder: "e.g., George Clooney" },
  { key: "occupation", label: "Occupation", type: "text", placeholder: "Actor", hint: "Small tag on the card" },
  { key: "actors-quote", label: "Card heading", type: "text", placeholder: "Every Brain Has a Story Worth Understanding." },
  { key: "actors-statement", label: "Their story", type: "textarea", rows: 4 },
  { key: "actors-image", label: "Photo — desktop", type: "image" },
  { key: "acotrs-image-mobile", label: "Photo — mobile", type: "image" },
  { key: "sort-order", label: "Sort order", type: "number", placeholder: "e.g., 1", hint: "Lower numbers appear first" },
  // Set from the condition being edited, not typed in
  { key: "filter-tag", label: "Condition", type: "text", hidden: true },
];

// ---------------------------------------------------------------------------------------------
// Therapies — live page: /post/<slug>
// ---------------------------------------------------------------------------------------------
export const THERAPY_COLLECTION_ID = "6a19c17541e0a2e267e7184f";
// Options for the therapy's "main-categories" Reference field
export const THERAPY_CATEGORY_COLLECTION_ID = "6a1c7c260e4017306f072008";

export const THERAPY_SECTIONS = withFields([
  {
    title: "Page Hero",
    fallbackSubtitle: "Top of the therapy page",
    groups: [
      {
        title: "Title",
        fields: [
          { key: "name", label: "Therapy name", type: "text", required: true, placeholder: "e.g., Alexandra Dunnison", hint: "Used in the menus and to create the page URL" },
          { key: "therapy-subtitle", label: "Small heading", type: "text", placeholder: "Cognitive Listening", hint: "Shown above the title" },
          { key: "title-name", label: "Title", type: "text", display: "title", placeholder: "Alexandra Dunnison", hint: "The big title of the page" },
        ],
      },
      {
        title: "Images",
        fields: [
          { key: "image-hero-desktop", label: "Hero image — desktop", type: "image" },
          { key: "image-hero-mobile", label: "Hero image — mobile", type: "image" },
          { key: "tomatis-logo", label: "Logo", type: "image", hint: "Shown under the hero image (SVG works best)" },
        ],
      },
      {
        title: "Stats",
        fields: [
          { key: "year-established", label: "Year established", type: "text", placeholder: "2017" },
          { key: "countries-worldwide", label: "Countries worldwide", type: "text", placeholder: "5+" },
          { key: "lives-transformed", label: "Lives transformed", type: "text", placeholder: "100+" },
        ],
      },
    ],
  },
  {
    title: "Introduction",
    labelKey: "therapy-type",
    fallbackSubtitle: "Intro below the stats",
    groups: [
      {
        title: "Text",
        fields: [
          { key: "therapy-type", label: "Heading", type: "text", display: "heading", placeholder: "Alexandra Dunnison" },
          { key: "therapy-type-description", label: "Description", type: "textarea", rows: 5 },
        ],
      },
    ],
  },
  {
    title: "Pop-up 1",
    navGroup: "Pop-ups",
    labelKey: "card-1-title",
    fallbackSubtitle: "What is …?",
    groups: [
      {
        title: "Question",
        fields: [
          { key: "card-1-title", label: "Question", type: "text", display: "heading", placeholder: "What Is Cognitive Consultancy?", hint: "The card title and the pop-up heading" },
        ],
      },
      {
        title: "Answer",
        fields: [
          { key: "what-are-therapy-thingy", label: "Answer", type: "richtext", rows: 8, hint: "Leave a blank line between paragraphs" },
        ],
      },
    ],
  },
  {
    title: "Pop-up 2",
    navGroup: "Pop-ups",
    labelKey: "card-2-title",
    fallbackSubtitle: "How it helps",
    groups: [
      {
        title: "Question",
        fields: [
          { key: "card-2-title", label: "Question", type: "text", display: "heading", placeholder: "How Alexandra Helps?", hint: "The card title and the pop-up heading" },
        ],
      },
      {
        title: "Answer",
        fields: [
          { key: "how-mnri-helps", label: "Answer", type: "richtext", rows: 8, hint: "Leave a blank line between paragraphs" },
        ],
      },
    ],
  },
  {
    title: "Pop-up 3",
    navGroup: "Pop-ups",
    labelKey: "dr-name",
    fallbackSubtitle: "About the expert",
    groups: [
      {
        title: "Expert",
        fields: [
          { key: "dr-name", label: "Expert name", type: "text", display: "heading", placeholder: "Dr. Alexandra Dunnison", hint: "The card title and the pop-up heading" },
          { key: "pop-up-badge", label: "Badge", type: "text", placeholder: "Life Changer" },
        ],
      },
      {
        title: "Bio",
        fields: [
          { key: "doctors-highlights-description", label: "Bio", type: "textarea", rows: 6 },
        ],
      },
      {
        title: "Images & highlights",
        fields: [
          { key: "medal-1", label: "Highlight 1", type: "text", placeholder: "Harvard Alumna" },
          { key: "medal-2", label: "Highlight 2", type: "text", placeholder: "35+ Years in Education" },
          { key: "medal-3", label: "Highlight 3", type: "text", placeholder: "Cognitive Consultant" },
          { key: "medal-4", label: "Highlight 4", type: "text", placeholder: "Arrowsmith Lead" },
          { key: "image-pop-up", label: "Pop-up image", type: "image" },
          { key: "doctors-image", label: "Expert photo", type: "image" },
        ],
      },
    ],
  },
  {
    title: "Focus Areas",
    fallbackSubtitle: "The numbered carousel",
    groups: [
      {
        title: "Areas",
        fields: [
          { key: "pointer-1", label: "Area 1", type: "text", placeholder: "Learning Differences" },
          { key: "pointer-2", label: "Area 2", type: "text", placeholder: "Memory & Attention" },
          { key: "pointer-3", label: "Area 3", type: "text", placeholder: "Emotional Regulation" },
          { key: "pointer-4", label: "Area 4", type: "text", placeholder: "Autism Spectrum Support" },
          { key: "pointer-5", label: "Area 5", type: "text", placeholder: "Processing Skills" },
          { key: "pointer-6", label: "Area 6", type: "text", placeholder: "Reading & Writing" },
          { key: "pointer-7", label: "Area 7", type: "text", placeholder: "Listening & Comprehension" },
          { key: "pointer-8", label: "Area 8", type: "text", placeholder: "Planning & Reasoning" },
        ],
      },
    ],
  },
  {
    title: "Video Banner",
    labelKey: "banner-title",
    fallbackSubtitle: "Session video banner",
    groups: [
      {
        title: "Text",
        fields: [
          { key: "banner-title", label: "Title", type: "text", display: "heading", placeholder: "Virtual Tour into our Session" },
          { key: "banner-description", label: "Description", type: "textarea", rows: 3 },
        ],
      },
      {
        title: "Video & images",
        fields: [
          { key: "video-1-link", label: "Video link", type: "url", placeholder: "https://…", hint: "Opened by the play button" },
          { key: "video-highlights-desktop", label: "Banner image — desktop", type: "image" },
          { key: "video-highlight-mobile", label: "Banner image — mobile", type: "image" },
        ],
      },
    ],
  },
  {
    title: "Listing & Links",
    fallbackSubtitle: "Therapy library card and extra links",
    note: "The testimonials section on the live page isn't stored on this CMS item, so it can't be edited here.",
    groups: [
      {
        title: "Therapy library",
        fields: [
          { key: "main-categories", label: "Main category", type: "select", placeholder: "Choose a category" },
          { key: "hero-image", label: "Card image", type: "image", hint: "Thumbnail used on therapy cards" },
          { key: "featured", label: "Featured", type: "switch", hint: "Highlight this therapy in listings" },
          { key: "sort-order", label: "Sort order", type: "number", placeholder: "e.g., 1", hint: "Lower numbers appear first" },
        ],
      },
      {
        title: "Links",
        fields: [
          { key: "therapy-source-link", label: "Source link", type: "url", placeholder: "https://…" },
          { key: "link-poadcast", label: "Podcast link", type: "url", placeholder: "https://…" },
          { key: "poadcast-2", label: "Podcast link 2", type: "url", placeholder: "https://…" },
        ],
      },
    ],
  },
]);

export const THERAPY_VIEW_HEADER = {
  imageKey: "image-hero-desktop",
  kickerKey: "therapy-subtitle",
  titleKey: "title-name",
  descriptionKey: "therapy-type-description",
};

// ---------------------------------------------------------------------------------------------
// Research Digest — the blog and podcast cards. Each card links out to `redireciton-links`.
// The dashboard reads the collection schema to find which collections the Reference fields
// point to; the ids below are used when the schema can't be loaded.
// ---------------------------------------------------------------------------------------------
export const BLOG_COLLECTION_ID = "6a23cdf5d3cdf3ce98515784";
// Options for "filter-tag": Podcast, Research paper, Latest News, Blogs, Socials
export const BLOG_FILTER_COLLECTION_ID = "6a4aa84d077e14e002702657";
// Options for the card style ("Blogs" or "Podcast"), stored in both "cta-image" and "gradient-image"
export const BLOG_STYLE_COLLECTION_ID = "6a4a29998a1508d3ea0976f9";

export const BLOG_SECTIONS = withFields([
  {
    title: "Card",
    labelKey: "name",
    fallbackSubtitle: "Title, author and link",
    groups: [
      {
        title: "Text",
        fields: [
          { key: "name", label: "Title", type: "text", required: true, placeholder: "e.g., Handwriting Disorders in School-Aged Children", hint: "Also used to create the item's URL" },
          { key: "hero-text", label: "Hero text", type: "textarea", rows: 2, display: "heading", placeholder: "Handwriting Disorders in School-Aged Children" },
          { key: "therapy-name", label: "Condition / therapy", type: "text", placeholder: "e.g., Dysgraphia", hint: "Small label on the card" },
          { key: "authors-name", label: "Author", type: "text", placeholder: "e.g., Clémence Lopez, et al." },
          { key: "time-to-read-2", label: "Date", type: "text", placeholder: "e.g., Sep 6, 2023", hint: "Shown exactly as typed" },
        ],
      },
      {
        title: "Link",
        fields: [
          { key: "redireciton-links", label: "Link", type: "url", placeholder: "https://…", hint: "Article, paper or YouTube video the card opens" },
        ],
      },
    ],
  },
  {
    title: "Filter & Style",
    fallbackSubtitle: "Where it's listed and how it looks",
    groups: [
      {
        title: "Filter",
        fields: [
          { key: "filter-tag", label: "Filter tag", type: "select", placeholder: "No filter", hint: "The filter this card shows under" },
        ],
      },
      {
        title: "Card style",
        fields: [
          { key: "cta-image", label: "Card style", type: "select", placeholder: "No style", hint: "Pick Podcast for videos and Blogs for articles" },
        ],
      },
    ],
  },
  {
    title: "Images",
    fallbackSubtitle: "Card images",
    groups: [
      {
        title: "Images",
        fields: [
          { key: "image", label: "Image — desktop", type: "image" },
          { key: "blogs-mobile", label: "Image — mobile", type: "image" },
          { key: "image-thumbnail-mobile", label: "Thumbnail — mobile", type: "image" },
          { key: "podcast-cta-main", label: "Podcast thumbnail", type: "image", hint: "Cover image for podcast and video cards" },
        ],
      },
    ],
  },
  {
    title: "Body",
    fallbackSubtitle: "Optional long text",
    groups: [
      {
        title: "Text",
        fields: [
          { key: "rich-text-1", label: "Body — part 1", type: "richtext", rows: 8, hint: "Leave a blank line between paragraphs" },
          { key: "rich-text-2-2", label: "Body — part 2", type: "richtext", rows: 8, hint: "Leave a blank line between paragraphs" },
        ],
      },
    ],
  },
]);

// Mirrors "cta-image"; saved alongside it rather than edited on its own
export const BLOG_GRADIENT_FIELD = { key: "gradient-image", label: "Card gradient", type: "select" };

export const BLOG_VIEW_HEADER = {
  imageKey: "image",
  kickerKey: "therapy-name",
  titleKey: "name",
};

// Used for the filter editor when the filter collection's schema can't be loaded
export const BLOG_FILTER_FALLBACK_FIELDS = [
  { key: "name", label: "Filter name", type: "text", required: true, placeholder: "e.g., Podcast" },
  { key: "representation-color", label: "Dot color", type: "color", hint: "Colored dot shown on the blog cards" },
];
