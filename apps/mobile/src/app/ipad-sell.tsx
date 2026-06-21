import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Platform, ScrollView, View } from 'react-native';

import { IpadSellForm } from '@/components/native/ipad-sell-form';
import { getIpadDashboard, sellIpadTransaction } from '@/lib/supabase/queries';
import { EmptyState, LoadingState } from '@/components/dashboard/screen';

export default function IpadSellSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const ipadQuery = useQuery({ queryKey: ['mobile', 'ipad'], queryFn: getIpadDashboard });
  const transaction = ipadQuery.data?.transactions.find((t) => t.id === id);

  const mutation = useMutation({
    mutationFn: (input: { sellingPrice: number; note?: string }) =>
      sellIpadTransaction({
        id: id!,
        sellingPrice: input.sellingPrice,
        totalCost: Number(transaction?.total_cost ?? 0),
        note: input.note,
      }),
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
        {ipadQuery.isLoading ? (
          <LoadingState />
        ) : !transaction ? (
          <EmptyState message="Không tìm thấy máy." />
        ) : (
          <IpadSellForm
            deviceName={transaction.device_name}
            totalCost={Number(transaction.total_cost ?? 0)}
            saving={mutation.isPending}
            onCancel={() => router.back()}
            onSubmit={(input) => mutation.mutateAsync(input)}
          />
        )}
      </View>
    </ScrollView>
  );
}
