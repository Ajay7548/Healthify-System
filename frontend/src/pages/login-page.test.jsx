import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@/context/auth-context';
import { LoginPage } from './login-page';

function renderLogin(login = vi.fn()) {
  render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{ user: null, status: 'unauthenticated', login, logout: vi.fn() }}
      >
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return { login };
}

describe('LoginPage', () => {
  it('shows validation errors and does not submit when fields are empty', async () => {
    const { login } = renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(await screen.findByText('Password is required')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('submits the credentials when the form is valid', async () => {
    const login = vi.fn().mockResolvedValue({ role: 'USER' });
    renderLogin(login);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Patient123!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith({ email: 'jane@example.com', password: 'Patient123!' }),
    );
  });
});
