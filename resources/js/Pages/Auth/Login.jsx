import Checkbox from '@/Components/Checkbox';
import FormField from '@/Components/FormField';
import { LockIcon, MailIcon } from '@/Components/icons';
import GuestLayout from '@/Layouts/GuestLayout';
import { toastError, toastInfo, toastSuccess } from '@/lib/swal';
import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect } from 'react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        if (status) toastInfo(status);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onError: (errs) => {
                const first = Object.values(errs)[0];
                if (first) toastError(first);
            },
            onSuccess: () => toastSuccess('Welcome back!'),
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Welcome back</h2>
            <p className="mt-1 text-sm text-gray-500">Sign in to continue to your workspace.</p>

            <form onSubmit={submit} className="mt-8 space-y-5">
                <FormField
                    id="email"
                    type="email"
                    name="email"
                    label="Email"
                    placeholder="you@example.com"
                    icon={<MailIcon className="h-5 w-5" />}
                    value={data.email}
                    autoComplete="username"
                    autoFocus
                    required
                    error={errors.email}
                    onChange={(e) => setData('email', e.target.value)}
                />

                <FormField
                    id="password"
                    name="password"
                    label="Password"
                    placeholder="••••••••"
                    icon={<LockIcon className="h-5 w-5" />}
                    isPassword
                    value={data.password}
                    autoComplete="current-password"
                    required
                    error={errors.password}
                    onChange={(e) => setData('password', e.target.value)}
                />

                <div className="flex items-center justify-between">
                    <label className="flex items-center">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                        />
                        <span className="ms-2 text-sm text-gray-600">Remember me</span>
                    </label>

                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                        >
                            Forgot password?
                        </Link>
                    )}
                </div>

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
                    {processing ? 'Signing in…' : 'Sign in'}
                </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
                New here?{' '}
                <Link href={route('register')} className="font-semibold text-indigo-600 hover:text-indigo-500">
                    Create an account
                </Link>
            </p>
        </GuestLayout>
    );
}
