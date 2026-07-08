import { useState, useEffect, useCallback } from 'react';

const SIDEBAR_KEY = 'imedin_sidebar_collapsed';
const SIDEBAR_EVENT = 'imedin_sidebar_change';

export function useSidebar() {
  const [collapsed, setCollapsedState] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === 'true'; } catch { return false; }
  });

  useEffect(() => {
    const handler = () => {
      try { setCollapsedState(localStorage.getItem(SIDEBAR_KEY) === 'true'); } catch { /* noop */ }
    };
    window.addEventListener(SIDEBAR_EVENT, handler);
    return () => window.removeEventListener(SIDEBAR_EVENT, handler);
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    try { localStorage.setItem(SIDEBAR_KEY, String(v)); } catch { /* noop */ }
    setCollapsedState(v);
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  return { collapsed, setCollapsed, toggle };
}
