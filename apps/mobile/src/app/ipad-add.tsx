import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Platform, ScrollView, View } from 'react-native';

import { IpadTransactionForm } from '@/components/native/ipad-transaction-form';
import { createIpadTransaction } from '@/lib/supabase/queries';

export default function IpadAddSheet() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createIpadTransaction,
    onSuccess: async () => {
      if (Platform.OS === 'ios') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      await queryClient.invalidateQueries({ queryKey: ['mobile', 'ipad'] });
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
        <IpadTransactionForm
          saving={mutation.isPending}
          onCancel={() => router.back()}
          onSubmit={(input) => mutation.mutateAsync(input)}
        />
      </View>
    </ScrollView>
  );
}
