#!/bin/sh
# DynamoDB Localにテーブルを自動作成するスクリプト

set -e

TABLE_NAME="mkmemoportal-dynamodb"
ENDPOINT_URL="http://dynamodb-local:8000"
REGION="fakeRegion"

echo "Waiting for DynamoDB Local to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if aws dynamodb list-tables \
    --endpoint-url "$ENDPOINT_URL" \
    --region "$REGION" \
    --no-cli-pager \
    >/dev/null 2>&1; then
    echo "DynamoDB Local is ready"
    break
  fi
  attempt=$((attempt + 1))
  echo "Attempt $attempt/$max_attempts: DynamoDB Local not ready yet, waiting..."
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "Error: DynamoDB Local did not become ready in time"
  exit 1
fi

# テーブルが存在するか確認
echo "Checking if table $TABLE_NAME exists..."
if aws dynamodb describe-table \
  --table-name "$TABLE_NAME" \
  --endpoint-url "$ENDPOINT_URL" \
  --region "$REGION" \
  --no-cli-pager \
  >/dev/null 2>&1; then
  echo "Table $TABLE_NAME already exists, skipping creation"
  exit 0
fi

# テーブルを作成
echo "Creating table $TABLE_NAME..."
aws dynamodb create-table \
  --table-name "$TABLE_NAME" \
  --attribute-definitions \
    AttributeName=user_id,AttributeType=S \
    AttributeName=memo_id,AttributeType=S \
  --key-schema \
    AttributeName=user_id,KeyType=HASH \
    AttributeName=memo_id,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url "$ENDPOINT_URL" \
  --region "$REGION" \
  --no-cli-pager

# テーブルがアクティブになるまで待機
echo "Waiting for table $TABLE_NAME to become active..."
aws dynamodb wait table-exists \
  --table-name "$TABLE_NAME" \
  --endpoint-url "$ENDPOINT_URL" \
  --region "$REGION" \
  --no-cli-pager

echo "Table $TABLE_NAME created successfully"
