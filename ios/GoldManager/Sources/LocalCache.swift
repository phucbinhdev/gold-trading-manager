import Foundation

/// Lưu/đọc dữ liệu Codable dạng JSON trong thư mục Caches để hiển thị khi ngoại tuyến.
/// Cache là "tốt-nhất-có-thể": mọi lỗi đọc/ghi đều bị bỏ qua, không làm hỏng luồng chính.
enum LocalCache {
    private static let directory: URL = {
        let base = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        let dir = base.appendingPathComponent("GoldManagerCache", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }()

    private static func fileURL(_ key: String) -> URL {
        directory.appendingPathComponent("\(key).json")
    }

    static func save<T: Encodable>(_ value: T, key: String) {
        guard let data = try? encoder.encode(value) else { return }
        try? data.write(to: fileURL(key), options: .atomic)
    }

    static func load<T: Decodable>(_ type: T.Type, key: String) -> T? {
        guard let data = try? Data(contentsOf: fileURL(key)) else { return nil }
        return try? decoder.decode(type, from: data)
    }

    // Ngày encode dạng ISO-8601; khi decode chấp nhận cả "yyyy-MM-dd" lẫn ISO-8601
    // để khớp với các model dùng chung với Supabase (xem DateFormatters).
    private static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    private static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let value = try decoder.singleValueContainer().decode(String.self)
            if value.count == 10, let date = DateFormatters.parseDatabaseDay(value) {
                return date
            }
            if let date = DateFormatters.parseISO8601(value) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: try decoder.singleValueContainer(),
                debugDescription: "Ngày không hợp lệ trong cache"
            )
        }
        return decoder
    }()
}
