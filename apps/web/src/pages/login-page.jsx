import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { loginSchema } from '@hc/shared';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/lib/api-client';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await login(values);
      // Return the user to wherever a guard bounced them from, or the dashboard.
      const from = location.state?.from?.pathname;
      navigate(from ?? '/dashboard', { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Unable to sign in. Please try again.',
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Access your health reports and trends.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
            {errors.email ? <p className="text-xs text-danger">{errors.email.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-xs text-danger">{errors.password.message}</p>
            ) : null}
          </div>

          {formError ? (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner className="h-4 w-4" /> Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        <div className="mt-6 rounded-md border border-dashed border-border bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Demo accounts</p>
          <p>Patient — jane.doe@healthcare.test / Patient123!</p>
          <p>Admin — admin@healthcare.test / Admin123!</p>
        </div>
      </CardContent>
    </Card>
  );
}
