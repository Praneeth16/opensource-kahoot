// Browser only. A full page load drops the Realtime client, its socket and any optimistic state.
export function leaveSession(to = "/") {
  window.location.assign(to);
}

// useLiveQuery retries a failed renewal every second without limit. After a 401, stop calling the server
// and leave. A full page load resets this flag.
let signedOut = false;

export async function renewOrLeave<T>(
  renew: () => Promise<Response>,
  leaveTo = "/",
): Promise<T> {
  if (signedOut) throw new Error("Signed out");
  const response = await renew();
  if (response.status === 401) {
    signedOut = true;
    leaveSession(leaveTo);
    throw new Error("Signed out");
  }
  if (!response.ok)
    throw new Error(`Live query renewal failed: ${response.status}`);
  return (await response.json()) as T;
}
