import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

type GoldTransactionFormProps = {
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    transactionDate: string;
    amountChi: number;
    pricePerChi: number;
    note?: string;
  }) => Promise<void>;
};

export function GoldTransactionForm({ saving, onCancel, onSubmit }: GoldTransactionFormProps) {
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [amountChi, setAmountChi] = useState('');
  const [pricePerChi, setPricePerChi] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = async () => {
    const amount = parseNumber(amountChi);
    const price = parseNumber(pricePerChi);

    if (!transactionDate || amount <= 0 || price <= 0) {
      Alert.alert('Thiếu dữ liệu', 'Nhập ngày, số chỉ và giá mỗi chỉ lớn hơn 0.');
      return;
    }

    await onSubmit({
      transactionDate,
      amountChi: amount,
      pricePerChi: price,
      note: note.trim() || undefined,
    });
  };

  return (
    <View style={{ gap: 12, borderRadius: 18, backgroundColor: '#FFFFFF', padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Giao dịch vàng</Text>
      <Field label="Ngày giao dịch" value={transactionDate} onChangeText={setTransactionDate} />
      <Field label="Số chỉ" value={amountChi} onChangeText={setAmountChi} keyboardType="decimal-pad" />
      <Field label="Giá mỗi chỉ" value={pricePerChi} onChangeText={setPricePerChi} keyboardType="numeric" />
      <Field label="Ghi chú" value={note} onChangeText={setNote} multiline />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label={saving ? 'Đang lưu...' : 'Lưu'} onPress={handleSubmit} prominent />
        <Button label="Hủy" onPress={onCancel} />
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={label}
      keyboardType={keyboardType}
      multiline={multiline}
      style={{
        minHeight: multiline ? 86 : 48,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        color: '#111827',
        fontSize: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    />
  );
}

function Button({
  label,
  onPress,
  prominent,
}: {
  label: string;
  onPress: () => void;
  prominent?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 999,
        backgroundColor: prominent ? '#111827' : '#E5E7EB',
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: 18,
        paddingVertical: 11,
      })}>
      <Text style={{ color: prominent ? '#FFFFFF' : '#111827', fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}

function parseNumber(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}
