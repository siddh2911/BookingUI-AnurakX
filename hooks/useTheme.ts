import { useState, useEffect } from 'react';

export function useTheme() {
    const [theme, setTheme] = useState<'day' | 'night'>(() => {
        const current = document.documentElement.getAttribute('data-theme');
        return (current === 'night' ? 'night' : 'day');
    });

    // Sync state with DOM attribute
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'day' ? 'night' : 'day');
    };

    return { theme, toggleTheme };
}
