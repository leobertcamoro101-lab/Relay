import { useCallback, useRef, type ReactNode } from 'react';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { LoadingContext } from './loading-context';

interface LoadingProviderProps {
  children: ReactNode;
}
// NProgress.configure({ showSpinner: false }); // remove the small spinner at the side uncomment this if you want // NEW
export function LoadingProvider({ children }: LoadingProviderProps) {
  const activeRequests = useRef(0);

  const startLoading = useCallback(() => {
    activeRequests.current += 1;
    if (activeRequests.current === 1) {
      NProgress.start();
    }
  }, []);

  const stopLoading = useCallback(() => {
    activeRequests.current = Math.max(0, activeRequests.current - 1);
    if (activeRequests.current === 0) {
      NProgress.done();
    }
  }, []);

  return (
    <LoadingContext.Provider value={{ startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}