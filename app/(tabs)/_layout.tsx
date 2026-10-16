import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

// History and Beneficiaries require an account (transaction history, saved
// contacts) — hidden from the tab bar until the user logs in via Profile.
// Guest checkout still works fully without ever seeing these two tabs.
export default function TabsLayout() {
  const user = useAuthStore((s) => s.user);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: Colors.divider,
          height: 60,
          paddingBottom: 6,
          paddingTop: 4,
        },
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Nunito_600SemiBold',
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarLabel: 'Wallet',
          href: user ? '/wallet' : null,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarLabel: 'History',
          href: user ? '/history' : null,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'time' : 'time-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="beneficiaries"
        options={{
          tabBarLabel: 'Contacts',
          href: user ? '/beneficiaries' : null,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
