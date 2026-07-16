// SPDX-License-Identifier: Apache-2.0
import { requiresSim, TICKET_TYPES, ticketTypeLabelKey } from '@/screens/tickets/ticketLabels';

describe('ticketLabels', () => {
  it('requires a SIM for every type except "anders"', () => {
    expect(requiresSim('geen_bereik')).toBe(true);
    expect(requiresSim('geen_data')).toBe(true);
    expect(requiresSim('kan_niet_bellen')).toBe(true);
    expect(requiresSim('kan_niet_sms')).toBe(true);
    expect(requiresSim('anders')).toBe(false);
  });

  it('exposes exactly the five locked types, with "anders" last', () => {
    expect(TICKET_TYPES).toEqual([
      'geen_bereik',
      'geen_data',
      'kan_niet_bellen',
      'kan_niet_sms',
      'anders',
    ]);
  });

  it('maps a type to its i18n label key', () => {
    expect(ticketTypeLabelKey('geen_data')).toBe('tickets.types.geen_data');
    expect(ticketTypeLabelKey('anders')).toBe('tickets.types.anders');
  });
});
