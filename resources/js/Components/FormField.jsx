import InputError from '@/Components/InputError';
import { EyeIcon, EyeSlashIcon } from '@/Components/icons';
import { useState } from 'react';

/**
 * Labelled input with an optional left icon, an error slot, and a built-in
 * show/hide toggle for password fields.
 */
export default function FormField({ label, icon, error, isPassword = false, type = 'text', ...props }) {
    const [show, setShow] = useState(false);
    const inputType = isPassword ? (show ? 'text' : 'password') : type;

    return (
        <div>
            <label htmlFor={props.id} className="mb-1.5 block text-sm font-medium text-gray-700">
                {label}
            </label>
            <div className="relative">
                {icon && (
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        {icon}
                    </span>
                )}
                <input
                    {...props}
                    type={inputType}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error && props.id ? `${props.id}-error` : undefined}
                    className={`block w-full rounded-lg border-gray-300 py-2.5 text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 ${
                        icon ? 'pl-10' : 'pl-3'
                    } ${isPassword ? 'pr-11' : 'pr-3'} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/40' : ''}`}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShow((s) => !s)}
                        aria-pressed={show}
                        aria-label="Show password"
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition hover:text-gray-600 focus:outline-none focus-visible:text-indigo-600"
                    >
                        {show ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                )}
            </div>
            <InputError id={props.id ? `${props.id}-error` : undefined} message={error} className="mt-1.5" />
        </div>
    );
}
