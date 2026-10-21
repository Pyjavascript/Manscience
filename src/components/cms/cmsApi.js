import { buildFieldData, slugify } from "./cmsFields.js";

// Supabase edge function that proxies the Webflow CMS API (supabase/functions/get-blogs)
const CMS_PROXY_URL =
  "https://obzogpozgoolhededqkb.supabase.co/functions/v1/get-blogs";

const postToProxy = (collectionId, body) =>
  fetch(`${CMS_PROXY_URL}?collection=${collectionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// Webflow validation errors come back as { message, details: [{ param, description }] }
const readError = async (response, fallback) => {
  const data = await response.json().catch(() => null);
  const details = Array.isArray(data?.details)
    ? data.details
        .map((d) => (d?.param ? `${d.param}: ${d.description}` : JSON.stringify(d)))
        .join("\n")
    : "";
  return [data?.message || data?.error || fallback, details]
    .filter(Boolean)
    .join("\n");
};

export const fetchCmsItems = async (collectionId) => {
  const response = await fetch(`${CMS_PROXY_URL}?collection=${collectionId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(await readError(response, "Failed to load items"));
  return response.json();
};

// The collection's field definitions, or null when the proxy can't provide them (a proxy deployed
// before `?schema=1` existed answers with the item list instead)
export const fetchCmsSchema = async (collectionId) => {
  try {
    const response = await fetch(`${CMS_PROXY_URL}?collection=${collectionId}&schema=1`);
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data?.fields) ? data : null;
  } catch {
    return null;
  }
};

// Webflow API writes only change the staged item; publishing pushes it to the live site
export const publishCmsItems = async (collectionId, itemIds) => {
  const response = await postToProxy(collectionId, { action: "publish", itemIds });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.errors?.length) {
    throw new Error(
      data?.message ||
        data?.error ||
        (data?.errors?.length ? JSON.stringify(data.errors) : "") ||
        `Publish request failed (${response.status})`,
    );
  }
  return data;
};

// Creates or updates an item. Returns { unchanged: true } when an edit has nothing to save,
// otherwise { message } describing whether the item went live. `slug` overrides the one made
// from the name on create, e.g. when that name is already taken.
export const saveCmsItem = async ({ collectionId, fields, form, editingItem, publish, slug }) => {
  const name = String(form.name ?? "").trim();
  const fieldData = buildFieldData(fields, form, editingItem?.fieldData || null, name);

  if (editingItem && Object.keys(fieldData).length === 0) return { unchanged: true };

  const payload = editingItem
    ? // Slug is left unchanged on edit so existing page URLs keep working
      { action: "update", itemId: editingItem.id, fieldData }
    : { isArchived: false, isDraft: false, fieldData: { ...fieldData, slug: slug || slugify(name) } };

  const response = await postToProxy(collectionId, payload);
  if (!response.ok) throw new Error(await readError(response, "Webflow rejected the save."));

  const saved = await response.json().catch(() => null);
  const savedId = editingItem?.id || saved?.id;
  const action = editingItem ? "updated" : "created";

  if (!publish || !savedId) {
    return {
      message: `Saved! The item was ${action} as a draft and won't show on the website until published.`,
    };
  }
  try {
    await publishCmsItems(collectionId, [savedId]);
    return { message: `Saved! The item was ${action} and is now live on the website.` };
  } catch (err) {
    return {
      message: `The item was ${action}, but publishing failed, so it is not live yet: ${err.message}`,
    };
  }
};

// Removes the item from the live site and from the CMS
export const deleteCmsItem = async (collectionId, itemId) => {
  const response = await postToProxy(collectionId, {
    action: "delete",
    itemId,
    collectionId,
  });
  if (!response.ok) throw new Error(await readError(response, "Webflow rejected the delete."));
};
