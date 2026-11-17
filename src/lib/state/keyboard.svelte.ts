export const keyboard = $state({ inset: 0 });

addEventListener('keyboardinset', (e) => {
  keyboard.inset = (e as CustomEvent<number>).detail;
  document.documentElement.style.setProperty('--keyboard-inset', `${keyboard.inset}px`);
});
