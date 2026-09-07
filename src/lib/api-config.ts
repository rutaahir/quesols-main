export const getApiUrl = (path: string): string => {
  if (typeof window === "undefined") {
    return `http://127.0.0.1:8000${path}`;
  }
  // If we are on HTTPS, route through Vite proxy on port 8080 (relative URL)
  if (window.location.protocol === "https:") {
    return path;
  }
  // Otherwise, fallback to direct port 8000 HTTP access
  return `http://${window.location.hostname}:8000${path}`;
};

export const getWsUrl = (path: string): string => {
  if (typeof window === "undefined") {
    return `ws://127.0.0.1:8000${path}`;
  }
  // If we are on HTTPS, use secure WebSockets via the same port (relative / proxy)
  if (window.location.protocol === "https:") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${path}`;
  }
  // Otherwise, fallback to direct port 8000 WS access
  return `ws://${window.location.hostname}:8000${path}`;
};
