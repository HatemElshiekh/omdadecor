import { render, screen } from '@testing-library/react';
import { Field } from '@/components/Field';

describe('Field', () => {
  it('associates the label with the input', () => {
    render(<Field label="الاسم" />);
    expect(screen.getByLabelText('الاسم')).toBeInTheDocument();
  });

  it('shows an error and marks the input invalid', () => {
    render(<Field label="رقم الموبايل" inputMode="tel" error="خطأ" />);
    const input = screen.getByLabelText('رقم الموبايل');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('خطأ');
    expect(screen.getByRole('alert')).toHaveTextContent('خطأ');
  });

  it('renders numeric inputs LTR with the requested inputMode', () => {
    render(<Field label="الطول" inputMode="decimal" />);
    const input = screen.getByLabelText('الطول');
    expect(input).toHaveAttribute('inputmode', 'decimal');
    expect(input).toHaveAttribute('dir', 'ltr');
  });

  it('has no error state by default', () => {
    render(<Field label="الاسم" />);
    expect(screen.getByLabelText('الاسم')).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
