import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Platform, ScrollView, View } from 'react-native';

import { GoldTransactionForm } from '@/components/native/gold-transaction-form';
import { createGoldTransaction } from '@/lib/supabase/queries';

export default function GoldAddSheet() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createGoldTransaction,
    onSuccess: async () => {
      if (Platform.OS === 'ios') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      await queryClient.invalidateQueries({ queryKey: ['mobile', 'gold'] });
      router.back();
    },
    onError: (error) => {
      Alert.alert('Không lưu được', error instanceof Error ? error.message : 'Lỗi không xác định.');
    },
  });

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingBottom: 24,
        paddingTop: 56,
      }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <GoldTransactionForm
          saving={mutation.isPending}
          onCancel={() => router.back()}
          onSubmit={(input) => mutation.mutateAsync(input)}
        />
      </View>
    </ScrollView>
  );
}
