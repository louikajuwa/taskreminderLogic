import Swal from 'sweetalert2';

// Small toast in the top-right corner, auto-dismissing.
const toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (el) => {
        el.addEventListener('mouseenter', Swal.stopTimer);
        el.addEventListener('mouseleave', Swal.resumeTimer);
    },
});

export const toastSuccess = (title) => toast.fire({ icon: 'success', title });
export const toastError = (title) => toast.fire({ icon: 'error', title });
export const toastInfo = (title) => toast.fire({ icon: 'info', title });

// Centered confirmation dialog. Resolves to a SweetAlert result ({ isConfirmed }).
export const confirmDelete = ({
    title = 'Are you sure?',
    text = "This action can't be undone.",
    confirmButtonText = 'Yes, delete it',
} = {}) =>
    Swal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText,
        cancelButtonText: 'Cancel',
        reverseButtons: true,
    });

export default Swal;
