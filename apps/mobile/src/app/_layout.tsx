import 'react-native-url-polyfill/auto';

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 60,
            refetchOnReconnect: true,
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 1000 * 60 * 5,
          },
        },
      })
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="gold-add"
            options={{
              title: 'Thêm giao dịch vàng',
              presentation: 'formSheet',
              sheetAllowedDetents: [0.75, 1],
              sheetGrabberVisible: true,
              headerShown: true,
              headerTransparent: true,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="budget-add"
            options={{
              title: 'Thêm khoản thu chi',
              presentation: 'formSheet',
              sheetAllowedDetents: [0.72, 1],
              sheetGrabberVisible: true,
              headerShown: true,
              headerTransparent: true,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="ipad-add"
            options={{
              title: 'Nhập máy iPad',
              presentation: 'formSheet',
              sheetAllowedDetents: [0.85, 1],
              sheetGrabberVisible: true,
              headerShown: true,
              headerTransparent: true,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="rental-add"
            options={{
              title: 'Tính tiền trọ',
              presentation: 'formSheet',
              sheetAllowedDetents: [0.85, 1],
              sheetGrabberVisible: true,
              headerShown: true,
              headerTransparent: true,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="savings-add"
            options={{
              title: 'Thêm dây tích góp',
              presentation: 'formSheet',
              sheetAllowedDetents: [0.6, 1],
              sheetGrabberVisible: true,
              headerShown: true,
              headerTransparent: true,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="ipad-sell"
            options={{
              title: 'Bán máy iPad',
              presentation: 'formSheet',
              sheetAllowedDetents: [0.75, 1],
              sheetGrabberVisible: true,
              headerShown: true,
              headerTransparent: true,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          </Stack>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
