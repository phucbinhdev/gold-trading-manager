import SwiftUI
import LocalAuthentication
import Observation

/// Quản lý khóa sinh trắc học (Face ID / Touch ID / mật mã thiết bị) cho toàn app.
/// Trạng thái bật/tắt lưu trong UserDefaults; trạng thái mở khóa chỉ tồn tại trong phiên.
@MainActor
@Observable
final class AppLockManager {
    /// Người dùng đã bật khóa.
    private(set) var isEnabled: Bool
    /// Phiên hiện tại đã mở khóa (không lưu — khóa lại mỗi khi vào nền).
    private(set) var isUnlocked = false
    /// Đang chờ hộp thoại xác thực.
    private(set) var isAuthenticating = false

    private static let enabledKey = "app_lock_enabled"

    init() {
        isEnabled = UserDefaults.standard.bool(forKey: Self.enabledKey)
    }

    /// Có cần che nội dung bằng màn khóa không.
    var isLocked: Bool { isEnabled && !isUnlocked }

    /// Thiết bị có thể xác thực (sinh trắc học hoặc mật mã) không.
    var biometryAvailable: Bool {
        LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: nil)
    }

    /// Tên loại xác thực để hiển thị: "Face ID", "Touch ID" hoặc "mật mã".
    var biometryTypeName: String {
        let context = LAContext()
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        switch context.biometryType {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        default: return "mật mã"
        }
    }

    /// Khóa lại — gọi khi app chuyển vào nền.
    func lock() {
        guard isEnabled else { return }
        isUnlocked = false
    }

    /// Hiện hộp thoại xác thực để mở khóa.
    func authenticate() async {
        guard isEnabled, !isUnlocked, !isAuthenticating else { return }
        isAuthenticating = true
        defer { isAuthenticating = false }

        let context = LAContext()
        context.localizedFallbackTitle = "Nhập mật mã"

        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: nil) else {
            // Không có sinh trắc/mật mã: mở luôn để không khóa cứng người dùng.
            isUnlocked = true
            return
        }

        let success = await Self.evaluate(context, reason: "Mở khóa Quản Lý Vàng")
        if success { isUnlocked = true }
    }

    /// Bật khóa. Không khóa ngay (đang ở trong app) — hiệu lực từ lần mở lại sau.
    func enable() {
        setEnabled(true)
        isUnlocked = true
    }

    /// Tắt khóa.
    func disable() {
        setEnabled(false)
        isUnlocked = true
    }

    private func setEnabled(_ value: Bool) {
        isEnabled = value
        UserDefaults.standard.set(value, forKey: Self.enabledKey)
    }

    /// Bọc API completion-handler của LocalAuthentication thành async.
    private static func evaluate(_ context: LAContext, reason: String) async -> Bool {
        await withCheckedContinuation { continuation in
            context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, _ in
                continuation.resume(returning: success)
            }
        }
    }
}

// MARK: - Màn khóa

/// Che toàn bộ nội dung khi app đang khóa, kèm nút mở khóa thủ công.
struct LockScreenView: View {
    @Environment(AppLockManager.self) private var appLock

    var body: some View {
        ZStack {
            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea()
            VStack(spacing: 18) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 46, weight: .bold))
                    .foregroundStyle(AppTheme.accent)
                Text("Đã khóa")
                    .font(.title2.weight(.bold))
                Text("Xác thực bằng \(appLock.biometryTypeName) để tiếp tục")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                Button {
                    Task { await appLock.authenticate() }
                } label: {
                    Label("Mở khóa", systemImage: "faceid")
                        .font(.headline)
                        .padding(.horizontal, 26)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
                .disabled(appLock.isAuthenticating)
            }
            .padding(40)
        }
    }
}

/// Lớp mờ che nội dung nhạy cảm khi app ở trình chuyển ứng dụng (multitasking).
struct PrivacyCoverView: View {
    var body: some View {
        ZStack {
            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea()
            Image(systemName: "lock.fill")
                .font(.system(size: 40, weight: .bold))
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - Cài đặt

/// Màn cài đặt nhỏ (mở từ Tổng quan): hiện chứa công tắc khóa sinh trắc học.
struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppLockManager.self) private var appLock

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle(isOn: faceIDBinding) {
                        Label("Khóa bằng \(appLock.biometryTypeName)", systemImage: "faceid")
                    }
                    .disabled(!appLock.biometryAvailable)
                } header: {
                    Text("Bảo mật")
                } footer: {
                    Text(appLock.biometryAvailable
                         ? "Yêu cầu xác thực mỗi khi mở lại app."
                         : "Thiết bị chưa thiết lập Face ID, Touch ID hoặc mật mã.")
                }
            }
            .navigationTitle("Cài đặt")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Xong") { dismiss() }
                }
            }
        }
    }

    private var faceIDBinding: Binding<Bool> {
        Binding(
            get: { appLock.isEnabled },
            set: { newValue in
                if newValue {
                    appLock.enable()
                } else {
                    appLock.disable()
                }
            }
        )
    }
}
