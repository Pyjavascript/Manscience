import { useCallback, useLayoutEffect, useRef } from "react";

// Returns a function with a fixed identity that always calls the latest `fn`.
// Lets memoized children (like ChatMessage) skip re-renders when the parent
// re-renders, e.g. on every keystroke in the input.
export const useStableCallback = (fn) => {
  const fnRef = useRef(fn);

  useLayoutEffect(() => {
    fnRef.current = fn;
  });

  return useCallback((...args) => fnRef.current(...args), []);
};
