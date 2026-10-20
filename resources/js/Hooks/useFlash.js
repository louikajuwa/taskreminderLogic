import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toastError, toastSuccess } from '@/lib/swal';

/**
 * Surface Laravel session flash messages (shared via HandleInertiaRequests) as
 * SweetAlert2 toasts. Inertia replaces the props object on every visit, so this
 * fires once per redirect — even for repeated identical messages.
 */
export default function useFlash() {
    const { flash } = usePage().props;

    useEffect(() => {
        if (flash?.success) toastSuccess(flash.success);
        if (flash?.error) toastError(flash.error);
    }, [flash]);
}
