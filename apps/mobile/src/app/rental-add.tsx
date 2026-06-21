import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Platform, ScrollView, View } from 'react-native';

import { RentalRecordForm } from '@/components/native/rental-record-form';
import { createRentalRecord, getRentalDashboard } from '@/lib/supabase/queries';
import { LoadingState } from '@/components/dashboard/screen';

export default function RentalAddSheet() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ['mobile', 'rental'], queryFn: getRentalDashboard });

  const mutation = useMutation({
    mutationFn: createRentalRecord,
    onSuccess: async () => {
      if (Platform.OS === 'ios') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await queryClient.invalidateQueries({ queryKey: ['mobile', 'rental'] });
      router.back();
    },
    onError: (error) => {
      Alert.alert('Không lưu được', error instanceof Error ? error.message : 'Lỗi không xác định.');
    },
  });

  const settings = settingsQuery.data?.settings;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: 40,
        paddingTop: 56,
      }}>
      {settingsQuery.isLoading ? (
        <LoadingState />
      ) : (
        <View style={{ flex: 1 }}>
          <RentalRecordForm
            saving={mutation.isPending}
            rentPrice={Number(settings?.rent_price ?? 0)}
            electricPrice={Number(settings?.electric_price ?? 0)}
            waterPrice={Number(settings?.water_price ?? 0)}
            onCancel={() => router.back()}
            onSubmit={(input) => mutation.mutateAsync(input)}
          />
        </View>
      )}
    </ScrollView>
  );
}
