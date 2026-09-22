import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import Home from '@/app/page';
import '@/app/globals.css';
import '@/app/atmosphere.css';
import '@/app/waves.css';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider attribute="class" forcedTheme="dark" enableSystem={false}>
    <Home />
  </ThemeProvider>,
);
