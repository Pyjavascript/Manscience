import { FaEdit, FaGlobe, FaTimes } from "react-icons/fa";
import { hasUnpublishedChanges } from "./cmsFields";

const isEmptyValue = (v) =>
  v === null ||
  v === undefined ||
  (typeof v === "string" && !v.replace(/<[^>]*>/g, "").trim()) ||
  (typeof v === "object" && !Array.isArray(v) && "url" in v && !v.url);

const formatDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/**
 * Read-only view of a Webflow CMS item: a hero header (from `header` keys) followed by the
 * same sections as the editor, hiding empty fields.
 */
const CmsItemViewModal = ({
  item,
  sections,
  header,
  itemLabel,
  selectLabels = {},
  publishing,
  onPublish,
  onEdit,
  onClose,
}) => {
  const data = item.fieldData || {};
  const headerKeys = new Set(["name", ...Object.values(header)]);
  const knownKeys = new Set(["slug", ...sections.flatMap((s) => s.fields.map((f) => f.key))]);
  // Webflow fields not in the editor config (e.g. svg animations, stat numbers)
  const otherEntries = Object.entries(data).filter(([k, v]) => !knownKeys.has(k) && !isEmptyValue(v));
  const unpublished = hasUnpublishedChanges(item);
  const heroImage = data[header.imageKey]?.url;

  const renderShortValue = (field) => {
    const value = data[field.key];
    if (field.type === "switch") return value ? "Yes" : "No";
    if (field.type === "select") return selectLabels[field.key]?.get(value) || value;
    if (field.type === "url")
      return (
        <a href={value} target="_blank" rel="noreferrer" className="text-[#5932EA] underline break-all">
          {value}
        </a>
      );
    return String(value);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-[1px]">
      <div className="bg-white w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] rounded-3xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center gap-4">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 capitalize">{itemLabel}</p>
            <h3 className="text-base font-semibold text-gray-800 truncate">{data.name}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {unpublished && (
              <button
                onClick={() => onPublish(item)}
                disabled={publishing}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition flex items-center gap-2 disabled:opacity-50"
              >
                <FaGlobe size={13} />
                {publishing ? "Publishing..." : "Publish"}
              </button>
            )}
            <button
              onClick={() => onEdit(item)}
              className="px-4 py-2 bg-[#5932EA] hover:bg-[#4826c9] text-white text-sm font-medium rounded-xl transition flex items-center gap-2"
            >
              <FaEdit size={13} /> Edit
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              <FaTimes size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto">
          <div className="p-6 sm:p-8 space-y-5">
            {heroImage && (
              <img
                src={heroImage}
                alt={data.name || ""}
                className="w-full h-56 sm:h-72 object-cover rounded-2xl bg-gray-100"
              />
            )}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-mono">/{data.slug}</span>
              <span
                className={`px-2.5 py-1 rounded-full ${unpublished ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}
              >
                {!item.lastPublished
                  ? "Not published"
                  : unpublished
                    ? "Unpublished changes"
                    : `Live · published ${formatDate(item.lastPublished)}`}
              </span>
              {item.lastUpdated && (
                <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  Updated {formatDate(item.lastUpdated)}
                </span>
              )}
            </div>
            {header.kickerKey && data[header.kickerKey] && (
              <p className="text-sm font-semibold uppercase tracking-wider text-[#5932EA]">
                {data[header.kickerKey]}
              </p>
            )}
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-tight whitespace-pre-line">
              {data[header.titleKey] || data.name}
            </h1>
            {header.subtitleKey && data[header.subtitleKey] && (
              <p className="text-xl sm:text-2xl font-medium text-gray-700 leading-snug whitespace-pre-line">
                {data[header.subtitleKey]}
              </p>
            )}
            {header.descriptionKey && data[header.descriptionKey] && (
              <p className="text-base text-gray-600 leading-relaxed max-w-prose whitespace-pre-line">
                {data[header.descriptionKey]}
              </p>
            )}
          </div>

          {sections.map((section) => {
            const fields = section.fields.filter(
              (f) => !headerKeys.has(f.key) && (f.type === "switch" || !isEmptyValue(data[f.key])),
            );
            if (fields.length === 0) return null;
            const shortFields = fields.filter(
              (f) => ["text", "number", "url", "switch", "select"].includes(f.type) && !f.display,
            );
            const longFields = fields.filter(
              (f) => f.type === "textarea" || f.type === "richtext" || f.display,
            );
            const imageFields = fields.filter((f) => f.type === "image");

            return (
              <section key={section.title} className="px-6 sm:px-8 py-7 border-t border-gray-100 space-y-6">
                <h2 className="text-sm font-semibold text-[#5932EA]">
                  {section.title}
                  <span className="text-gray-400 font-normal">
                    {" "}
                    · {(section.labelKey && data[section.labelKey]) || section.fallbackSubtitle}
                  </span>
                </h2>

                {shortFields.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {shortFields.map((field) => (
                      <div key={field.key} className="bg-gray-50 rounded-xl px-4 py-3 min-w-0">
                        <p className="text-xs text-gray-400 mb-0.5">{field.label}</p>
                        <p className="text-sm font-medium text-gray-800 break-words">
                          {renderShortValue(field)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {longFields.map((field) => (
                  <div key={field.key}>
                    <p className="text-xs text-gray-400 mb-1.5">{field.label}</p>
                    {field.type === "richtext" ? (
                      <div
                        className="max-w-prose text-[15px] leading-7 text-gray-700 [&_p]:mb-3 [&_a]:text-[#5932EA] [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: data[field.key] }}
                      />
                    ) : (
                      <p
                        className={`whitespace-pre-line max-w-prose ${
                          field.display === "title"
                            ? "text-3xl font-bold tracking-tight leading-tight text-gray-900"
                            : field.display === "heading"
                              ? "text-xl font-semibold leading-snug text-gray-900"
                              : "text-[15px] leading-7 text-gray-700"
                        }`}
                      >
                        {data[field.key]}
                      </p>
                    )}
                  </div>
                ))}

                {imageFields.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {imageFields.map((field) => (
                      <figure key={field.key}>
                        <a href={data[field.key].url} target="_blank" rel="noreferrer">
                          <img
                            src={data[field.key].url}
                            alt={data[field.key].alt || ""}
                            className="w-full h-44 object-contain rounded-xl bg-gray-100"
                          />
                        </a>
                        <figcaption className="text-xs text-gray-400 mt-1.5">{field.label}</figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {otherEntries.length > 0 && (
            <details className="px-6 sm:px-8 py-5 border-t border-gray-100 text-sm">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-gray-400">
                Other Webflow fields ({otherEntries.length})
              </summary>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {otherEntries.map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-gray-400 font-mono mb-1">{key}</p>
                    {typeof value === "object" && value.url ? (
                      <a href={value.url} target="_blank" rel="noreferrer" className="text-[#5932EA] underline break-all">
                        {value.url}
                      </a>
                    ) : (
                      <p className="text-gray-700 break-all">
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

export default CmsItemViewModal;
