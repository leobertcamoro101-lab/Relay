//wired with LaodingContext for combined loading State
import { useState, useCallback, useRef, useEffect, useContext } from "react";
import { LoadingContext } from "../context/loading-context";

// interface HttpError {
//   message: string;
// }

export const useHttpClient = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const { startLoading, stopLoading } = useContext(LoadingContext);

  const activeHttpRequest = useRef<AbortController[]>([]);

  const sendRequest = useCallback(
    async (
      url: string,
      method: string = "GET",
      body: BodyInit | null = null,
      headers: HeadersInit = {}
    ) => {
      setIsLoading(true);
      startLoading();
      const httpAbortCtrl = new AbortController();
      activeHttpRequest.current.push(httpAbortCtrl);

      try {
        const response = await fetch(url, {
          method,
          body,
          headers,
          signal: httpAbortCtrl.signal,
        });

        const responseData = await response.json();

        activeHttpRequest.current = activeHttpRequest.current.filter(
          (reqCtrl) => reqCtrl !== httpAbortCtrl
        );

        if (!response.ok) {
          throw new Error(responseData.message);
        }
        setIsLoading(false);
        stopLoading();
        return responseData;
      } catch (err) {
        stopLoading(); // NEW — must fire on every exit path, including abort/error
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [startLoading, stopLoading]
  );

  const clearError = () => {
    setError(undefined);
  };

  useEffect(() => {
    return () => {
      activeHttpRequest.current.forEach((abortCtrl) => abortCtrl.abort());
    };
  }, []);

  return { isLoading, error, sendRequest, clearError };
};