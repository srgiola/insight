const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const OpenAI = require("openai");

const client = new ApiGatewayManagementApiClient({ endpoint: process.env.WEBSOCKET_URL });
const dynamodb = new DynamoDBClient({ region: "us-east-1" });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handler = async (event) => {

  console.log('Event:', JSON.stringify(event, null, 2));
  
  // Extract connectionId from incoming event
  const connectionId = event.requestContext.connectionId;
  
  // Do something interesting...
  const responseMessage = "responding...";
  
  // Form response and post back to connectionId
  const params = {
    ConnectionId: connectionId,
    Data: JSON.stringify(responseMessage)
  };
  
  try {
    const command = new PostToConnectionCommand(params);
    await client.send(command);
    return { statusCode: 200 };

  } catch (error) {
    console.error('Error posting to connection:', error);
    return { statusCode: 500, body: JSON.stringify(error) };
  }
};
