import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';

type RentalRecordFormProps = {
  saving?: boolean;
  rentPrice: number;
  electricPrice: number;
  waterPrice: number;
  onCancel: () => void;
  onSubmit: (input: {
    month: string;
    electricOld: number;
    electricNew: number;
    waterOld: number;
    waterNew: number;
  }) => Promise<void>;
};

export function RentalRecordForm({
  saving,
  rentPrice,
  electricPrice,
  waterPrice,
  onCancel,
  onSubmit,
}: RentalRecordFormProps) {
  const dark = useColorScheme() === 'dark';
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [electricOld, setElectricOld] = useState('');
  const [electricNew, setElectricNew] = useState('');
  const [waterOld, setWaterOld] = useState('');
  const [waterNew, setWaterNew] = useState('');

  const eOld = parseNumber(electricOld);
  const eNew = parseNumber(electricNew);
  const wOld = parseNumber(waterOld);
  const wNew = parseNumber(waterNew);
  const electricUsed = Math.max(0, eNew - eOld);
  const waterUsed = Math.max(0, wNew - wOld);
  const electricAmount = electricUsed * electricPrice;
  const waterAmount = waterUsed * waterPrice;
  const total = rentPrice + electricAmount + waterAmount;

  const bg = dark ? '#1E293B' : '#FFFFFF';
  const labelColor = dark ? '#94A3B8' : '#64748B';
  const textColor = dark ? '#F8FAFC' : '#0F172A';
  const borderColor = dark ? '#334155' : '#E2E8F0';

  const handleSubmit = async () => {
    if (!month || eNew < eOld || wNew < wOld) {
      Alert.alert('Dữ liệu không hợp lệ', 'Kiểm tra tháng và chỉ số điện/nước mới ≥ cũ.');
      return;
    }
    await onSubmit({ month, electricOld: eOld, electricNew: eNew, waterOld: wOld, waterNew: wNew });
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, padding: 16 }}>
      <View style={{ backgroundColor: bg, borderRadius: 16, padding: 16, gap: 12 }}>
        <Field label="Tháng (YYYY-MM)" value={month} onChangeText={setMonth} dark={dark} textColor={textColor} borderColor={borderColor} labelColor={labelColor} />
        <Field label="Điện cũ (kWh)" value={electricOld} onChangeText={setElectricOld} keyboardType="decimal-pad" dark={dark} textColor={textColor} borderColor={borderColor} labelColor={labelColor} />
        <Field label="Điện mới (kWh)" value={electricNew} onChangeText={setElectricNew} keyboardType="decimal-pad" dark={dark} textColor={textColor} borderColor={borderColor} labelColor={labelColor} />
        <Field label="Nước cũ (m³)" value={waterOld} onChangeText={setWaterOld} keyboardType="decimal-pad" dark={dark} textColor={textColor} borderColor={borderColor} labelColor={labelColor} />
        <Field label="Nước mới (m³)" value={waterNew} onChangeText={setWaterNew} keyboardType="decimal-pad" dark={dark} textColor={textColor} borderColor={borderColor} labelColor={labelColor} />
      </View>

      {(electricNew || waterNew) ? (
        <View style={{ backgroundColor: dark ? '#0C1A2E' : '#EFF6FF', borderRadius: 16, padding: 16, gap: 6 }}>
          <Text style={{ color: dark ? '#93C5FD' : '#1D4ED8', fontWeight: '700', marginBottom: 4 }}>Tạm tính</Text>
          <SummaryRow label="Tiền phòng" value={fmt(rentPrice)} dark={dark} />
          <SummaryRow label={`Điện (${electricUsed} kWh)`} value={fmt(electricAmount)} dark={dark} />
          <SummaryRow label={`Nước (${waterUsed} m³)`} value={fmt(waterAmount)} dark={dark} />
          <SummaryRow label="Tổng cộng" value={fmt(total)} dark={dark} bold />
        </View>
      ) : null}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={saving}
        style={{
          backgroundColor: '#2563EB',
          borderRadius: 14,
          padding: 16,
          alignItems: 'center',
          opacity: saving ? 0.6 : 1,
        }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
          {saving ? 'Đang lưu...' : 'Lưu hóa đơn'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onCancel} style={{ alignItems: 'center', padding: 12 }}>
        <Text style={{ color: labelColor, fontSize: 15 }}>Hủy</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  dark,
  textColor,
  borderColor,
  labelColor,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'decimal-pad' | 'number-pad';
  dark: boolean;
  textColor: string;
  borderColor: string;
  labelColor: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: labelColor, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        style={{
          borderWidth: 1,
          borderColor,
          borderRadius: 10,
          padding: 12,
          color: textColor,
          fontSize: 15,
        }}
      />
    </View>
  );
}

function SummaryRow({ label, value, dark, bold }: { label: string; value: string; dark: boolean; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: dark ? '#94A3B8' : '#475569', fontSize: 13, fontWeight: bold ? '700' : '400' }}>{label}</Text>
      <Text style={{ color: dark ? '#F8FAFC' : '#0F172A', fontSize: 13, fontWeight: bold ? '800' : '600' }}>{value}</Text>
    </View>
  );
}

function parseNumber(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫';
}
