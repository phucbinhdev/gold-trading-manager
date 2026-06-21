import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

type BudgetRecordType = 'expense' | 'income';

type BudgetRecordFormProps = {
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    recordType: BudgetRecordType;
    name: string;
    amount: number;
    note?: string;
  }) => Promise<void>;
};

export function BudgetRecordForm({ saving, onCancel, onSubmit }: BudgetRecordFormProps) {
  const [recordType, setRecordType] = useState<BudgetRecordType>('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = async () => {
    const parsedAmount = parseNumber(amount);

    if (!name.trim() || parsedAmount <= 0) {
      Alert.alert('Thiếu dữ liệu', 'Nhập tên khoản và số tiền lớn hơn 0.');
      return;
    }

    await onSubmit({
      recordType,
      name: name.trim(),
      amount: parsedAmount,
      note: note.trim() || undefined,
    });
  };

  return (
    <View style={{ gap: 12, borderRadius: 18, backgroundColor: '#FFFFFF', padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Khoản thu chi</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <SegmentButton label="Chi" selected={recordType === 'expense'} onPress={() => setRecordType('expense')} />
        <SegmentButton label="Thu" selected={recordType === 'income'} onPress={() => setRecordType('income')} />
      </View>
      <Field label="Tên khoản" value={name} onChangeText={setName} />
      <Field label="Số tiền" value={amount} onChangeText={setAmount} keyboardType="numeric" />
      <Field label="Ghi chú" value={note} onChangeText={setNote} multiline />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label={saving ? 'Đang lưu...' : 'Lưu'} onPress={handleSubmit} prominent />
        <Button label="Hủy" onPress={onCancel} />
      </View>
    </View>
  );
}

function SegmentButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 12,
        backgroundColor: selected ? '#111827' : '#E5E7EB',
        paddingVertical: 10,
        alignItems: 'center',
      }}>
      <Text style={{ color: selected ? '#FFFFFF' : '#111827', fontWeight: '800' }}>{label}</Text>
    </Pressable>
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
