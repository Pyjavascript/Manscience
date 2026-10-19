import { FaPlus } from "react-icons/fa";
import { UPLOADING } from "./cmsFields";

export const INPUT_BASE =
  "w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-gray-900 placeholder:text-gray-300 transition hover:border-gray-300 focus:outline-none focus:bg-white focus:border-[#5932EA]";

export const ImageField = ({ inputId, value, setValue, uploadImage }) => {
  const isUploading = value === UPLOADING;
  const hasImage = value && !isUploading;
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files[0];
          // Allow picking the same file again later
          e.target.value = "";
          if (!file) return;
          setValue(UPLOADING);
          const url = await uploadImage(file);
          setValue(url || "");
        }}
      />
      {hasImage ? (
        <label htmlFor={inputId} className="block relative cursor-pointer group">
          <img src={value} alt="" className="w-full h-40 object-contain bg-gray-50" />
          <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-sm font-medium">
            Replace image
          </span>
        </label>
      ) : isUploading ? (
        <div className="h-40 flex flex-col items-center justify-center gap-3 bg-gray-50 text-sm text-gray-500">
          <div className="w-6 h-6 border-[3px] border-[#5932EA] border-t-transparent rounded-full animate-spin" />
          Uploading…
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="h-40 m-2 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400 cursor-pointer transition hover:border-[#5932EA]/40 hover:bg-indigo-50/40 hover:text-[#5932EA]"
        >
          <FaPlus size={14} />
          <span className="text-sm font-medium">Upload image</span>
          <span className="text-xs">PNG, JPG, WebP or SVG</span>
        </label>
      )}
      {hasImage && (
        <div className="px-3 py-2 flex items-center justify-between border-t border-gray-100 text-xs">
          <label htmlFor={inputId} className="font-medium text-[#5932EA] cursor-pointer hover:underline">
            Replace
          </label>
          <button type="button" onClick={() => setValue("")} className="font-medium text-red-500 hover:underline">
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

export const Switch = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex items-center gap-2.5 text-sm text-gray-700"
  >
    <span className={`relative w-9 h-5 rounded-full transition ${checked ? "bg-[#5932EA]" : "bg-gray-300"}`}>
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? "translate-x-4" : ""}`}
      />
    </span>
    {label}
  </button>
);
