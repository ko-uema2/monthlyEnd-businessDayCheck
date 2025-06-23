#!/bin/bash

# Secrets Managerに認証情報を更新するスクリプト
# 使用方法: ./scripts/update-secrets.sh <environment> <aws-profile> [--dry-run]

# デバッグ用（必要に応じてコメントアウトを解除）
# set -x  # 各コマンドの実行前にコマンドを表示
# set -v  # 各行を読み込んだ後に表示
# set -e  # エラー時に即座に終了

set -e

# 色付きのログ出力
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

log_debug() {
    echo -e "\033[36m[DEBUG]\033[0m $1"
}

# AWS SSOログイン状態のチェック
check_aws_sso_login() {
    local profile="$1"
    
    log_info "AWS SSOログイン状態を確認中..."
    
    # AWS SSOセッションの有効性をチェック
    if ! aws sts get-caller-identity --profile "$profile" >/dev/null 2>&1; then
        log_error "AWS SSOプロファイル '$profile' でログインされていません"
        log_error "以下のコマンドでログインしてください:"
        echo ""
        echo "  aws sso login --profile $profile"
        echo ""
        log_error "ログイン後、再度スクリプトを実行してください"
        exit 1
    fi
    
    # 現在のユーザー情報を取得して表示
    local caller_identity
    caller_identity=$(aws sts get-caller-identity --profile "$profile" --output json 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        local account_id
        local user_id
        local arn
        
        account_id=$(echo "$caller_identity" | jq -r '.Account')
        user_id=$(echo "$caller_identity" | jq -r '.UserId')
        arn=$(echo "$caller_identity" | jq -r '.Arn')
        
        log_info "AWS SSOログイン確認完了"
        log_info "  アカウントID: $account_id"
        log_info "  ユーザーID: $user_id"
        log_info "  ARN: $arn"
    else
        log_warn "ユーザー情報の取得に失敗しましたが、処理を続行します"
    fi
}

# 使用方法の表示
show_usage() {
    echo "使用方法: $0 <environment> <aws-profile> [--dry-run]"
    echo ""
    echo "引数:"
    echo "  environment    環境名 (例: staging, production)"
    echo "  aws-profile    AWS SSOプロファイル名"
    echo "  --dry-run      実際の更新を行わず、更新内容を表示のみ"
    echo ""
    echo "例:"
    echo "  $0 staging my-sso-profile"
    echo "  $0 production my-sso-profile --dry-run"
    echo ""
    echo "必要なファイル:"
    echo "  .env: LINE_CHANNEL_ID, LINE_CHANNEL_SECRET, LINE_KID, GOOGLE_CALENDAR_ID"
    echo "  line-private-key.json: LINE Messaging API の秘密鍵ファイル"
    echo "  google-private-key.json: Google Calendar API の秘密鍵情報（private_key, client_email）"
}

validate_args() {
    if [ $# -lt 2 ]; then
        log_error "環境名とAWSプロファイル名が指定されていません"
        show_usage
        exit 1
    fi
}

load_env_files() {
    # 設定ファイルの存在確認
    missing_files=()
    if [ ! -f "$ENV_FILE" ]; then
        missing_files+=("cert/.env")
    fi
    if [ ! -f "$LINE_PRIVATE_KEY_FILE" ]; then
        missing_files+=("cert/line-private-key.json")
    fi
    if [ ! -f "$GOOGLE_PRIVATE_KEY_FILE" ]; then
        missing_files+=("cert/google-private-key.json")
    fi

    if [ ${#missing_files[@]} -gt 0 ]; then
        log_error "以下の設定ファイルが見つかりません:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        echo ""
        echo "設定ファイルを作成してから再実行してください。"
        exit 1
    fi

    # .envファイルから環境変数を読み込み
    log_info ".envファイルから設定を読み込み中..."
    if [ -f "$ENV_FILE" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            if [[ ! "$line" =~ ^[[:space:]]*# ]] && [[ -n "$line" ]]; then
                if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
                    var_name="${BASH_REMATCH[1]}"
                    var_value="${BASH_REMATCH[2]}"
                    var_value=$(echo "$var_value" | sed 's/^["'\'']//;s/["'\'']$//')
                    export "$var_name"="$var_value"
                fi
            fi
        done < "$ENV_FILE"
    fi
}

validate_env_vars() {
    required_vars=(
        "LINE_CHANNEL_ID"
        "LINE_CHANNEL_SECRET"
        "LINE_KID"
        "GOOGLE_CALENDAR_ID"
    )
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "以下の環境変数が設定されていません:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        echo ""
        echo ".envファイルに必要な設定を追加してから再実行してください。"
        exit 1
    fi
}

load_private_keys() {
    log_info "LINE秘密鍵ファイルから設定を読み込み中..."
    if [ -f "$LINE_PRIVATE_KEY_FILE" ]; then
        LINE_PRIVATE_KEY=$(jq -c . "$LINE_PRIVATE_KEY_FILE")
        if [ -z "$LINE_PRIVATE_KEY" ]; then
            log_error "line-private-key.jsonファイルが空です"
            exit 1
        fi
    fi
    if [ -z "$LINE_KID" ]; then
        log_error "LINE_KIDが設定されていません"
        log_error ".envファイルに LINE_KID=your_line_kid を追加してください"
        exit 1
    fi
    log_info "Google秘密鍵ファイルから設定を読み込み中..."
    if [ -f "$GOOGLE_PRIVATE_KEY_FILE" ]; then
        GOOGLE_CALENDAR_PRIVATE_KEY=$(jq -r '.private_key' "$GOOGLE_PRIVATE_KEY_FILE" | tr -d '\n ')
        GOOGLE_CALENDAR_CLIENT_EMAIL=$(jq -r '.client_email' "$GOOGLE_PRIVATE_KEY_FILE")
        if [ "$GOOGLE_CALENDAR_PRIVATE_KEY" = "null" ] || [ "$GOOGLE_CALENDAR_CLIENT_EMAIL" = "null" ]; then
            log_error "google-private-key.jsonから必要な情報を読み取れませんでした"
            log_error "ファイルに 'private_key' と 'client_email' フィールドが含まれているか確認してください"
            exit 1
        fi
    fi
}

gen_secret_value() {
    SECRET_VALUE=$(jq -n \
      --arg channelId "$LINE_CHANNEL_ID" \
      --arg channelSecret "$LINE_CHANNEL_SECRET" \
      --arg lineKid "$LINE_KID" \
      --arg calendarId "$GOOGLE_CALENDAR_ID" \
      --arg calendarClientEmail "$GOOGLE_CALENDAR_CLIENT_EMAIL" \
      --arg calendarPrivateKey "$GOOGLE_CALENDAR_PRIVATE_KEY" \
      --argjson linePrivateKey "$LINE_PRIVATE_KEY" \
      '{
        channelId: $channelId,
        channelSecret: $channelSecret,
        lineKid: $lineKid,
        calendarId: $calendarId,
        calendarClientEmail: $calendarClientEmail,
        calendarPrivateKey: $calendarPrivateKey,
        linePrivateKey: $linePrivateKey
      }'
    )
}

show_dry_run() {
    log_info "更新内容 (ドライラン):"
    echo "$SECRET_VALUE" | jq .
}

update_secret() {
    log_info "シークレットの存在を確認中..."
    if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --profile "$AWS_PROFILE" >/dev/null 2>&1; then
        log_info "シークレットが存在します。更新を実行します..."
        if aws secretsmanager update-secret \
            --secret-id "$SECRET_NAME" \
            --secret-string "$SECRET_VALUE" \
            --description "LINE Messaging API credentials and Google Calendar API credentials (Updated: $(date))" \
            --profile "$AWS_PROFILE"; then
            log_info "シークレットの更新が完了しました"
        else
            log_error "シークレットの更新に失敗しました"
            log_error "AWS SSOセッションが期限切れの可能性があります"
            log_error "以下のコマンドで再ログインしてください:"
            echo ""
            echo "  aws sso login --profile $AWS_PROFILE"
            echo ""
            exit 1
        fi
    else
        describe_error=$(aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --profile "$AWS_PROFILE" 2>&1)
        if echo "$describe_error" | grep -q "AccessDenied"; then
            log_error "シークレットへのアクセス権限がありません"
            log_error "AWS SSOセッションが期限切れの可能性があります"
            log_error "以下のコマンドで再ログインしてください:"
            echo ""
            echo "  aws sso login --profile $AWS_PROFILE"
            echo ""
            exit 1
        elif echo "$describe_error" | grep -q "ResourceNotFoundException"; then
            log_error "シークレット '$SECRET_NAME' が見つかりません"
            log_error "CDKでシークレットリソースをデプロイしてから再実行してください"
            exit 1
        else
            log_error "シークレットの確認中にエラーが発生しました:"
            echo "$describe_error"
            exit 1
        fi
    fi
}

main() {
    validate_args "$@"
    ENVIRONMENT=$1
    AWS_PROFILE=$2
    DRY_RUN=false

    if [ "$3" = "--dry-run" ]; then
        DRY_RUN=true
        log_info "ドライランモードで実行します"
    fi

    check_aws_sso_login "$AWS_PROFILE"


    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
    ENV_FILE="$PROJECT_ROOT/cert/.env"
    LINE_PRIVATE_KEY_FILE="$PROJECT_ROOT/cert/line-private-key.json"
    GOOGLE_PRIVATE_KEY_FILE="$PROJECT_ROOT/cert/google-private-key.json"
    load_env_files
    validate_env_vars
    load_private_keys
    SECRET_NAME="MonthlyEndBusinessDayCheckSecrets-${ENVIRONMENT}"
    gen_secret_value

    log_info "環境: $ENVIRONMENT"
    log_info "AWSプロファイル: $AWS_PROFILE"
    log_info "シークレット名: $SECRET_NAME"

    if [ "$DRY_RUN" = true ]; then
        show_dry_run
    else
        update_secret
    fi
    log_info "処理が完了しました"
}

main "$@" 