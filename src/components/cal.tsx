import { ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
  ScrollView,
  ScrollViewProps,
  Text,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, type } from '@/lib/design';

type Variant = keyof typeof type;

export function AppText({
  variant = 'bodyMd',
  color,
  style,
  ...props
}: TextProps & { variant?: Variant; color?: string }) {
  return (
    <Text
      {...props}
      style={[type[variant], color ? { color } : null, style]}
    />
  );
}

export function Screen({ children, style, ...props }: ScrollViewProps) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      style={[{ backgroundColor: colors.canvas }, style]}
      contentContainerStyle={{
        padding: spacing.md,
        paddingBottom: spacing.xxl,
        gap: spacing.md,
      }}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

export function Card({
  children,
  tone = 'card',
  style,
}: {
  children: ReactNode;
  tone?: 'card' | 'canvas' | 'dark';
  style?: ViewStyle;
}) {
  const toneStyle: ViewStyle =
    tone === 'dark'
      ? { backgroundColor: colors.surfaceDark }
      : tone === 'canvas'
        ? { backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.hairline }
        : { backgroundColor: colors.surfaceCard };
  return (
    <View
      style={[
        {
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          padding: spacing.lg,
          gap: spacing.sm,
        },
        toneStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

function haptic() {
  if (process.env.EXPO_OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
  icon,
  ...props
}: Omit<PressableProps, 'children'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: ReactNode;
}) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPress={(e) => {
        haptic();
        onPress?.(e);
      }}
      style={({ pressed }) => {
        const base: ViewStyle = {
          height: 46,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.xs,
          paddingHorizontal: spacing.lg,
        };
        if (variant === 'secondary') {
          return [
            base,
            {
              backgroundColor: pressed ? colors.surfaceSoft : colors.canvas,
              borderWidth: 1,
              borderColor: colors.hairline,
            },
            style as ViewStyle,
          ];
        }
        if (variant === 'danger') {
          return [
            base,
            { backgroundColor: pressed ? '#dc2626' : colors.error },
            style as ViewStyle,
          ];
        }
        return [
          base,
          {
            backgroundColor: disabled
              ? colors.primaryDisabled
              : pressed
                ? colors.primaryActive
                : colors.primary,
          },
          style as ViewStyle,
        ];
      }}
    >
      {icon}
      <AppText
        variant="button"
        color={
          variant === 'secondary'
            ? disabled
              ? colors.muted
              : colors.ink
            : disabled
              ? colors.muted
              : colors.onPrimary
        }
      >
        {title}
      </AppText>
    </Pressable>
  );
}

export function Badge({
  label,
  color = colors.surfaceStrong,
  textColor = colors.ink,
}: {
  label: string;
  color?: string;
  textColor?: string;
}) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: color,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
      }}
    >
      <AppText variant="caption" color={textColor}>
        {label}
      </AppText>
    </View>
  );
}

// Progress through the spaced-repetition stages.
export function StageDots({ stage, total }: { stage: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xxs }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: radius.full,
            backgroundColor: i < stage ? colors.primary : colors.surfaceStrong,
          }}
        />
      ))}
    </View>
  );
}
