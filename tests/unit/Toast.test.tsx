import { act, render, screen } from '@testing-library/react';
import { ToastProvider, TOAST_MS } from '@/components/ToastProvider';
import { useToast } from '@/components/toast-context';

function Trigger() {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast('اتسجل ✓')}>
      go
    </button>
  );
}

describe('Toast', () => {
  it('auto-dismisses after 2 seconds', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    act(() => screen.getByText('go').click());
    expect(screen.getByRole('status')).toHaveTextContent('اتسجل ✓');
    expect(TOAST_MS).toBe(2000);
    act(() => vi.advanceTimersByTime(TOAST_MS));
    expect(screen.queryByRole('status')).toBeNull();
    vi.useRealTimers();
  });
});
