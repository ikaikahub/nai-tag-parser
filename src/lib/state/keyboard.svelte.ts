// screenHeight: page height without a keyboard, height: the whole keyboard,
// inset: the part of it the layout doesn't already make room for (browsers differ on resizing the layout)
export const keyboard = $state({ screenHeight: 0, height: 0, inset: 0 });

let screenWidth = 0;

function measureKeyboard() {
  const viewport = window.visualViewport;
  const layoutHeight = document.documentElement.clientHeight;
  // a new width means rotation, otherwise the tallest height seen is the one without a keyboard
  if (window.innerWidth !== screenWidth) keyboard.screenHeight = layoutHeight;
  keyboard.screenHeight = Math.max(keyboard.screenHeight, layoutHeight);
  screenWidth = window.innerWidth;

  // pinch zoom also shrinks the visual viewport, that isn't a keyboard
  const visibleBottom = !viewport || viewport.scale > 1.01 ? layoutHeight : viewport.height + viewport.offsetTop;
  keyboard.height = Math.max(0, Math.round(keyboard.screenHeight - visibleBottom));
  keyboard.inset = Math.max(0, Math.round(layoutHeight - visibleBottom));
  document.documentElement.style.setProperty('--keyboard-inset', `${keyboard.inset}px`);
}

measureKeyboard();
window.addEventListener('resize', measureKeyboard);
window.visualViewport?.addEventListener('resize', measureKeyboard);
window.visualViewport?.addEventListener('scroll', measureKeyboard);
