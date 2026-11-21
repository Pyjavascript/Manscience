import { useState } from "react";

/**
 * Multi-select state for a list. Selection is a mode: checkboxes show only while `active`,
 * and leaving the mode clears the ticks. Only ids in `visibleIds` count as selected, so items
 * hidden by a filter, search or refresh are never acted on even if they were ticked earlier.
 */
export const useSelection = (visibleIds) => {
  const [active, setActive] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const selectedIds = active ? visibleIds.filter((id) => picked.has(id)) : [];
  const allSelected = visibleIds.length > 0 && selectedIds.length === visibleIds.length;

  const toggle = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });

  const clear = () => setPicked(new Set());

  const stop = () => {
    clear();
    setActive(false);
  };

  return {
    active,
    start: () => setActive(true),
    stop,
    selectedIds,
    count: selectedIds.length,
    isSelected: (id) => active && picked.has(id),
    allSelected,
    someSelected: selectedIds.length > 0 && !allSelected,
    toggle,
    toggleAll,
    clear,
  };
};
