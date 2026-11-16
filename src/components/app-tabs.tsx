import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { hardShadow } from '@/constants/backgrounds';
import { useBackground } from '@/providers/background-provider';

const ICONS = {
  index: require('@/assets/images/tabIcons/home.png'),
  explore: require('@/assets/images/tabIcons/explore.png'),
};

function TabButton({
  children,
  icon,
  isFocused,
  ref,
  ...props
}: TabTriggerSlotProps & { icon: number }) {
  void ref;
  const { colors } = useBackground();
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: Boolean(isFocused) }}
      style={({ pressed }) => [
        styles.tab,
        isFocused && {
          backgroundColor: colors.accent,
          borderColor: colors.ink,
          ...hardShadow(colors.ink, 2),
        },
        pressed && styles.pressed,
      ]}>
      <Image
        source={icon}
        style={[styles.icon, { tintColor: colors.ink }]}
        accessibilityElementsHidden
      />
      <Text style={[styles.label, { color: colors.ink, fontWeight: isFocused ? '700' : '600' }]}>
        {children}
      </Text>
    </Pressable>
  );
}

export default function AppTabs() {
  const { colors } = useBackground();
  const insets = useSafeAreaInsets();

  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <View
          style={StyleSheet.flatten([
            styles.bar,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.ink,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ])}>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon={ICONS.index}>Search</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton icon={ICONS.explore}>My words</TabButton>
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  slot: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 2,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  icon: {
    width: 20,
    height: 20,
  },
  label: {
    fontSize: 14,
  },
  pressed: {
    opacity: 0.75,
  },
});
