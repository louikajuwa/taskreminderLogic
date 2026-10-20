import FormField from '@/Components/FormField';
import { LockIcon, MailIcon, UserIcon } from '@/Components/icons';
import GuestLayout from '@/Layouts/GuestLayout';
import { toastError, toastSuccess } from '@/lib/swal';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('register'), {
            onError: (errs) => {
                const first = Object.values(errs)[0];
                if (first) toastError(first);
            },
            onSuccess: () => toastSuccess('Account created — welcome aboard! 🎉'),
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Register" />

            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Create your account</h2>
            <p className="mt-1 text-sm text-gray-500">Start organizing your tasks in seconds.</p>

            <form onSubmit={submit} className="mt-8 space-y-5">
                <FormField
                    id="name"
                    name="name"
                    label="Full name"
                    placeholder="Jane Doe"
                    icon={<UserIcon className="h-5 w-5" />}
                    value={data.name}
                    autoComplete="name"
                    autoFocus
                    required
                    error={errors.name}
                    onChange={(e) => setData('name', e.target.value)}
                />

                <FormField
                    id="email"
                    type="email"
                    name="email"
                    label="Email"
                    placeholder="you@example.com"
                    icon={<MailIcon className="h-5 w-5" />}
                    value={data.email}
                    autoComplete="username"
                    required
                    error={errors.email}
                    onChange={(e) => setData('email', e.target.value)}
                />

                <FormField
                    id="password"
                    name="password"
                    label="Password"
                    placeholder="At least 8 characters"
                    icon={<LockIcon className="h-5 w-5" />}
                    isPassword
                    value={data.password}
                    autoComplete="new-password"
                    required
                    error={errors.password}
                    onChange={(e) => setData('password', e.target.value)}
                />

                <FormField
                    id="password_confirmation"
                    name="password_confirmation"
                    label="Confirm password"
                    placeholder="Re-enter your password"
                    icon={<LockIcon className="h-5 w-5" />}
                    isPassword
                    value={data.password_confirmation}
                    autoComplete="new-password"
                    required
                    error={errors.password_confirmation}
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                />

                <button
                    type="submit"
                    disabled={processing}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {processing && (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                        </svg>
                    )}
                    {processing ? 'Creating account…' : 'Create account'}
                </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link href={route('login')} className="font-semibold text-indigo-600 hover:text-indigo-500">
                    Log in
                </Link>
            </p>
        </GuestLayout>
    );
}
