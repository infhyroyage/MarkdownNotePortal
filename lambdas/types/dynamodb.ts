import type { AttributeValue } from "@aws-sdk/client-dynamodb";

/**
 * DynamoDBのアイテム型(汎用的な形式)
 */
export type DynamoDBItem = Record<string, AttributeValue>;

/**
 * メモアイテムのDynamoDB形式
 */
export interface MemoItemDynamoDB {
  user_id: { S: string };
  memo_id: { S: string };
  title: { S: string };
  content: { S: string };
  create_at: { S: string };
  update_at?: { S: string };
}

/**
 * メモアイテム(アプリケーション形式)
 */
export interface MemoItem {
  memoId: string;
  title: string;
  content: string;
  createAt: string;
  updateAt?: string;
}

/**
 * メモリストアイテム(アプリケーション形式)
 */
export interface MemoListItem {
  memoId: string;
  title: string;
  lastUpdatedAt: string;
}
