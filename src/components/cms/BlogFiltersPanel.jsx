import { useState } from "react";
import { FaEdit, FaPlus, FaTimes, FaTrash } from "react-icons/fa";
import { deleteCmsItem, saveCmsItem } from "./cmsApi";
import { UPLOADING, hasUnpublishedChanges, toFormState, uniqueSlug } from "./cmsFields";
import { INPUT_BASE, ImageField, Switch } from "./CmsControls";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const FilterChip = ({ active, color, label, count, onClick, children }) => (
  <div
    className={`inline-flex items-center rounded-full border text-sm transition ${
      active ? "bg-brand text-white border-brand" : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
    }`}
  >
    <button type="button" onClick={onClick} className="pl-3.5 pr-3 py-1.5 flex items-center gap-2">
      {color !== undefined && (
        <span
          className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
          style={{ backgroundColor: color || "transparent" }}
        />
      )}
      <span className="font-medium whitespace-nowrap">{label}</span>
      <span className={`text-xs ${active ? "text-white/80" : "text-gray-400"}`}>{count}</span>
    </button>
    {children}
  </div>
);

/**
 * The Research Digest filter tags: chips that filter the blog list, plus creating, editing and
 * deleting the tags themselves. `fields` comes from the filter collection's schema.
 */
const BlogFiltersPanel = ({
  filters,
  fields,
  collectionId,
  loading,
  countsByFilter,
  totalCount,
  unlinkedCount,
  activeFilter,
  onSelect,
  sharedWithTherapies,
  uploadImage,
  publishOnSave,
  onChanged,
}) => {
  // null while listing, otherwise { item } (item is null for a new filter)
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const colorKey = fields.find((f) => f.type === "color")?.key;

  const openEditor = (item) => {
    setForm(toFormState(item?.fieldData || {}, fields));
    setEditing({ item });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const missing = fields.find((f) => f.required && !String(form[f.key] ?? "").trim());
    if (missing) {
      alert(`Please fill in "${missing.label}" before saving.`);
      return;
    }
    if (Object.values(form).includes(UPLOADING)) {
      alert("Please wait for your images to finish uploading.");
      return;
    }
    try {
      setSaving(true);
      const result = await saveCmsItem({
        collectionId,
        fields,
        form,
        editingItem: editing.item,
        publish: publishOnSave,
        slug: editing.item ? undefined : uniqueSlug(form.name, filters, "filter"),
      });
      if (result.unchanged) {
        alert("No changes to save.");
        return;
      }
      alert(result.message);
      setEditing(null);
      onChanged();
    } catch (err) {
      alert(`Failed saving filter: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const name = String(item.fieldData?.name ?? "").trim();
    const used = countsByFilter.get(item.id) || 0;
    const warnings = [
      used > 0 && `${used} blog${used === 1 ? " uses" : "s use"} this filter and will be left without one.`,
      sharedWithTherapies && "This list is also used for therapy categories, so it will be removed there too.",
    ].filter(Boolean);
    if (
      !window.confirm(
        [`Delete the "${name}" filter? It will also be removed from the website.`, ...warnings, "This operation is permanent."].join("\n\n"),
      )
    )
      return;
    try {
      setSaving(true);
      await deleteCmsItem(collectionId, item.id);
      if (activeFilter === item.id) onSelect("all");
      onChanged();
    } catch (err) {
      alert(`Error deleting filter: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field) => {
    const inputId = `filter-${field.key}`;
    const value = form[field.key] ?? (field.type === "switch" ? false : "");
    const setValue = (v) => setForm((prev) => ({ ...prev, [field.key]: v }));
    let control;
    if (field.type === "color") {
      control = (
        <div className="flex items-center gap-3">
          <input
            type="color"
            aria-label={`${field.label} picker`}
            value={HEX_COLOR.test(value) ? value : "#000000"}
            onChange={(e) => setValue(e.target.value)}
            className="w-12 h-12 rounded-xl border border-gray-200 bg-white p-1 cursor-pointer shrink-0"
          />
          <input
            id={inputId}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="#f5c542"
            className={`${INPUT_BASE} text-[15px] font-mono`}
          />
        </div>
      );
    } else if (field.type === "image") {
      control = <ImageField inputId={inputId} value={value} setValue={setValue} uploadImage={uploadImage} />;
    } else if (field.type === "switch") {
      control = <Switch checked={!!value} onChange={setValue} label={value ? "Yes" : "No"} />;
    } else if (field.type === "richtext") {
      control = (
        <textarea
          id={inputId}
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`${INPUT_BASE} text-[15px] leading-relaxed resize-y`}
        />
      );
    } else {
      control = (
        <input
          id={inputId}
          type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={field.placeholder}
          className={`${INPUT_BASE} text-[15px]`}
        />
      );
    }
    return (
      <div key={field.key}>
        <label htmlFor={inputId} className="text-sm font-medium text-gray-800">
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {field.hint && <p className="text-xs text-gray-400 mt-0.5">{field.hint}</p>}
        <div className="mt-2">{control}</div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Filter tags</h3>
          <p className="text-sm text-gray-500">
            {loading ? "Loading filters…" : "Click a filter to show only its blogs."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openEditor(null)}
          disabled={saving}
          className="px-4 py-2 rounded-xl border border-brand/30 bg-brand-50 text-sm font-semibold text-brand hover:bg-brand-100 transition flex items-center gap-2 disabled:opacity-40"
        >
          <FaPlus size={11} /> New filter
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <FilterChip active={activeFilter === "all"} label="All" count={totalCount} onClick={() => onSelect("all")} />
        {filters.map((item) => {
          const data = item.fieldData || {};
          const active = activeFilter === item.id;
          return (
            <FilterChip
              key={item.id}
              active={active}
              color={colorKey ? data[colorKey] : undefined}
              label={
                <>
                  {String(data.name ?? "").trim() || "Untitled"}
                  {hasUnpublishedChanges(item) && (
                    <span className={`ml-1.5 text-[11px] ${active ? "text-white/80" : "text-amber-600"}`}>
                      {item.lastPublished ? "· edited" : "· draft"}
                    </span>
                  )}
                </>
              }
              count={countsByFilter.get(item.id) || 0}
              onClick={() => onSelect(item.id)}
            >
              <span className={`w-px h-4 ${active ? "bg-white/30" : "bg-gray-200"}`} />
              <button
                type="button"
                onClick={() => openEditor(item)}
                disabled={saving}
                className={`p-2 rounded-full transition ${active ? "hover:bg-white/15" : "text-gray-400 hover:text-brand"}`}
                title="Edit filter"
              >
                <FaEdit size={11} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                disabled={saving}
                className={`pr-3 pl-1 py-2 rounded-full transition ${active ? "hover:text-white/70" : "text-gray-400 hover:text-red-500"}`}
                title="Delete filter"
              >
                <FaTrash size={10} />
              </button>
            </FilterChip>
          );
        })}
        {unlinkedCount > 0 && (
          <FilterChip
            active={activeFilter === "unlinked"}
            label="Not in filter list"
            count={unlinkedCount}
            onClick={() => onSelect("unlinked")}
          />
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 backdrop-blur-[1px]">
          <form
            noValidate
            onSubmit={handleSave}
            className="bg-white w-full max-w-md rounded-3xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">
                {editing.item ? `Edit "${String(editing.item.fieldData?.name ?? "").trim()}"` : "New filter"}
              </h4>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
                title="Close"
              >
                <FaTimes size={16} />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              {sharedWithTherapies && (
                <p className="text-sm text-brand bg-brand-50/70 border border-brand-100 rounded-xl px-4 py-3">
                  These filters are also the therapy categories, so changes show up there too.
                </p>
              )}
              {fields.map(renderField)}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-brand hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40"
              >
                {saving
                  ? "Saving..."
                  : `${editing.item ? "Save filter" : "Create filter"}${publishOnSave ? " & publish" : " as draft"}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default BlogFiltersPanel;
