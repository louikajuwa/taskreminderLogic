import { BUTTON_BASE } from '@/Components/buttonStyles';

export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    processing = false,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            type={type}
            disabled={disabled || processing}
            aria-busy={processing || undefined}
            className={`${BUTTON_BASE} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-indigo-500 ${className}`}
        >
            {children}
        </button>
    );
}
