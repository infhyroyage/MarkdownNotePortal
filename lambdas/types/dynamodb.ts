/**
 * DynamoDB関連の型定義
 */

import type { AttributeValue } from '@aws-sdk/client-dynamodb';

/**
 * DynamoDBのアイテム型（汎用的な形式）
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
 * メモアイテム（アプリケーション形式）
 */
export interface MemoItem {
  memoId: string;
  title: string;
  content: string;
  createAt: string;
  updateAt?: string;
}

/**
 * メモリストアイテム（アプリケーション形式）
 */
export interface MemoListItem {
  memoId: string;
  title: string;
  lastUpdatedAt: string;
}

/**
 * メモ作成リクエスト
 */
export interface CreateMemoRequest {
  title: string;
  content: string;
}

/**
 * メモ作成レスポンス
 */
export interface CreateMemoResponse {
  memoId: string;
  title: string;
  lastUpdatedAt: string;
}

/**
 * メモ取得レスポンス
 */
export interface GetMemoResponse {
  memoId: string;
  title: string;
  content: string;
}

/**
 * メモ一覧レスポンス
 */
export interface ListMemosResponse {
  items: MemoListItem[];
}

/**
 * メモ更新リクエスト
 */
export interface UpdateMemoRequest {
  title: string;
  content: string;
}

/**
 * メモ更新レスポンス
 */
export interface UpdateMemoResponse {
  memoId: string;
  title: string;
  content: string;
  lastUpdatedAt: string;
}

/**
 * DynamoDB GetItemコマンドのレスポンス型ガード
 */
export function isMemoItemDynamoDB(item: DynamoDBItem | undefined): boolean {
  if (!item) return false;
  return (
    'user_id' in item &&
    'memo_id' in item &&
    'title' in item &&
    'content' in item &&
    'create_at' in item &&
    item.user_id?.S !== undefined &&
    item.memo_id?.S !== undefined &&
    item.title?.S !== undefined &&
    item.content?.S !== undefined &&
    item.create_at?.S !== undefined
  );
}

/**
 * DynamoDB形式からアプリケーション形式への変換
 */
export function convertDynamoDBToMemo(item: MemoItemDynamoDB): MemoItem {
  return {
    memoId: item.memo_id.S,
    title: item.title.S,
    content: item.content.S,
    createAt: item.create_at.S,
    updateAt: item.update_at?.S,
  };
}

/**
 * DynamoDB形式からメモリストアイテムへの変換
 */
export function convertDynamoDBToMemoListItem(item: DynamoDBItem): MemoListItem {
  const memoId = item.memo_id?.S || '';
  const title = item.title?.S || '';
  const lastUpdatedAt = item.update_at?.S || item.create_at?.S || '';

  return {
    memoId,
    title,
    lastUpdatedAt,
  };
}
