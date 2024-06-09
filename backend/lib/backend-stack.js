const { Stack, Duration, CfnOutput } = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const cdk = require("aws-cdk-lib");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const apigateway = require("aws-cdk-lib/aws-apigatewayv2");
const integrations = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const iam = require("aws-cdk-lib/aws-iam");

require('dotenv').config();

const openaiApiKey = process.env.OPENAI_API_KEY;
const modelId = process.env.MODEL_ID;

class BackendStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Crear la tabla de DynamoDB
    const table = new dynamodb.Table(this, "ConnectionsTable", {
      tableName: "connections",
      partitionKey: {
        name: "connectionId",
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
    });

    // Crear el API Gateway WebSocket
    const api = new apigateway.WebSocketApi(this, "TesisWebSocketApi", {
      apiName: "tesis-websocket",
      routeSelectionExpression: "$request.body.action",
    });

    // Crear el stage por defecto "dev"
    const stage = new apigateway.WebSocketStage(this, "DevStage", {
      webSocketApi: api,
      stageName: "dev",
      autoDeploy: true,
    });

    // URL de WebSocket
    const websocketUrl = `https://${stage.api.apiId}.execute-api.${this.region}.amazonaws.com/${stage.stageName}`;

    // Crear la función Lambda "tesis-onConnect"
    const onConnectLambda = new lambda.Function(this, "TesisOnConnectLambda", {
      functionName: "tesis-onConnect",
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "onConnect.handler",
      code: lambda.Code.fromAsset("lambda/onConnect"),
      environment: {
        TABLE_NAME: table.tableName,
      },
      timeout: Duration.seconds(10),
    });

    // Crear la función Lambda "tesis-onMessage"
    const onMessageLambda = new lambda.Function(this, "TesisOnMessageLambda", {
      functionName: "tesis-onMessage",
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "onMessage.handler",
      code: lambda.Code.fromAsset("lambda/onMessage"),
      environment: {
        TABLE_NAME: table.tableName,
        WEBSOCKET_URL: websocketUrl,
        OPENAI_API_KEY: openaiApiKey,
        MODEL_ID: modelId,
      },
      timeout: Duration.seconds(10),
    });

    // Dar permisos a las Lambdas para acceder a la tabla DynamoDB
    table.grantReadWriteData(onConnectLambda);
    table.grantReadWriteData(onMessageLambda);

    // Añadir política de "AmazonAPIGatewayInvokeFullAccess" a los roles de Lambda
    const policy = iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonAPIGatewayInvokeFullAccess');
    onConnectLambda.role.addManagedPolicy(policy);
    onMessageLambda.role.addManagedPolicy(policy);

    // Integrar la ruta $connect con la Lambda "tesis-onConnect"
    api.addRoute("$connect", {
      integration: new integrations.WebSocketLambdaIntegration("ConnectIntegration", onConnectLambda),
    });

    // Integrar la ruta custom "onMessage" con la Lambda "tesis-onMessage"
    api.addRoute("onMessage", {
      integration: new integrations.WebSocketLambdaIntegration("OnMessageIntegration", onMessageLambda),
    });

    // Salidas
    new CfnOutput(this, 'WebSocketApiUrl', {
      value: `${api.apiEndpoint}/${stage.stageName}`,
      description: 'The URL of the WebSocket API',
    });

    new CfnOutput(this, 'WebSocketConnectionUrl', {
      value: websocketUrl,
      description: 'The WebSocket connection URL',
    });
  }
}

module.exports = { BackendStack };
