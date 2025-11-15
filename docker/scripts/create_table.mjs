/**
 * DynamoDB Localにテーブルを自動作成するスクリプト
 */

import {
  DynamoDBClient,
  ListTablesCommand,
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';

/**
 * テーブルが存在しない場合のみ作成する
 * @param {DynamoDBClient} client - DynamoDBクライアント
 * @param {string} tableName - 作成するテーブル名
 */
async function createTableIfNotExists(client, tableName) {
  try {
    // テーブルの一覧を取得
    const listTablesCommand = new ListTablesCommand({});
    const listTablesResponse = await client.send(listTablesCommand);

    // テーブルが存在する場合は何もしない
    if (listTablesResponse.TableNames?.includes(tableName)) {
      console.log(`Table ${tableName} already exists.`);
      return;
    }

    // テーブルを作成
    const createTableCommand = new CreateTableCommand({
      TableName: tableName,
      AttributeDefinitions: [
        { AttributeName: 'user_id', AttributeType: 'S' },
        { AttributeName: 'memo_id', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'user_id', KeyType: 'HASH' },
        { AttributeName: 'memo_id', KeyType: 'RANGE' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    });

    await client.send(createTableCommand);
    console.log(`Creating table ${tableName}...`);

    // テーブルがアクティブになるまで待機
    await waitUntilTableExists(
      {
        client,
        maxWaitTime: 30,
      },
      { TableName: tableName }
    );

    console.log(`Table ${tableName} created successfully.`);
  } catch (error) {
    console.error(`Error creating table: ${error.message}`);
    throw error;
  }
}

// メイン処理
(async () => {
  // DynamoDBクライアントを作成
  const dynamodbClient = new DynamoDBClient({
    endpoint: 'http://dynamodb-local:8000',
    region: 'fakeRegion',
    credentials: {
      accessKeyId: 'fakeMyKeyId',
      secretAccessKey: 'fakeSecretAccessKey',
    },
  });

  // テーブルを作成
  await createTableIfNotExists(dynamodbClient, 'mkmemoportal-dynamodb');
})();
