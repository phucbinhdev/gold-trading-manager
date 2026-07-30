#!/bin/sh
#
# Đóng gói GoldManager thành file .ipa chưa ký (unsigned), sẵn sàng cho sideload
# bằng Sideloadly / AltStore / ESign.
#
# Máy đang ký bằng tài khoản Apple miễn phí nên provisioning profile hết hạn sau
# ~7 ngày; build unsigned bỏ qua toàn bộ khâu ký để không phải phụ thuộc vào việc
# Xcode có đăng nhập Apple ID hay không.
#
#   Scripts/build-ipa.sh                  # Release, unsigned (mặc định)
#   Scripts/build-ipa.sh --debug          # Debug thay vì Release
#   Scripts/build-ipa.sh --skip-generate  # bỏ qua sync-env + xcodegen (build lại nhanh)
#   Scripts/build-ipa.sh -o ~/Desktop     # đổi thư mục chứa .ipa
#
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
IOS_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

CONFIGURATION=Release
SKIP_GENERATE=0
OUTPUT_DIR="$IOS_ROOT/build/ipa"

while [ $# -gt 0 ]; do
    case "$1" in
        --debug) CONFIGURATION=Debug ;;
        --release) CONFIGURATION=Release ;;
        --skip-generate) SKIP_GENERATE=1 ;;
        -o|--output) shift; OUTPUT_DIR="$1" ;;
        -h|--help) sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) echo "error: tham số không hợp lệ: $1" >&2; exit 1 ;;
    esac
    shift
done

DERIVED_DATA="$IOS_ROOT/build/${CONFIGURATION}Build"
PRODUCTS_DIR="$DERIVED_DATA/Build/Products/$CONFIGURATION-iphoneos"
IPA_PATH="$OUTPUT_DIR/GoldManager-$(printf '%s' "$CONFIGURATION" | tr '[:upper:]' '[:lower:]')-unsigned.ipa"

if [ "$SKIP_GENERATE" -eq 0 ]; then
    echo "▸ Đồng bộ Supabase URL/key từ .env.local sang Config/Local.xcconfig"
    "$SCRIPT_DIR/sync-env-xcconfig.sh"

    if ! command -v xcodegen >/dev/null 2>&1; then
        echo "error: chưa cài xcodegen (brew install xcodegen)" >&2
        exit 1
    fi
    echo "▸ Sinh lại GoldManager.xcodeproj"
    (cd "$IOS_ROOT" && xcodegen generate)
fi

echo "▸ Build $CONFIGURATION cho iphoneos (không ký)"
xcodebuild build \
    -project "$IOS_ROOT/GoldManager.xcodeproj" \
    -scheme GoldManager \
    -configuration "$CONFIGURATION" \
    -destination 'generic/platform=iOS' \
    -derivedDataPath "$DERIVED_DATA" \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGNING_ALLOWED=NO \
    | grep -E 'error:|warning:|BUILD (SUCCEEDED|FAILED)' || true

APP_PATH=$(find "$PRODUCTS_DIR" -maxdepth 1 -name '*.app' -print -quit 2>/dev/null || true)
if [ -z "$APP_PATH" ]; then
    echo "error: không tìm thấy .app trong $PRODUCTS_DIR — build đã fail" >&2
    exit 1
fi

echo "▸ Đóng gói $(basename "$APP_PATH") thành .ipa"
STAGING=$(mktemp -d)
trap 'rm -rf "$STAGING"' EXIT
mkdir -p "$STAGING/Payload"
cp -R "$APP_PATH" "$STAGING/Payload/"

mkdir -p "$OUTPUT_DIR"
rm -f "$IPA_PATH"
(cd "$STAGING" && zip -qry "$IPA_PATH" Payload)

echo
echo "✅ $IPA_PATH ($(du -h "$IPA_PATH" | cut -f1))"
echo "   Chưa ký — cài lên iPhone qua Sideloadly / AltStore / ESign."
