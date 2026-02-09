import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import DoctorLogin from '../../pages/DoctorLogin';
import api from '../../services/api';

// Mock the api module
vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn()
  }
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('DoctorLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render login form correctly', () => {
    render(
      <BrowserRouter>
        <DoctorLogin />
      </BrowserRouter>
    );

    expect(screen.getByText('Doctor Login')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should have a link to signup page', () => {
    render(
      <BrowserRouter>
        <DoctorLogin />
      </BrowserRouter>
    );

    const signupLink = screen.getByText(/signup/i);
    expect(signupLink).toBeInTheDocument();
    expect(signupLink.closest('a')).toHaveAttribute('href', '/signup');
  });

  it('should update email and password fields on input', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <DoctorLogin />
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');

    await user.type(emailInput, 'doctor@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('doctor@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('should handle successful login', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      data: {
        message: 'Login successful',
        doctor: {
          id: '123',
          name: 'Dr. Test',
          email: 'doctor@example.com'
        }
      }
    };

    api.post.mockResolvedValueOnce(mockResponse);

    render(
      <BrowserRouter>
        <DoctorLogin />
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const loginButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'doctor@example.com');
    await user.type(passwordInput, 'Password123');
    await user.click(loginButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'doctor@example.com',
        password: 'Password123'
      });
      expect(localStorage.setItem).toHaveBeenCalledWith('doctorId', '123');
      expect(mockNavigate).toHaveBeenCalledWith('/reception');
    });
  });

  it('should display error message on login failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Invalid credentials';

    api.post.mockRejectedValueOnce({
      response: {
        data: {
          message: errorMessage
        }
      }
    });

    render(
      <BrowserRouter>
        <DoctorLogin />
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const loginButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should display generic error message when response has no message', async () => {
    const user = userEvent.setup();

    api.post.mockRejectedValueOnce({
      response: {}
    });

    render(
      <BrowserRouter>
        <DoctorLogin />
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const loginButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'test123');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Login failed')).toBeInTheDocument();
    });
  });

  it('should require both email and password fields', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <DoctorLogin />
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');

    expect(emailInput).toBeRequired();
    expect(passwordInput).toBeRequired();
  });

  it('should use email input type for email field', () => {
    render(
      <BrowserRouter>
        <DoctorLogin />
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText('Email');
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('should use password input type for password field', () => {
    render(
      <BrowserRouter>
        <DoctorLogin />
      </BrowserRouter>
    );

    const passwordInput = screen.getByPlaceholderText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
