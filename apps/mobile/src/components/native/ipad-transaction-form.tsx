import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

type IpadTransactionFormProps = {
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    purchaseDate: string;
    deviceName: string;
    storage?: string;
    color?: string;
    purchasePrice: number;
    extraCost?: number;
    loanAmount?: number;
    note?: string;
  }) => Promise<void>;
};

export function IpadTransactionForm({ saving, onCancel, onSubmit }: IpadTransactionFormProps) {
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [deviceName, setDeviceName] = useState('');
  const [storage, setStorage] = useState('');
  const [color, setColor] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [extraCost, setExtraCost] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = async () => {
    const price = parseNumber(purchasePrice);

    if (!purchaseDate || !deviceName.trim() || price <= 0) {
      Alert.alert('Thiếu dữ liệu', 'Nhập ngày, tên máy và giá mua lớn hơn 0.');
      return;
    }

    await onSubmit({
      purchaseDate,
      deviceName: deviceName.trim(),
      storage: storage.trim() || undefined,
      color: color.trim() || undefined,
      purchasePrice: price,
      extraCost: parseNumber(extraCost),
      loanAmount: parseNumber(loanAmount),
      note: note.trim() || undefined,
    });
  };

  return (
    <View style={{ gap: 12, borderRadius: 18, backgroundColor: '#FFFFFF', padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Nhập máy iPad</Text>
      <Field label="Ngày nhập" value={purchaseDate} onChangeText={setPurchaseDate} />
      <Field label="Tên máy" value={deviceName} onChangeText={setDeviceName} />
      <Field label="Dung lượng" value={storage} onChangeText={setStorage} />
      <Field label="Màu" value={color} onChangeText={setColor} />
      <Field label="Giá mua" value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="numeric" />
      <Field label="Chi phí thêm" value={extraCost} onChangeText={setExtraCost} keyboardType="numeric" />
      <Field label="Tiền nợ" value={loanAmount} onChangeText={setLoanAmount} keyboardType="numeric" />
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
