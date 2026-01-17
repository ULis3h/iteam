
import React from 'react';

interface OSIconProps {
    os: string;
    className?: string;
}

export const OSIcon: React.FC<OSIconProps> = ({ os, className = "w-4 h-4" }) => {
    if (!os) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
        )
    }
    const osLower = os.toLowerCase();

    const getIcon = () => {
        if (osLower.includes('mac') || osLower.includes('darwin') || osLower.includes('apple')) {
            return (
                <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.3-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.5 1.3 0 2.55.88 3.35.88.81 0 2.34-1.08 3.93-.92 1.35.09 2.54.69 3.24 1.72-2.92 1.76-2.43 6.09.81 7.42-.64 1.66-1.51 3-2.43 3.51zm-7.98-16.7c.69-1.02 1.63-1.79 2.59-1.8.14 0 .28 0 .42.02.04 1.41-.53 2.76-1.42 3.82-.72.84-1.78 1.49-2.73 1.42-.08-1.55.51-2.67 1.14-3.46z" />
                </svg>
            );
        }

        if (osLower.includes('win')) {
            return (
                <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
                    <path d="M0 3.449L9.887 2.11 9.887 11.235 0 11.235ZM11.066 1.956L24 0.134 24 11.235 11.066 11.235ZM0 12.637L9.887 12.637 9.887 21.782 0 20.422ZM11.066 12.637L24 12.637 24 23.866 11.066 22.025Z" />
                </svg>
            );
        }

        if (osLower.includes('ubuntu') || osLower.includes('linux') || osLower.includes('debian') || osLower.includes('fedora') || osLower.includes('centos')) {
            // Using a generic Tux-like or FontAwesome Linux icon path
            return (
                <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
                    <path d="M13.18 20.692s.87-.27.9-.57c0 0 .15-3.36-1.71-4.71s-2.76-1.5-2.76-1.5-.9-.15-2.58 1.47-1.77 4.7-1.77 4.7.06.33.9.6c0 0 1.92 1.56 3.42 1.56 1.53 0 3.6-1.55 3.6-1.55zM17.439 12.91s-1.89-2.07-2.7-1.5c-1.87 1.3-1.33 3.03-.66 3.63s2.91 1 3.57-.45c.66-1.45-.21-1.68-.21-1.68zM6.59 12.91s1.89-2.07 2.7-1.5c1.87 1.3 1.33 3.03.66 3.63s-2.91 1-3.57-.45c-.66-1.45.21-1.68.21-1.68zM12.003 3.07C7.398 3.07 3.593 6.64 3.12 11.457c-2.316 2.31-1.69 7.378-1.69 7.378s.77 3.55 3.177 3.65h.06c.72 1.41 2.37 1.05 2.37 1.05s2.49.52 4.966.52c2.474 0 4.965-.52 4.965-.52s1.65.36 2.37-1.05h.06c2.408-.09 3.177-3.65 3.177-3.65s.627-5.06-1.69-7.38c-.472-4.81-4.277-8.38-8.882-8.38z" />
                </svg>
            );
        }

        // Default / Android / Unknown
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
        )
    };

    return getIcon();
};
