import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';

type SavingsFormProps = {
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    label: string;
    periodAmount: number;
    periodsLeft: number;
  }) => Promise<void>;
};

export function SavingsForm({ saving, onCancel, onSubmit }: SavingsFormProps) {
  const dark = useColorScheme() === 'dark';
  const [label, setLabel] = useState('');
  const [periodAmount, setPeriodAmount] = useState('');
  const [periodsLeft, setPeriodsLeft] = useState('');

  const labelColor = dark ? '#94A3B8' : '#64748B';
  const textColor = dark ? '#F8FAFC' : '#0F172A';
  const borderColor = dark ? '#334155' : '#E2E8F0';
  const bg = dark ? '#1E293B' : '#FFFFFF';

  const handleSubmit = async () => {
    const amount = parseNumber(periodAmount);
    const periods = parseNumber(periodsLeft);
    if (!label.trim() || amount <= 0 || periods <= 0) {
      Alert.alert('Thiếu dữ liệu', 'Nhập tên dây, số tiền mỗi kỳ và số kỳ còn lại lớn hơn 0.');
      return;
    }
    await onSubmit({ label: label.trim(), periodAmount: amount, periodsLeft: Math.round(periods) });
  };

  return (
    <View style={{ gap: 16, padding: 16 }}>
      <View style={{ backgroundColor: bg, borderRadius: 16, padding: 16, gap: 12 }}>
        <Field label="Tên dây (VD: Dây họ tháng 6)" value={label} onChangeText={setLabel} dark={dark} textColor={textColor} borderColor={borderColor} labelColor={labelColor} />
        <Field label="Số tiền mỗi kỳ" value={periodAmount} onChangeText={setPeriodAmount} keyboardType="decimal-pad" dark={dark} textColor={textColor} borderColor={borderColor} labelColor={labelColor} />
        <Field label="Số kỳ còn lại" value={periodsLeft} onChangeText={setPeriodsLeft} keyboardType="number-pad" dark={dark} textColor={textColor} borderColor={borderColor} labelColor={labelColor} />
      </View>

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
          {saving ? 'Đang lưu...' : 'Tạo dây tích góp'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onCancel} style={{ alignItems: 'center', padding: 12 }}>
        <Text style={{ color: labelColor, fontSize: 15 }}>Hủy</Text>
      </TouchableOpacity>
    </View>
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

function parseNumber(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
