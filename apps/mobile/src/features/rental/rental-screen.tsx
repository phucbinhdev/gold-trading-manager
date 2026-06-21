import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useTheme } from '@/hooks/use-theme';
import { formatCurrency } from '@/lib/format/currency';
import { createRentalRecord, getRentalDashboard } from '@/lib/supabase/queries';

function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export default function RentalScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mobile', 'rental'],
    queryFn: getRentalDashboard,
  });

  const [month, setMonth] = useState(getCurrentMonth());
  const [electricOld, setElectricOld] = useState('');
  const [electricNew, setElectricNew] = useState('');
  const [waterOld, setWaterOld] = useState('');
  const [waterNew, setWaterNew] = useState('');

  // Auto-fill old values from latest record
  useEffect(() => {
    if (query.data?.latestRecord) {
      const rec = query.data.latestRecord;
      setElectricOld(String(rec.electric_new ?? ''));
      setWaterOld(String(rec.water_new ?? ''));
    }
  }, [query.data?.latestRecord]);

  const eOld = parseFloat(electricOld) || 0;
  const eNew = parseFloat(electricNew) || 0;
  const wOld = parseFloat(waterOld) || 0;
  const wNew = parseFloat(waterNew) || 0;

  const settings = query.data?.settings;
  const rentAmount = Number(settings?.rent_price ?? 0);
  const electricPrice = Number(settings?.electric_price ?? 0);
  const waterPrice = Number(settings?.water_price ?? 0);

  const electricUsed = Math.max(0, eNew - eOld);
  const waterUsed = Math.max(0, wNew - wOld);
  const electricAmount = electricUsed * electricPrice;
  const waterAmount = waterUsed * waterPrice;
  const total = rentAmount + electricAmount + waterAmount;

  const hasElectricNew = electricNew.trim().length > 0;
  const hasWaterNew = waterNew.trim().length > 0;
  const electricInvalid = hasElectricNew && eNew < eOld;
  const waterInvalid = hasWaterNew && wNew < wOld;

  const showResult =
    hasElectricNew &&
    hasWaterNew &&
    !electricInvalid &&
    !waterInvalid &&
    eNew > 0 &&
    wNew > 0;

  const mutation = useMutation({
    mutationFn: createRentalRecord,
    onSuccess: () => {
      if (Platform.OS === 'ios') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      void queryClient.invalidateQueries({ queryKey: ['mobile', 'rental'] });
      setMonth(getCurrentMonth());
      setElectricOld(electricNew);
      setElectricNew('');
      setWaterOld(waterNew);
      setWaterNew('');
    },
  });

  const isDark = theme.background === '#000000';

  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const inputBg = isDark ? '#2C2C2E' : '#F5F5F5';
  const borderColor = isDark ? '#3A3A3C' : '#E5E7EB';
  const textColor = theme.text;
  const secondaryText = theme.textSecondary;
  const electricSectionBg = isDark ? '#2A2200' : '#FEFCE8';
  const waterSectionBg = isDark ? '#001A2E' : '#EFF6FF';
  const electricHeaderColor = isDark ? '#FDE68A' : '#A16207';
  const waterHeaderColor = isDark ? '#93C5FD' : '#1D4ED8';

  const records = query.data ? [query.data.latestRecord].filter(Boolean) : [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: '#16A34A',
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 24,
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: '#FFFFFF',
            marginBottom: 6,
          }}
        >
          Tinh Tien Tro
        </Text>
        {settings ? (
          <Text style={{ fontSize: 13, color: '#DCFCE7', lineHeight: 18 }}>
            Phong: {formatCurrency(settings.rent_price)} | Dien: {formatCurrency(settings.electric_price)}/kWh | Nuoc: {formatCurrency(settings.water_price)}/m3
          </Text>
        ) : (
          <Text style={{ fontSize: 13, color: '#DCFCE7' }}>Dang tai cai dat...</Text>
        )}
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        {/* Form Card */}
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 20,
            padding: 16,
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          {/* Month field */}
          <View style={{ marginBottom: 4 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: secondaryText,
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Thang (YYYY-MM)
            </Text>
            <TextInput
              value={month}
              onChangeText={setMonth}
              placeholder="2025-06"
              placeholderTextColor={secondaryText}
              keyboardType="default"
              style={{
                backgroundColor: inputBg,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 11,
                fontSize: 16,
                color: textColor,
                borderWidth: 1,
                borderColor,
              }}
            />
          </View>

          {/* Electricity section */}
          <View
            style={{
              backgroundColor: electricSectionBg,
              borderRadius: 16,
              padding: 12,
              marginTop: 12,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: electricHeaderColor,
                marginBottom: 10,
              }}
            >
              Dien (kWh)
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 12, color: secondaryText, marginBottom: 4, fontWeight: '500' }}
                >
                  Chi so cu
                </Text>
                <TextInput
                  value={electricOld}
                  onChangeText={setElectricOld}
                  placeholder="0"
                  placeholderTextColor={secondaryText}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: inputBg,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 15,
                    color: textColor,
                    borderWidth: 1,
                    borderColor,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 12, color: secondaryText, marginBottom: 4, fontWeight: '500' }}
                >
                  Chi so moi
                </Text>
                <TextInput
                  value={electricNew}
                  onChangeText={setElectricNew}
                  placeholder="0"
                  placeholderTextColor={secondaryText}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: inputBg,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 15,
                    color: textColor,
                    borderWidth: 1,
                    borderColor: electricInvalid ? '#EF4444' : borderColor,
                  }}
                />
              </View>
            </View>
            {electricInvalid && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 6 }}>
                Chi so moi phai lon hon chi so cu
              </Text>
            )}
          </View>

          {/* Water section */}
          <View
            style={{
              backgroundColor: waterSectionBg,
              borderRadius: 16,
              padding: 12,
              marginTop: 10,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: waterHeaderColor,
                marginBottom: 10,
              }}
            >
              Nuoc (m3)
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 12, color: secondaryText, marginBottom: 4, fontWeight: '500' }}
                >
                  Chi so cu
                </Text>
                <TextInput
                  value={waterOld}
                  onChangeText={setWaterOld}
                  placeholder="0"
                  placeholderTextColor={secondaryText}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: inputBg,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 15,
                    color: textColor,
                    borderWidth: 1,
                    borderColor,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 12, color: secondaryText, marginBottom: 4, fontWeight: '500' }}
                >
                  Chi so moi
                </Text>
                <TextInput
                  value={waterNew}
                  onChangeText={setWaterNew}
                  placeholder="0"
                  placeholderTextColor={secondaryText}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: inputBg,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 15,
                    color: textColor,
                    borderWidth: 1,
                    borderColor: waterInvalid ? '#EF4444' : borderColor,
                  }}
                />
              </View>
            </View>
            {waterInvalid && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 6 }}>
                Chi so moi phai lon hon chi so cu
              </Text>
            )}
          </View>
        </View>

        {/* Result Card */}
        {showResult && (
          <View
            style={{
              backgroundColor: isDark ? '#052E16' : '#F0FDF4',
              borderRadius: 20,
              padding: 16,
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.3 : 0.06,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: '#16A34A',
                marginBottom: 12,
              }}
            >
              Ket qua tinh toan
            </Text>

            {/* Breakdown rows */}
            <View style={{ gap: 8, marginBottom: 14 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? '#14532D' : '#DCFCE7',
                }}
              >
                <Text style={{ fontSize: 14, color: textColor }}>Tien phong</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>
                  {formatCurrency(rentAmount)}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? '#14532D' : '#DCFCE7',
                }}
              >
                <Text style={{ fontSize: 14, color: textColor }}>
                  Tien dien {electricUsed} kWh
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>
                  {formatCurrency(electricAmount)}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontSize: 14, color: textColor }}>
                  Tien nuoc {waterUsed} m3
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>
                  {formatCurrency(waterAmount)}
                </Text>
              </View>
            </View>

            {/* Total */}
            <View
              style={{
                backgroundColor: '#16A34A',
                borderRadius: 14,
                padding: 14,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Tong cong</Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF' }}>
                {formatCurrency(total)}
              </Text>
            </View>

            {/* Save button */}
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === 'ios') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                mutation.mutate({
                  month,
                  electricOld: eOld,
                  electricNew: eNew,
                  waterOld: wOld,
                  waterNew: wNew,
                });
              }}
              disabled={mutation.isPending}
              style={{
                backgroundColor: mutation.isPending ? '#86EFAC' : '#16A34A',
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
              activeOpacity={0.8}
            >
              {mutation.isPending && <ActivityIndicator size="small" color="#FFFFFF" />}
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                {mutation.isPending ? 'Dang luu...' : 'Luu hoa don'}
              </Text>
            </TouchableOpacity>

            {mutation.isError && (
              <Text style={{ color: '#EF4444', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                Loi khi luu. Vui long thu lai.
              </Text>
            )}
          </View>
        )}

        {/* History section */}
        <View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: textColor,
              marginBottom: 10,
            }}
          >
            Lich su hoa don
          </Text>

          {query.isLoading && (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator size="small" color="#16A34A" />
            </View>
          )}

          {!query.isLoading && query.data?.latestRecord == null && (
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 16,
                padding: 20,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: secondaryText, fontSize: 14 }}>Chua co hoa don nao.</Text>
            </View>
          )}

          {!query.isLoading &&
            query.data?.latestRecord &&
            [query.data.latestRecord].map((rec) => (
              <View
                key={rec.id}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.25 : 0.06,
                  shadowRadius: 4,
                  elevation: 2,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ gap: 3 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: textColor }}>
                    {rec.month}
                  </Text>
                  <Text style={{ fontSize: 12, color: secondaryText }}>
                    Dien: {rec.electric_new - rec.electric_old} kWh | Nuoc: {rec.water_new - rec.water_old} m3
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#16A34A' }}>
                  {formatCurrency(rec.total_amount)}
                </Text>
              </View>
            ))}
        </View>
      </View>
    </ScrollView>
  );
}
