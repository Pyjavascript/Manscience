import { useState } from "react";
import { FaCheck, FaTimes, FaHandHoldingMedical } from "react-icons/fa";
import { UPLOADING, isFieldEdited, isFieldFilled } from "./cmsFields";
import { INPUT_BASE, ImageField, Switch } from "./CmsControls";

const INPUT_SIZE = {
  title: "text-2xl font-semibold tracking-tight leading-snug",
  heading: "text-lg font-medium leading-snug",
};

/**
 * Create/edit modal for a Webflow CMS item, laid out like the live page: an outline of
 * sections on the left, one section at a time on the right, each split into numbered steps.
 * Consecutive sections sharing a `navGroup` (e.g. the pop-ups) share one outline entry and
 * are switched with tabs. `extraPanels` ({ key, title, subtitle, content }) are appended to
 * the outline for content that lives outside this item, such as related collection items.
 */
const CmsItemFormModal = ({
  sections,
  extraPanels = [],
  form,
  setForm,
  editingItem,
  itemLabel,
  thumbKey,
  selectOptions = {},
  uploadImage,
  publishOnSave,
  setPublishOnSave,
  saving,
  onSave,
  onClose,
}) => {
  // Index into `steps`: the sections first, then the extra panels
  const [activeStep, setActiveStep] = useState(0);
  const original = editingItem?.fieldData || {};
  const allFields = sections.flatMap((s) => s.fields);
  const isEdited = (field) => !!editingItem && isFieldEdited(form, original, field);
  const isFilled = (field) => isFieldFilled(form, field);
  const editedCount = allFields.filter(isEdited).length;
  const isUploading = Object.values(form).includes(UPLOADING);

  // Sections are subtitled with their live text, e.g. a pop-up's question
  const subtitleOf = (s) =>
    (s.labelKey && String(form[s.labelKey] || "").trim()) || s.fallbackSubtitle;

  const steps = [
    ...sections.map((s) => ({ ...s, subtitle: subtitleOf(s) })),
    ...extraPanels.map((p) => ({ ...p, isPanel: true, fields: [] })),
  ];

  const navItems = [];
  steps.forEach((step, i) => {
    const last = navItems[navItems.length - 1];
    if (step.navGroup && last?.group === step.navGroup) last.stepIndexes.push(i);
    else navItems.push({ group: step.navGroup, stepIndexes: [i] });
  });

  const step = steps[activeStep];
  const prevStep = steps[activeStep - 1];
  const nextStep = steps[activeStep + 1];
  const activeNavIndex = navItems.findIndex((n) => n.stepIndexes.includes(activeStep));
  const activeNav = navItems[activeNavIndex];
  const thumb = form[thumbKey];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isUploading) {
      alert("Please wait for your images to finish uploading.");
      return;
    }
    // Required inputs may be in a section that isn't shown, so check them here
    const missingIndex = sections.findIndex((s) =>
      s.fields.some((f) => f.required && !String(form[f.key] ?? "").trim()),
    );
    if (missingIndex !== -1) {
      setActiveStep(missingIndex);
      const missing = sections[missingIndex].fields.find(
        (f) => f.required && !String(form[f.key] ?? "").trim(),
      );
      alert(`Please fill in "${missing.label}" before saving.`);
      return;
    }
    onSave();
  };

  const renderField = (field) => {
    const value = form[field.key] ?? (field.type === "switch" ? false : "");
    const setValue = (v) => setForm((prev) => ({ ...prev, [field.key]: v }));
    const inputId = `cms-${field.key}`;
    const fullWidth =
      field.type === "textarea" || field.type === "richtext" || field.display || field.key === "name";
    const inputClass = `${INPUT_BASE} ${INPUT_SIZE[field.display] || "text-[15px]"}`;

    let control;
    if (field.type === "textarea" || field.type === "richtext") {
      control = (
        <>
          <textarea
            id={inputId}
            rows={field.rows || 4}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={field.placeholder}
            className={`${inputClass} resize-y ${field.display ? "" : "leading-relaxed"}`}
          />
          {!field.display && (
            <p className="mt-1 text-right text-xs text-gray-400">{value.length} characters</p>
          )}
        </>
      );
    } else if (field.type === "image") {
      control = (
        <ImageField inputId={inputId} value={value} setValue={setValue} uploadImage={uploadImage} />
      );
    } else if (field.type === "switch") {
      control = <Switch checked={!!value} onChange={setValue} label={value ? "Yes" : "No"} />;
    } else if (field.type === "select") {
      const options = selectOptions[field.key] || [];
      const hasCurrent = !value || options.some((o) => o.value === value);
      control = (
        <select
          id={inputId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`${inputClass} appearance-auto`}
        >
          <option value="">{field.placeholder || "None"}</option>
          {!hasCurrent && <option value={value}>Current item ({value})</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    } else {
      control = (
        <input
          id={inputId}
          type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={field.placeholder}
          className={inputClass}
        />
      );
    }

    return (
      <div key={field.key} className={fullWidth ? "sm:col-span-2" : ""}>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={inputId} className="text-sm font-medium text-gray-800">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {isEdited(field) && (
            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              Edited
            </span>
          )}
        </div>
        {field.hint && <p className="text-xs text-gray-400 mt-0.5">{field.hint}</p>}
        <div className="mt-2">{control}</div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-0 sm:p-4 backdrop-blur-[1px]">
      <div className="bg-white w-full max-w-5xl h-full sm:h-[90vh] overflow-hidden flex flex-col sm:rounded-3xl sm:border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
          {thumb && thumb !== UPLOADING ? (
            <img src={thumb} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-[#5932EA] flex items-center justify-center shrink-0">
              <FaHandHoldingMedical size={18} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 tracking-tight truncate">
              {editingItem ? form.name || `Edit ${itemLabel}` : `New ${itemLabel}`}
            </h3>
            <p className="text-sm text-gray-500 truncate">
              Laid out like the live page, top to bottom.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition shrink-0"
            title="Close"
          >
            <FaTimes size={18} />
          </button>
        </div>

        <form
          noValidate
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            // Enter in a single-line input shouldn't save the whole form
            if (e.key === "Enter" && e.target.tagName === "INPUT") e.preventDefault();
          }}
          className="flex-1 min-h-0 flex flex-col"
        >
          <div className="flex-1 min-h-0 flex flex-col md:flex-row">
            {/* Page outline: sidebar on desktop, scrollable pills on mobile */}
            <nav className="md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50">
              <p className="hidden md:block px-5 pt-5 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Page outline
              </p>
              <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto p-3 md:p-4 md:pt-2">
                {navItems.map((nav, ni) => {
                  const first = steps[nav.stepIndexes[0]];
                  const navFields = nav.stepIndexes.flatMap((i) => steps[i].fields);
                  const total = navFields.length;
                  const filled = navFields.filter(isFilled).length;
                  const edited = navFields.filter(isEdited).length;
                  const active = ni === activeNavIndex;
                  const complete = !first.isPanel && filled === total;
                  return (
                    <button
                      key={nav.group || first.key || first.title}
                      type="button"
                      onClick={() => !active && setActiveStep(nav.stepIndexes[0])}
                      className={`shrink-0 md:w-full text-left px-3 py-2.5 md:py-3 rounded-xl border flex items-center md:items-start gap-3 transition ${
                        active ? "bg-white border-[#5932EA]/30" : "border-transparent hover:bg-white hover:border-gray-200"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center shrink-0 ${
                          active
                            ? "bg-[#5932EA] text-white"
                            : complete
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200/80 text-gray-500"
                        }`}
                      >
                        {complete && !active ? <FaCheck size={10} /> : ni + 1}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block text-sm font-semibold whitespace-nowrap ${active ? "text-[#5932EA]" : "text-gray-800"}`}
                        >
                          {nav.group || first.title}
                        </span>
                        <span className="hidden md:block text-sm text-gray-500 truncate max-w-[11rem]">
                          {nav.group
                            ? `${nav.stepIndexes.length} ${nav.group.toLowerCase()}`
                            : first.subtitle}
                        </span>
                        {!first.isPanel && (
                          <span className="hidden md:block text-xs text-gray-400 mt-0.5">
                            {filled} of {total} filled
                            {edited > 0 && <span className="text-amber-600"> · {edited} edited</span>}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Active step; keyed so scroll resets when switching */}
            <div key={activeStep} className="flex-1 min-h-0 overflow-y-auto">
              {/* Tabs for grouped sections, e.g. Pop-up 1 · 2 · 3 · 4 */}
              {activeNav.group && (
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
                  <div className="max-w-2xl mx-auto px-6 sm:px-10 pt-4 flex gap-1 overflow-x-auto">
                    {activeNav.stepIndexes.map((i) => {
                      const tab = steps[i];
                      const selected = i === activeStep;
                      const tabComplete = tab.fields.every(isFilled);
                      const tabEdited = tab.fields.some(isEdited);
                      return (
                        <button
                          key={tab.title}
                          type="button"
                          onClick={() => setActiveStep(i)}
                          title={tab.subtitle}
                          className={`shrink-0 px-4 pt-2 pb-3 -mb-px border-b-2 text-sm font-semibold flex items-center gap-2 transition ${
                            selected
                              ? "border-[#5932EA] text-[#5932EA]"
                              : "border-transparent text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          {tab.title}
                          {tabEdited ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Edited" />
                          ) : (
                            tabComplete && <FaCheck size={9} className="text-green-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="max-w-2xl mx-auto px-6 sm:px-10 py-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#5932EA]">
                  Step {activeNavIndex + 1} of {navItems.length}
                  {activeNav.group && ` · ${step.title}`}
                </p>
                <h4 className="text-2xl font-semibold text-gray-900 tracking-tight mt-1">
                  {step.title}
                  {step.subtitle && <span className="text-gray-400 font-normal"> · {step.subtitle}</span>}
                </h4>
                {step.note && (
                  <p className="mt-4 text-sm text-[#5932EA] bg-indigo-50/70 border border-indigo-100 rounded-xl px-4 py-3">
                    {step.note}
                  </p>
                )}

                {step.isPanel ? (
                  <div className="mt-8">{step.content}</div>
                ) : (
                  // Each group is one numbered step, e.g. Question → Answer → Images & data
                  <ol className="mt-8">
                    {step.groups.map((group, gi) => {
                      const isLastGroup = gi === step.groups.length - 1;
                      return (
                        <li key={group.title} className={`relative pl-12 ${isLastGroup ? "" : "pb-10"}`}>
                          {!isLastGroup && (
                            <span className="absolute left-[15px] top-9 bottom-1 w-px bg-gray-200" />
                          )}
                          <span className="absolute left-0 top-0 w-8 h-8 rounded-full border border-[#5932EA]/25 bg-indigo-50 text-[#5932EA] text-sm font-semibold flex items-center justify-center">
                            {gi + 1}
                          </span>
                          <div className="pt-1 mb-5">
                            <h5 className="text-base font-semibold text-gray-900">{group.title}</h5>
                            {group.description && (
                              <p className="text-sm text-gray-500">{group.description}</p>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
                            {group.fields.map(renderField)}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}

                {/* Move between steps */}
                <div className="mt-12 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  {prevStep ? (
                    <button
                      type="button"
                      onClick={() => setActiveStep(activeStep - 1)}
                      className="text-sm font-medium text-gray-500 hover:text-gray-800"
                    >
                      ← {prevStep.title}
                    </button>
                  ) : (
                    <span />
                  )}
                  {nextStep && (
                    <button
                      type="button"
                      onClick={() => setActiveStep(activeStep + 1)}
                      className="px-5 py-2.5 rounded-xl border border-[#5932EA]/30 bg-indigo-50 text-sm font-semibold text-[#5932EA] hover:bg-indigo-100 transition"
                    >
                      Next: {nextStep.title}
                      {nextStep.subtitle && ` · ${nextStep.subtitle}`} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-white flex flex-wrap items-center gap-3">
            <Switch
              checked={publishOnSave}
              onChange={setPublishOnSave}
              label={publishOnSave ? "Publish to website on save" : "Save as draft only"}
            />
            <div className="ml-auto flex items-center gap-3">
              {editingItem && (
                <span className="hidden sm:inline text-sm text-gray-400">
                  {editedCount === 0
                    ? "No changes yet"
                    : `${editedCount} field${editedCount === 1 ? "" : "s"} edited`}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || isUploading || (editingItem && editedCount === 0)}
                className="px-6 py-2.5 bg-[#5932EA] hover:bg-[#4826c9] text-white text-sm font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : editingItem ? "Save changes" : `Create ${itemLabel}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CmsItemFormModal;
