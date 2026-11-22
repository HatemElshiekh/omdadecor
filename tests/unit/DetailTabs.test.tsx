import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home, MessageSquareQuote, Ruler, Wrench } from 'lucide-react';
import { DetailTabs, type DetailTab } from '@/components/DetailTabs';
import { ar } from '@/i18n/ar';

const tabs: DetailTab[] = [
  { id: 'size', label: ar.tabs.size, icon: Ruler, content: 'size-body' },
  { id: 'where', label: ar.tabs.where, icon: Home, content: 'where-body' },
  { id: 'pitch', label: ar.tabs.pitch, icon: MessageSquareQuote, content: 'pitch-body' },
  { id: 'install', label: ar.tabs.install, icon: Wrench, content: 'install-body' },
];

describe('DetailTabs', () => {
  it('opens the first tab by default', () => {
    render(<DetailTabs tabs={tabs} />);
    expect(screen.getByRole('button', { name: ar.tabs.size })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('size-body')).toBeInTheDocument();
  });

  it('keeps only one tab open at a time', async () => {
    render(<DetailTabs tabs={tabs} />);
    await userEvent.click(screen.getByRole('button', { name: ar.tabs.pitch }));
    expect(screen.getByText('pitch-body')).toBeInTheDocument();
    expect(screen.queryByText('size-body')).toBeNull();
    const expanded = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-expanded') === 'true');
    expect(expanded).toHaveLength(1);
  });

  it('collapses when the open tile is tapped again', async () => {
    render(<DetailTabs tabs={tabs} />);
    await userEvent.click(screen.getByRole('button', { name: ar.tabs.size }));
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('labels the panel with the active tile', () => {
    render(<DetailTabs tabs={tabs} defaultOpenId="install" />);
    expect(screen.getByRole('region', { name: ar.tabs.install })).toHaveTextContent('install-body');
  });
});
