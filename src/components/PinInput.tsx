// SPDX-License-Identifier: Apache-2.0
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

/** Imperative handle so screens can open/close the keyboard between PIN phases. */
export interface PinInputHandle {
  focus: () => void;
  blur: () => void;
}

interface PinInputProps {
  value: string;
  onChangeText: (next: string) => void;
  length: number;
  autoFocus?: boolean;
  hasError?: boolean;
  /** Briefly turn every dot solid green to confirm a matched/saved PIN. */
  success?: boolean;
  /**
   * Briefly outline every dot in green (no fill) to acknowledge a complete entry
   * that is being carried forward - e.g. the first PIN before the confirm step.
   * Distinct from `success`, which fills the dots to mean "done".
   */
  accepted?: boolean;
  /** Fires once the entry reaches `length` digits - use it to auto-submit. */
  onComplete?: (value: string) => void;
}

/**
 * Fixed-length numeric PIN entry rendered as filled dots.
 *
 * A real full-size TextInput is laid transparently OVER the dots (rather than a
 * 1×1 hidden input focused programmatically). Tapping the dots is therefore a
 * native tap on the input itself, which reliably opens the soft keyboard on
 * Android too - programmatic `.focus()` does not.
 */
export const PinInput = forwardRef<PinInputHandle, PinInputProps>(function PinInput(
  { value, onChangeText, length, autoFocus, hasError, success, accepted, onComplete },
  ref,
) {
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
  }));

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChangeText(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dots} pointerEvents="none">
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          return (
            <View
              key={i}
              style={[
                styles.cell,
                filled && styles.cellFilled,
                hasError && styles.cellError,
                success && styles.cellSuccess,
                // After `filled`/`success` so the green outline wins.
                accepted && styles.cellAccepted,
              ]}
            />
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        secureTextEntry
        autoFocus={autoFocus}
        maxLength={length}
        caretHidden
        // Lock the field during the green flash (entry accepted / matched) so a
        // stray keystroke can't land in the next phase before the keyboard is
        // dismissed.
        editable={!success && !accepted}
        accessibilityLabel="PIN"
        // Fully hide during the success/accepted flash: the transparent text can
        // briefly render in the default colour mid-transition on Android.
        style={[styles.input, (success || accepted) && styles.inputHidden]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  // Tall full-width band; the input fills it so a tap anywhere opens the keyboard.
  wrap: { alignSelf: 'stretch', paddingVertical: spacing.lg, justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  cell: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    borderWidth: 2,
    // Match the lock title ("Voer je pincode in"), which uses the muted tone.
    borderColor: colors.textMuted,
    backgroundColor: 'transparent',
  },
  cellFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  cellError: { borderColor: colors.danger },
  cellSuccess: { backgroundColor: colors.success, borderColor: colors.success },
  // Green ring, no fill: "got it, moving on" - not the solid-green "done".
  cellAccepted: { backgroundColor: 'transparent', borderColor: colors.success },
  // Transparent overlay: invisible (transparent text/caret) but fully tappable.
  input: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    color: 'transparent',
    textAlign: 'center',
  },
  inputHidden: { opacity: 0 },
});
