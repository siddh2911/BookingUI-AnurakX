import { useState, useEffect } from 'react';

// Shared state for the theme
let globalTheme: 'day' | 'night' = (document.documentElement.getAttribute('data-theme') as 'day' | 'night') || 'day';
const listeners = new Set<(theme: 'day' | 'night') => void>();

export function useTheme() {
    const [theme, setTheme] = useState<'day' | 'night'>(globalTheme);

    useEffect(() => {
        const handleChange = (newTheme: 'day' | 'night') => setTheme(newTheme);
        listeners.add(handleChange);
        return () => {
            listeners.delete(handleChange);
        };
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'day' ? 'night' : 'day';
        globalTheme = newTheme;
        document.documentElement.setAttribute('data-theme', newTheme);
        listeners.forEach(listener => listener(newTheme));
    };

    return { theme, toggleTheme };
}
