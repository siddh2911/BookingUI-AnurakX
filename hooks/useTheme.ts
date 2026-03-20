import { useState, useEffect } from 'react';

export function useTheme() {
    const [theme, setTheme] = useState<'day' | 'night'>('day');
    const [isManual, setIsManual] = useState(false);

    // Automatic theme update based on time
    useEffect(() => {
        if (isManual) return;

        const updateTheme = () => {
            const h = new Date().getHours();
            setTheme(h >= 6 && h < 18 ? 'day' : 'night');
        };

        updateTheme();
        const interval = setInterval(updateTheme, 60000);
        return () => clearInterval(interval);
    }, [isManual]);

    // Sync state with DOM attribute
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setIsManual(true);
        setTheme(prev => prev === 'day' ? 'night' : 'day');
    };

    return { theme, toggleTheme };
}
