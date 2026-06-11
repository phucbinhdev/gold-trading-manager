import Foundation

enum WishlistPriority: String, Codable, CaseIterable, Identifiable, Sendable {
    case low = "Low"
    case medium = "Medium"
    case high = "High"
    var id: String { rawValue }
    var title: String {
        switch self {
        case .low: "Thấp"
        case .medium: "Vừa"
        case .high: "Cao"
        }
    }
    var rank: Int {
        switch self {
        case .low: 1
        case .medium: 2
        case .high: 3
        }
    }
}

struct WishlistItem: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let createdAt: Date
    var name: String
    var note: String?
    var price: Double?
    var priority: WishlistPriority
    var isPurchased: Bool
    var productURL: String?

    enum CodingKeys: String, CodingKey {
        case id, name, note, price, priority
        case createdAt = "created_at"
        case isPurchased = "is_purchased"
        case productURL = "product_url"
    }
}

struct DiaryEntry: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let createdAt: Date
    var date: Date
    var content: String
    var aiContent: String?
    var mood: String
    var moodLevel: Int
    var imageURLs: [String]?
    var isEncrypted: Bool

    enum CodingKeys: String, CodingKey {
        case id, date, content, mood
        case createdAt = "created_at"
        case aiContent = "ai_content"
        case moodLevel = "mood_level"
        case imageURLs = "image_urls"
        case isEncrypted = "is_encrypted"
    }
}
