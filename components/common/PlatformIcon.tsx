import React from 'react';
import { Globe, UserCheck, Phone } from 'lucide-react';
import { BookingSource } from '../../types';

interface PlatformIconProps {
    source: BookingSource | string;
    className?: string;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({ source, className = "w-4 h-4" }) => {
    // Normalize source string just in case
    const normalizedSource = source?.toString().toLowerCase();

    if (normalizedSource.includes('airbnb')) {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#FF5A5F' }}>
                <path d="M12.001 18.275c-1.353-1.697-2.148-3.184-2.413-4.457-.263-1.027-.16-1.848.291-2.465.477-.71 1.188-1.056 2.121-1.056s1.643.345 2.12 1.063c.446.61.558 1.432.286 2.465-.291 1.298-1.085 2.785-2.412 4.458zm9.601 1.14c-.185 1.246-1.034 2.28-2.2 2.783-2.253.98-4.483-.583-6.392-2.704 3.157-3.951 3.74-7.028 2.385-9.018-.795-1.14-1.933-1.695-3.394-1.695-2.944 0-4.563 2.49-3.927 5.382.37 1.565 1.352 3.343 2.917 5.332-.98 1.085-1.91 1.856-2.732 2.333-.636.344-1.245.558-1.828.609-2.679.399-4.778-2.2-3.825-4.88.132-.345.395-.98.845-1.961l.025-.053c1.464-3.178 3.242-6.79 5.285-10.795l.053-.132.58-1.116c.45-.822.635-1.19 1.351-1.643.346-.21.77-.315 1.246-.315.954 0 1.698.558 2.016 1.007.158.239.345.557.582.953l.558 1.089.08.159c2.041 4.004 3.821 7.608 5.279 10.794l.026.025.533 1.22.318.764c.243.613.294 1.222.213 1.858zm1.22-2.39c-.186-.583-.505-1.271-.9-2.094v-.03c-1.889-4.006-3.642-7.608-5.307-10.844l-.111-.163C15.317 1.461 14.468 0 12.001 0c-2.44 0-3.476 1.695-4.535 3.898l-.081.16c-1.669 3.236-3.421 6.843-5.303 10.847v.053l-.559 1.22c-.21.504-.317.768-.345.847C-.172 20.74 2.611 24 5.98 24c.027 0 .132 0 .265-.027h.372c1.75-.213 3.554-1.325 5.384-3.317 1.829 1.989 3.635 3.104 5.382 3.317h.372c.133.027.239.027.265.027 3.37.003 6.152-3.261 4.802-6.975z" />
            </svg>
        );
    }

    if (normalizedSource.includes('booking')) {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#003580' }}>
                <path d="M15.25 10.65c-0.35-0.1-0.75-0.15-1.15-0.15h-3.4v6.8h3.35c1.7 0 2.95-1.05 2.95-2.85 0-1.7-1.1-2.45-1.75-2.65 1.15-0.4 1.75-1.3 1.75-2.4 0-1.6-1.2-2.35-3.05-2.35h-5.25v9.25c0 0.55-0.45 1-1 1s-1-0.45-1-1v-12.75c0-0.55 0.45-1 1-1h7.4c2.8 0 4.95 1.5 4.95 4.25 0 1.2-0.65 2.45-1.8 3.1z" />
            </svg>
        );
    }

    if (normalizedSource.includes('expedia')) {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#FFD700' }}>
                <path d="M2.5 12l8.5-9 8.5 9-3 6h-11z" /> {/* Simplified triangle/plane shape */}
            </svg>
        );
    }

    if (normalizedSource.includes('walk')) {
        return <UserCheck className={`${className} text-emerald-600`} />;
    }

    if (normalizedSource.includes('instagram')) {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#E1306C' }}>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
        );
    }

    if (normalizedSource.includes('trip') || normalizedSource.includes('mmt')) {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#E31E24' }}>
                <path d="M3.5 5h17a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 17.5v-11A1.5 1.5 0 0 1 3.5 5zm5 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm7 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /> {/* Simplified wallet/trip icon concept as MMT SVG is complex/unavailable */}
                <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-6h2v6z" style={{ display: 'none' }} /> {/* Hidden fallback logic */}
                <text x="12" y="16" fontSize="10" textAnchor="middle" fill="white" fontWeight="bold">MY</text>
            </svg>
        );
    }

    if (normalizedSource.includes('direct')) {
        return <Globe className={`${className} text-blue-600`} />;
    }

    // Fallback
    return <Phone className={`${className} text-slate-400`} />;
};

export default PlatformIcon;
