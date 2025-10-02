import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { ImportTourDialog } from '../ImportTourDialog';

const storeMocks = vi.hoisted(() => {
  const companies = [
    { id: 'c1', name: 'Company A' },
    { id: 'c2', name: 'Company B' },
  ];

  const guides = [
    { id: 'g1', name: 'Guide Alpha' },
  ];

  const nationalities = [
    { id: 'n1', name: 'United States', iso2: 'US' },
  ];

  return {
    companies,
    guides,
    nationalities,
    listCompanies: vi.fn(async () => companies),
    listGuides: vi.fn(async () => guides),
    listNationalities: vi.fn(async () => nationalities),
  };
});

const { listCompanies, listGuides, listNationalities } = storeMocks;

vi.mock('@/lib/datastore', () => ({
  store: {
    listCompanies: storeMocks.listCompanies,
    listGuides: storeMocks.listGuides,
    listNationalities: storeMocks.listNationalities,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    message: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/components/tours/ImportTourReview', () => ({
  ImportTourReview: ({ items }: { items: any[] }) => (
    <div data-testid="review-count">{items.length}</div>
  ),
}));

describe('ImportTourDialog', () => {
  it('loads master data once when importing multiple tours', async () => {
    render(<ImportTourDialog onImport={vi.fn()} />);

    const openButton = screen.getByRole('button', { name: /import json/i });
    await userEvent.click(openButton);

    await waitFor(() => expect(listCompanies).toHaveBeenCalledTimes(1));
    expect(listGuides).toHaveBeenCalledTimes(1);
    expect(listNationalities).toHaveBeenCalledTimes(1);

    const textarea = await screen.findByLabelText('JSON Data');

    const jsonTours = JSON.stringify([
      {
        tour: {
          tourCode: 'T-001',
          company: 'Company A',
          tourGuide: 'Guide Alpha',
          clientNationality: 'United States',
          clientName: 'Alice',
          startDate: '2025-01-01',
          endDate: '2025-01-03',
        },
      },
      {
        tour: {
          tourCode: 'T-002',
          company: 'Company B',
          tourGuide: 'Guide Alpha',
          clientNationality: 'US',
          clientName: 'Bob',
          startDate: '2025-02-01',
          endDate: '2025-02-02',
        },
      },
    ]);

    fireEvent.change(textarea, { target: { value: jsonTours } });

    const parseButton = await screen.findByRole('button', { name: /parse & review/i });
    await userEvent.click(parseButton);

    const review = await screen.findByTestId('review-count');
    expect(review.textContent).toBe('2');

    expect(listCompanies).toHaveBeenCalledTimes(1);
    expect(listGuides).toHaveBeenCalledTimes(1);
    expect(listNationalities).toHaveBeenCalledTimes(1);
  });
});
