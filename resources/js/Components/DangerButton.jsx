import { BUTTON_BASE } from '@/Components/buttonStyles';

export default function DangerButton({ className = '', disabled, processing = false, children, ...props }) {
    return (
        <button
            {...props}
            disabled={disabled || processing}
            aria-busy={processing || undefined}
            className={`${BUTTON_BASE} border-transparent bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500 active:bg-red-700 ${className}`}
        >
            {children}
        </button>
    );
}
