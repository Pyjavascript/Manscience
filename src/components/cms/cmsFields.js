// Converts Webflow CMS field values to and from the plain values the editor form works with.
//
// Field types used in the collection configs:
//   text, textarea, url  -> string
//   number               -> string in the form, number in Webflow
//   image                -> image URL in the form, { url, alt } in Webflow
//   richtext             -> paragraphs separated by blank lines in the form, <p> HTML in Webflow
//   switch               -> boolean
//   select               -> referenced item id (single Reference field)

export const UPLOADING = "Uploading...";

// Staged edits newer than the last publish aren't visible on the live site yet
export const hasUnpublishedChanges = (item) =>
  !item.lastPublished ||
  (!!item.lastUpdated && new Date(item.lastUpdated) > new Date(item.lastPublished));

export const slugify = (text) =>
  String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// Paragraph-level conversion only: inline tags such as <strong> or <a> are kept as typed, so
// editing a rich text field never silently drops its formatting.
export const htmlToParagraphs = (html) =>
  String(html ?? "")
    .replace(/\r/g, "")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/?p[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const paragraphsToHtml = (text) =>
  String(text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

export const toFormValue = (data, field) => {
  const value = data?.[field.key];
  switch (field.type) {
    case "image":
      return (value && typeof value === "object" && value.url) || "";
    case "richtext":
      return htmlToParagraphs(value);
    case "switch":
      return Boolean(value);
    case "number":
      return value === null || value === undefined ? "" : String(value);
    default:
      return value ?? "";
  }
};

export const toFormState = (data, fields) =>
  Object.fromEntries(fields.map((field) => [field.key, toFormValue(data, field)]));

// Normalised value used to decide whether a field was edited
const comparable = (formValue, field) =>
  field.type === "switch"
    ? String(Boolean(formValue))
    : String(formValue ?? "").trim();

export const isFieldEdited = (form, originalData, field) =>
  comparable(form[field.key], field) !==
  comparable(toFormValue(originalData, field), field);

export const isFieldFilled = (form, field) =>
  field.type === "switch" ||
  (comparable(form[field.key], field) !== "" && form[field.key] !== UPLOADING);

const toWebflowValue = (formValue, field, altText) => {
  if (field.type === "switch") return Boolean(formValue);
  const value = String(formValue ?? "").trim();
  if (!value) return null;
  switch (field.type) {
    case "image":
      return { url: value, alt: altText };
    case "richtext":
      return paragraphsToHtml(value);
    case "number":
      return Number(value);
    default:
      return value;
  }
};

// On create, empty fields are skipped so they don't overwrite Webflow defaults.
// On edit (originalData given), only changed fields are sent and cleared fields become null.
export const buildFieldData = (fields, form, originalData, altText) => {
  const fieldData = {};
  fields.forEach((field) => {
    if (originalData) {
      if (!isFieldEdited(form, originalData, field)) return;
    } else if (field.type !== "switch" && comparable(form[field.key], field) === "") {
      return;
    }
    fieldData[field.key] = toWebflowValue(form[field.key], field, altText);
  });
  return fieldData;
};
