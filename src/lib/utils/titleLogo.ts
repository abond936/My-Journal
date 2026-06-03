export function getTitleLogoSrc(theme: 'light' | 'dark'): string {
  return theme === 'dark'
    ? '/images/uploads/Title-dark2.png'
    : '/images/uploads/Title-light2.svg';
}
