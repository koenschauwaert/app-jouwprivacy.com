// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

import { OrdersScreen } from '@/screens/orders/OrdersScreen';
import { I18nProvider } from '@/i18n/I18nProvider';
import { api } from '@/api';
import type { Order } from '@/api/contract';

/**
 * Regression: the BFF returns `deletionDate: null` for orders whose retention
 * date is not yet exposed. The screen must render those orders WITHOUT a
 * deletion notice - never a bogus "01-01-1970".
 */

const NO_SHIPMENT = {
  trackingUrl: null,
  carrier: null,
  estimatedDelivery: null,
  deliveredAt: null,
} as const;

const ORDERS: Order[] = [
  {
    id: 'ord_dated',
    type: 'subscription',
    description: 'Freedom - 1 jaar',
    priceCents: 17988,
    currency: 'EUR',
    orderedAt: '2025-09-01T10:12:00Z',
    status: 'delivered',
    invoiceId: 'inv_1',
    deletionDate: '2032-12-31',
    retentionCategory: 'invoice_fiscal_7y',
    ...NO_SHIPMENT,
  },
  {
    id: 'ord_null',
    type: 'subscription',
    description: 'Stealth - 1 maand',
    priceCents: 1499,
    currency: 'EUR',
    orderedAt: '2025-11-15T14:25:00Z',
    status: 'delivered',
    invoiceId: null,
    deletionDate: null,
    retentionCategory: 'pending_confirmation',
    ...NO_SHIPMENT,
  },
];

function renderOrders() {
  render(
    <I18nProvider initialLanguage="en">
      <OrdersScreen />
    </I18nProvider>,
  );
}

describe('OrdersScreen retention notice', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows the deletion notice only for orders with a known deletionDate', async () => {
    jest.spyOn(api, 'getOrders').mockResolvedValue(ORDERS);
    const withDate = ORDERS.filter((o) => o.deletionDate !== null);

    renderOrders();

    // One notice per dated order; none for the null-date order(s).
    await waitFor(() =>
      expect(screen.getAllByText(/We automatically delete this data on/)).toHaveLength(
        withDate.length,
      ),
    );
    // And the epoch fallback never leaks into the UI.
    expect(screen.queryByText(/1970/)).toBeNull();
  });
});
