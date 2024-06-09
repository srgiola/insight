const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const dynamodb = new DynamoDBClient({ region: "us-east-1" });

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  console.log(`Connection ID: ${connectionId}`);

  const params = {
    TableName: process.env.TABLE_NAME,
    Item: {
      connectionId: { S: connectionId },
    },
  };

  try {
    const command = new PutItemCommand(params);
    await dynamodb.send(command);
    return { statusCode: 200 };
    
  } catch (error) {
    console.error("Error saving connection ID to DynamoDB:", error);
    return { statusCode: 500, body: JSON.stringify(error) };
  }
};
