const key = 'indoghost.opening.v1';
let enteredHere = false;

export function needsOpening() {
  if (enteredHere) return false;
  try {
    if (sessionStorage.getItem(key) === 'entered') return false;
  } catch {
    // Some browsers disable the storage getter or reject writes.
  }
  return history.state?.[key] !== 'entered';
}

export function rememberEntry() {
  enteredHere = true;
  try {
    sessionStorage.setItem(key, 'entered');
  } catch {
    // Preserve the current navigation entry across reloads even in storage-restricted browsers.
    try {
      history.replaceState({ ...history.state, [key]: 'entered' }, '');
    } catch {
      // The in-memory flag still covers navigation inside this document.
    }
  }
}
