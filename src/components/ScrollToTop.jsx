import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls the window to the top whenever the route (page) changes. */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
