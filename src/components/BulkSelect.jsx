import { useEffect, useRef } from "react";
import { FaCheckSquare, FaTrash } from "react-icons/fa";

/** Turns a list's multi-select mode on ("Multi Select") and off ("Done"). */
export const SelectModeButton = ({ selection, disabled, className = "" }) => (
  <button
    type="button"
    onClick={selection.active ? selection.stop : selection.start}
    disabled={disabled}
    className={`px-4 py-2 rounded-xl border text-sm font-semibold transition flex items-center gap-2 disabled:opacity-40 ${
      selection.active
        ? "border-brand bg-brand text-white hover:bg-brand-600"
        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
    } ${className}`}
  >
    <FaCheckSquare size={12} />
    {selection.active ? "Done" : "Multi Select"}
  </button>
);

export const SelectCheckbox = ({ checked, indeterminate = false, onChange, label, disabled }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="w-4 h-4 accent-brand cursor-pointer align-middle disabled:cursor-not-allowed"
    />
  );
};

// Header-row checkbox that selects or clears every visible item
export const SelectAllCheckbox = ({ selection, disabled }) => (
  <SelectCheckbox
    checked={selection.allSelected}
    indeterminate={selection.someSelected}
    onChange={selection.toggleAll}
    disabled={disabled}
    label={selection.allSelected ? "Clear selection" : "Select all"}
  />
);

/** Bar shown in multi-select mode, with clear and delete actions. */
export const BulkActionBar = ({ selection, noun, onDelete, busy = false, className = "" }) => {
  if (!selection.active) return null;
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3 ${className}`}
    >
      <p className="text-sm font-medium text-brand">
        {selection.count === 0
          ? `Tick the ${noun} you want to delete.`
          : `${selection.count} selected`}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={selection.clear}
          disabled={busy || selection.count === 0}
          className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-white transition disabled:opacity-40"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy || selection.count === 0}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition flex items-center gap-2 disabled:opacity-40"
        >
          <FaTrash size={11} />
          {busy ? "Deleting..." : `Delete ${selection.count}`}
        </button>
      </div>
    </div>
  );
};
