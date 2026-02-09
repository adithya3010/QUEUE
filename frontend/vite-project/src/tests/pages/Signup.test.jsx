import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Signup from '../../pages/Signup';
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

describe('Signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render signup form correctly', () => {
    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    expect(screen.getByText('Doctor Signup')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Specialization')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('should have a link to login page', () => {
    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    const loginLink = screen.getByText(/login/i);
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it('should update all form fields on input', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    const nameInput = screen.getByPlaceholderText('Name');
    const specializationInput = screen.getByPlaceholderText('Specialization');
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');

    await user.type(nameInput, 'Dr. John Doe');
    await user.type(specializationInput, 'Cardiology');
    await user.type(emailInput, 'doctor@example.com');
    await user.type(passwordInput, 'Password123');

    expect(nameInput).toHaveValue('Dr. John Doe');
    expect(specializationInput).toHaveValue('Cardiology');
    expect(emailInput).toHaveValue('doctor@example.com');
    expect(passwordInput).toHaveValue('Password123');
  });

  it('should handle successful signup', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      data: {
        message: 'Signup successful',
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
        <Signup />
      </BrowserRouter>
    );

    const nameInput = screen.getByPlaceholderText('Name');
    const specializationInput = screen.getByPlaceholderText('Specialization');
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const signupButton = screen.getByRole('button', { name: /create account/i });

    await user.type(nameInput, 'Dr. Test');
    await user.type(specializationInput, 'General Medicine');
    await user.type(emailInput, 'doctor@example.com');
    await user.type(passwordInput, 'Password123');
    await user.click(signupButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/signup', {
        name: 'Dr. Test',
        specialization: 'General Medicine',
        email: 'doctor@example.com',
        password: 'Password123'
      });
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/signup successful/i)).toBeInTheDocument();
    });

    // Should redirect after timeout
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    }, { timeout: 1500 });
  });

  it('should display error message on signup failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Email already exists';

    api.post.mockRejectedValueOnce({
      response: {
        data: {
          message: errorMessage
        }
      }
    });

    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    const nameInput = screen.getByPlaceholderText('Name');
    const specializationInput = screen.getByPlaceholderText('Specialization');
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const signupButton = screen.getByRole('button', { name: /create account/i });

    await user.type(nameInput, 'Dr. Test');
    await user.type(specializationInput, 'Cardiology');
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'Password123');
    await user.click(signupButton);

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
        <Signup />
      </BrowserRouter>
    );

    const nameInput = screen.getByPlaceholderText('Name');
    const specializationInput = screen.getByPlaceholderText('Specialization');
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const signupButton = screen.getByRole('button', { name: /create account/i });

    await user.type(nameInput, 'Dr. Test');
    await user.type(specializationInput, 'Neurology');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'test123');
    await user.click(signupButton);

    await waitFor(() => {
      expect(screen.getByText('Signup failed')).toBeInTheDocument();
    });
  });

  it('should require all form fields', () => {
    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    const nameInput = screen.getByPlaceholderText('Name');
    const specializationInput = screen.getByPlaceholderText('Specialization');
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');

    expect(nameInput).toBeRequired();
    expect(specializationInput).toBeRequired();
    expect(emailInput).toBeRequired();
    expect(passwordInput).toBeRequired();
  });

  it('should use email input type for email field', () => {
    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText('Email');
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('should use password input type for password field', () => {
    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    const passwordInput = screen.getByPlaceholderText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
