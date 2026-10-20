import { BUTTON_BASE } from '@/Components/buttonStyles';

export default function PrimaryButton({ className = '', disabled, processing = false, children, ...props }) {
    return (
        <button
            type="submit"
            {...props}
            disabled={disabled || processing}
            aria-busy={processing || undefined}
            className={`${BUTTON_BASE} border-transparent bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-500 active:bg-indigo-700 ${className}`}
        >
            {children}
        </button>
    );
}
