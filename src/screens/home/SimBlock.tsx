// SPDX-License-Identifier: Apache-2.0
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  useWindowDimensions,
  View,
} from 'react-native';

import { Subscription } from '@/api/contract';
import { PaginationDots } from '@/components';
import { spacing } from '@/theme';
import { SubscriptionCard } from './SubscriptionCard';

/**
 * Home SIM block: one full-width card per MSISDN, paged horizontally with
 * • • • dots (swipe is the bonus gesture). Behaviour is unchanged from the
 * original Home; it is just factored out so the adaptive Home can stack it
 * above the order/welcome blocks.
 *
 * The horizontal list lives inside a vertical scroll view, so it has no
 * intrinsic height to inherit. We measure the tallest page via onLayout and
 * lock the list to it - this adapts to dynamic font sizes instead of a fragile
 * hard-coded height.
 */
export function SimBlock({
  subscriptions,
  refreshSignal,
}: {
  subscriptions: Subscription[];
  refreshSignal?: number;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = width; // full-width pages
  const [index, setIndex] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
      setIndex((prev) => (prev === next ? prev : next));
    },
    [cardWidth],
  );

  const onPageLayout = useCallback((e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    setPageHeight((prev) => (h > prev ? h : prev));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Subscription }) => (
      <View style={{ width: cardWidth, paddingHorizontal: spacing.md }}>
        {/* Measure the card's NATURAL height here, not on the cell above: a
            horizontal FlatList stretches each cell to the list height, so
            measuring the cell self-locks pageHeight to the first (usage-loading)
            height and clips the card once the taller loaded state renders. This
            inner view is sized purely by its content, so pageHeight tracks the
            real tallest card. */}
        <View onLayout={onPageLayout}>
          <SubscriptionCard
            subscription={item}
            width={cardWidth - spacing.md * 2}
            refreshSignal={refreshSignal}
          />
        </View>
      </View>
    ),
    [cardWidth, onPageLayout, refreshSignal],
  );

  return (
    <View>
      <FlatList
        data={subscriptions}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={pageHeight > 0 ? { height: pageHeight } : undefined}
      />
      <PaginationDots count={subscriptions.length} activeIndex={index} />
    </View>
  );
}
