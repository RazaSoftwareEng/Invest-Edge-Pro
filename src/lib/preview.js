// "Guest preview" lets an admin look at the user-facing pages without being redirected
// back to the admin console. The flag lives in sessionStorage (this tab only).
const KEY = 'iep-preview';

export function isPreview() {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function startPreview() {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* ignore */
  }
}

export function stopPreview() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
