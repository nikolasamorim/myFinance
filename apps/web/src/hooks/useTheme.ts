export function useTheme() {
    const toggle = () => {
      const root = document.documentElement;
      const isDark = root.classList.contains('dark');
      if (isDark) {
        root.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      } else {
        root.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      }
    };
    return { toggle };
  }