// Lock/unlock body scrolling while a modal or panel is open. Locking pads the
// body by the scrollbar width so the page doesn't shift sideways when the
// scrollbar disappears (matches the shared Modal component's behaviour).

export function lockBodyScroll() {
  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

export function unlockBodyScroll() {
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}
