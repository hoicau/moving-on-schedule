import { useEffect, useState } from 'react';

export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function refresh() {
      clearTimeout(timer);
      setNow(new Date());
      timer = setTimeout(refresh, 60000 - (Date.now() % 60000));
    }
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return now;
}
