// SPDX-License-Identifier: Apache-2.0
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiClientError, isApiClientError } from '@/api';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: ApiClientError | null;
  /** Re-run the loader (e.g. pull-to-refresh / retry button). */
  reload: () => void;
}

/**
 * Run an async loader on mount and expose loading/error/reload.
 * Guards against setting state after unmount.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(() => {
    setLoading(true);
    setError(null);
    loader()
      .then((result) => {
        if (mounted.current) setData(result);
      })
      .catch((e: unknown) => {
        if (!mounted.current) return;
        setError(isApiClientError(e) ? e : new ApiClientError('NETWORK', 'Unknown error'));
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    // useAsync is a generic hook: callers pass their own dep array.
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, reload: run };
}
