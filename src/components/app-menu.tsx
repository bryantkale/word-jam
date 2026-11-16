import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { BACKGROUND_IDS, BACKGROUNDS, hardShadow } from '@/constants/backgrounds';
import { useAuth } from '@/providers/auth-provider';
import { useBackground } from '@/providers/background-provider';
import { getUserDisplayName } from '@/services/google-auth';
import { isSupabaseConfigured } from '@/services/supabase';

/** Hamburger button that opens the account (sign in / out) and background picker. */
export function AppMenu() {
  const insets = useSafeAreaInsets();
  const { colors, id: activeId, setBackground } = useBackground();
  const { user, isLoading, isSigningIn, isAuthenticated, clearAuthError, signIn, signOut } =
    useAuth();
  const [open, setOpen] = useState(false);

  const authDisabled = isLoading || isSigningIn || (!isAuthenticated && !isSupabaseConfigured());

  const handleAuth = async () => {
    clearAuthError();
    setOpen(false);
    try {
      if (isAuthenticated) await signOut();
      else await signIn();
    } catch {
      // The auth provider surfaces the error through authError.
    }
  };

  const bar = [styles.bar, { backgroundColor: colors.ink }];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.paper,
            borderColor: colors.ink,
            ...hardShadow(colors.ink, 2),
          },
          pressed && styles.pressed,
        ]}>
        {isSigningIn ? (
          <ActivityIndicator color={colors.ink} size="small" />
        ) : (
          <View style={styles.bars}>
            <View style={bar} />
            <View style={bar} />
            <View style={bar} />
          </View>
        )}
      </Pressable>

      <Modal
        animationType="fade"
        transparent
        visible={open}
        onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityLabel="Close menu"
          onPress={() => setOpen(false)}
          style={styles.backdrop}
        />
        <View
          pointerEvents="box-none"
          style={[styles.anchor, { paddingTop: insets.top + 8 }]}>
          <View
            style={[
              styles.panel,
              {
                backgroundColor: colors.paper,
                borderColor: colors.ink,
                ...hardShadow(colors.ink, 4),
              },
            ]}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>ACCOUNT</Text>
            {isAuthenticated && user ? (
              <Text numberOfLines={1} style={[styles.accountName, { color: colors.ink }]}>
                {getUserDisplayName(user)}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={authDisabled}
              onPress={() => void handleAuth()}
              style={({ pressed }) => [
                styles.authRow,
                { backgroundColor: colors.accent, borderColor: colors.ink },
                authDisabled && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.authText, { color: colors.ink }]}>
                {isAuthenticated ? 'Sign out' : 'Sign in with Google'}
              </Text>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.ink }]} />

            <Text style={[styles.sectionLabel, { color: colors.muted }]}>BACKGROUND</Text>
            {BACKGROUND_IDS.map(backgroundId => {
              const option = BACKGROUNDS[backgroundId];
              const selected = backgroundId === activeId;
              return (
                <Pressable
                  key={backgroundId}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Background ${backgroundId}, ${option.name}`}
                  onPress={() => setBackground(backgroundId)}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: option.colors.background, borderColor: colors.ink },
                    ]}>
                    {option.notebook ? (
                      <View style={[styles.swatchMargin, { backgroundColor: '#EE8F93' }]} />
                    ) : null}
                  </View>
                  <Text style={[styles.optionText, { color: colors.ink }]}>
                    {backgroundId} · {option.name}
                  </Text>
                  <View
                    style={[
                      styles.check,
                      { borderColor: colors.ink },
                      selected && { backgroundColor: colors.primary },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1.5,
  },
  bars: {
    gap: 4,
  },
  bar: {
    width: 18,
    height: 2,
    borderRadius: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
  backdrop: {
    ...StyleSheet.absoluteFill as object,
    backgroundColor: 'rgba(17,17,17,0.25)',
  },
  anchor: {
    flex: 1,
    alignItems: 'flex-end',
    paddingHorizontal: 20,
  },
  panel: {
    width: 268,
    maxWidth: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  authRow: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  authText: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  option: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  swatch: {
    width: 30,
    height: 30,
    overflow: 'hidden',
    borderRadius: 9,
    borderWidth: 1.5,
  },
  swatchMargin: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 7,
    width: 1.5,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
});
