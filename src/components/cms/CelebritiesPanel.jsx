import { useState } from "react";
import { FaEdit, FaPlus, FaTrash, FaUser } from "react-icons/fa";
import { CELEBRITY_COLLECTION_ID, CELEBRITY_FIELDS } from "./cmsCollections";
import { deleteCmsItem, saveCmsItem } from "./cmsApi";
import { UPLOADING, hasUnpublishedChanges, slugify, toFormState } from "./cmsFields";
import { INPUT_BASE, ImageField } from "./CmsControls";

const normalize = (text) => String(text ?? "").trim().toLowerCase();

// Same order as the carousel: sort order first (blank last), then name
const bySortOrder = (a, b) => {
  const sa = a.fieldData?.["sort-order"] ?? Infinity;
  const sb = b.fieldData?.["sort-order"] ?? Infinity;
  return sa - sb || String(a.fieldData?.name).localeCompare(String(b.fieldData?.name));
};

// Webflow slugs must be unique, and the same person can appear under several conditions
const uniqueSlug = (name, items) => {
  const taken = new Set(items.map((item) => item.fieldData?.slug));
  const base = slugify(name) || "celebrity";
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
};

export const celebritiesForCondition = (celebrities, conditionName) =>
  celebrities
    .filter((item) => normalize(item.fieldData?.["filter-tag"]) === normalize(conditionName))
    .sort(bySortOrder);

/**
 * Lists, creates, edits and deletes the celebrities shown on one condition page. Rendered
 * inside the condition editor, so every button is type="button" to avoid saving that form.
 */
const CelebritiesPanel = ({
  conditionName,
  celebrities,
  loading,
  uploadImage,
  publishOnSave,
  onChanged,
}) => {
  // null while listing, otherwise { item } (item is null for a new celebrity)
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  if (!conditionName) {
    return (
      <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
        Save this condition first, then come back here to add its celebrities.
      </p>
    );
  }

  const list = celebritiesForCondition(celebrities, conditionName);
  const visibleFields = CELEBRITY_FIELDS.filter((f) => !f.hidden);

  const openEditor = (item) => {
    const values = toFormState(item?.fieldData || {}, CELEBRITY_FIELDS);
    if (!item) {
      values["filter-tag"] = conditionName;
      values["sort-order"] = String(list.length + 1);
    }
    setForm(values);
    setEditing({ item });
  };

  const handleSave = async () => {
    if (!String(form.name ?? "").trim()) {
      alert('Please fill in "Name" before saving.');
      return;
    }
    if (Object.values(form).includes(UPLOADING)) {
      alert("Please wait for your images to finish uploading.");
      return;
    }
    try {
      setSaving(true);
      const result = await saveCmsItem({
        collectionId: CELEBRITY_COLLECTION_ID,
        fields: CELEBRITY_FIELDS,
        form,
        editingItem: editing.item,
        publish: publishOnSave,
        slug: editing.item ? undefined : uniqueSlug(form.name, celebrities),
      });
      if (result.unchanged) {
        alert("No changes to save.");
        return;
      }
      alert(result.message);
      setEditing(null);
      onChanged();
    } catch (err) {
      alert(`Failed saving celebrity: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (
      !window.confirm(
        `Delete ${String(item.fieldData?.name).trim()}? They will also be removed from the website. This operation is permanent.`,
      )
    )
      return;
    try {
      setSaving(true);
      await deleteCmsItem(CELEBRITY_COLLECTION_ID, item.id);
      onChanged();
    } catch (err) {
      alert(`Error deleting celebrity: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="text-sm font-medium text-gray-500 hover:text-gray-800"
        >
          ← All celebrities
        </button>
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <h5 className="text-lg font-semibold text-gray-900">
            {editing.item ? String(editing.item.fieldData?.name).trim() : "New celebrity"}
          </h5>
          <span className="text-xs font-medium text-brand bg-brand-50 border border-brand-100 px-2.5 py-0.5 rounded-full">
            Shows on: {conditionName}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
          {visibleFields.map((field) => {
            const inputId = `celebrity-${field.key}`;
            const value = form[field.key] ?? "";
            const setValue = (v) => setForm((prev) => ({ ...prev, [field.key]: v }));
            const fullWidth = field.type === "textarea" || field.key === "name" || field.key === "actors-quote";
            return (
              <div key={field.key} className={fullWidth ? "sm:col-span-2" : ""}>
                <label htmlFor={inputId} className="text-sm font-medium text-gray-800">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {field.hint && <p className="text-xs text-gray-400 mt-0.5">{field.hint}</p>}
                <div className="mt-2">
                  {field.type === "image" ? (
                    <ImageField inputId={inputId} value={value} setValue={setValue} uploadImage={uploadImage} />
                  ) : field.type === "textarea" ? (
                    <textarea
                      id={inputId}
                      rows={field.rows || 4}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={field.placeholder}
                      className={`${INPUT_BASE} text-[15px] leading-relaxed resize-y`}
                    />
                  ) : (
                    <input
                      id={inputId}
                      type={field.type === "number" ? "number" : "text"}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={field.placeholder}
                      className={`${INPUT_BASE} text-[15px]`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-brand hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40"
          >
            {saving
              ? "Saving..."
              : `${editing.item ? "Save celebrity" : "Add celebrity"}${publishOnSave ? " & publish" : " as draft"}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {loading
            ? "Loading celebrities…"
            : `${list.length} ${list.length === 1 ? "celebrity" : "celebrities"} in the carousel, in this order.`}
        </p>
        <button
          type="button"
          onClick={() => openEditor(null)}
          disabled={saving}
          className="px-4 py-2 bg-brand hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition flex items-center gap-2 shrink-0 disabled:opacity-40"
        >
          <FaPlus size={11} /> Add celebrity
        </button>
      </div>

      {!loading && list.length === 0 && (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-gray-200 px-6 py-10 text-center text-sm text-gray-400">
          No celebrities on this page yet.
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {list.map((item) => {
          const data = item.fieldData || {};
          const photo = data["actors-image"]?.url;
          const unpublished = hasUnpublishedChanges(item);
          return (
            <li key={item.id} className="flex gap-4 rounded-2xl border border-gray-200 p-3 bg-white">
              {photo ? (
                <img src={photo} alt="" className="w-20 h-24 rounded-xl object-cover bg-gray-100 shrink-0" />
              ) : (
                <div className="w-20 h-24 rounded-xl bg-gray-100 text-gray-300 flex items-center justify-center shrink-0">
                  <FaUser size={22} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{String(data.name).trim()}</p>
                  {data.occupation && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {data.occupation}
                    </span>
                  )}
                  {unpublished && (
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      {item.lastPublished ? "Unpublished changes" : "Draft"}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{data["actors-statement"]}</p>
                <p className="mt-1 text-xs text-gray-400">
                  Sort order: {data["sort-order"] ?? "—"}
                </p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditor(item)}
                  disabled={saving}
                  className="p-2 text-brand hover:bg-brand-50 rounded-lg transition"
                  title="Edit"
                >
                  <FaEdit size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={saving}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Delete"
                >
                  <FaTrash size={13} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CelebritiesPanel;
