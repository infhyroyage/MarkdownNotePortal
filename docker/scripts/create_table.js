/**
 * DynamoDB Localにテーブルを自動作成するスクリプト
 */

const { DynamoDBClient, CreateTableCommand, ListTablesCommand, waitUntilTableExists } = require('@aws-sdk/client-dynamodb');

/**
 * テーブルが存在しない場合のみ作成する
 * 
 * @param {DynamoDBClient} client - DynamoDBクライアント
 * @param {string} tableName - 作成するテーブル名
 */
async function createTableIfNotExists(client, tableName) {
  // テーブルが存在する場合は何もしない
  const listTablesResponse = await client.send(new ListTablesCommand({}));
  if (listTablesResponse.TableNames.includes(tableName)) {
    console.log(`Table ${tableName} already exists.`);
    return;
  }

  // テーブルを作成
  await client.send(new CreateTableCommand({
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
  }));

  // テーブルがアクティブになるまで待機
  await waitUntilTableExists(
    { client, maxWaitTime: 30, minDelay: 1, maxDelay: 5 },
    { TableName: tableName }
  );

  console.log(`Table ${tableName} created successfully.`);
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
