import { useCallback, useEffect, useState } from "react";

/**
 * Hook mínimo de carga de datos: ejecuta `fetcher` al montar y expone
 * `reload` para refrescar después de crear/editar/borrar.
 */
export function useData<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fetcher()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(reload, [reload]);

  return { data, loading, error, reload };
}
