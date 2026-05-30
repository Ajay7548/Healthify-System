import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from './pagination';

const meta = (overrides) => ({ page: 1, pageSize: 10, total: 25, totalPages: 3, ...overrides });

describe('Pagination', () => {
  it('shows the current range and total', () => {
    render(<Pagination pagination={meta({ page: 2 })} onPageChange={() => {}} />);
    expect(screen.getByText('Showing 11–20 of 25')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('disables Previous on the first page', () => {
    render(<Pagination pagination={meta({ page: 1 })} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  it('disables Next on the last page', () => {
    render(<Pagination pagination={meta({ page: 3 })} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('requests the next page when Next is clicked', () => {
    const onPageChange = vi.fn();
    render(<Pagination pagination={meta({ page: 1 })} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
