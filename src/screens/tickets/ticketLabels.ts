// SPDX-License-Identifier: Apache-2.0
import type { TicketStatus, TicketType } from '@/api/contract';
import type { useI18n } from '@/i18n/I18nProvider';
import { colors } from '@/theme';
import type { IconName } from '@/components';

type TKey = Parameters<ReturnType<typeof useI18n>['t']>[0];

/** Selectable types, in display order (locked enum, mirrors the server). */
export const TICKET_TYPES: readonly TicketType[] = [
  'geen_bereik',
  'geen_data',
  'kan_niet_bellen',
  'kan_niet_sms',
  'anders',
];

/** Every type except `anders` must be tied to an owned SIM (server rule). */
export function requiresSim(type: TicketType): boolean {
  return type !== 'anders';
}

/** i18n key for a ticket type's human label. */
export function ticketTypeLabelKey(type: TicketType): TKey {
  return `tickets.types.${type}` as TKey;
}

/** Visual config for a ticket status pill: colour, icon and label key. */
export const STATUS_CONFIG: Record<
  TicketStatus,
  { color: string; icon: IconName; key: TKey }
> = {
  open: { color: colors.textMuted, icon: 'pending', key: 'tickets.status.open' },
  in_behandeling: { color: colors.primary, icon: 'pending', key: 'tickets.status.in_behandeling' },
  opgelost: { color: colors.success, icon: 'check', key: 'tickets.status.opgelost' },
};
