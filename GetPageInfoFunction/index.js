const AWS = require('aws-sdk');

const dynamo = new AWS.DynamoDB.DocumentClient();

const PAGEINFO_TABLE = "TipPageInfo";

// AWS Lambda Handler
exports.handler = async (event) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*", // Or specify your frontend domain
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,GET", // Include allowed methods
    };

    try {
        // Extract pageWalletId from path parameters
        const { pageWalletId } = event.pathParameters;
        if (!pageWalletId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Missing pageWalletId.' }),
            };
        }

        // Fetch pageInfo from DynamoDB
        const params = {
            TableName: PAGEINFO_TABLE,
            Key: { pageWalletId },
        };

        const result = await dynamo.get(params).promise();
        if (!result.Item) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'PageInfo not found.' }),
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result.Item),
        };
    } catch (error) {
        console.error('Error in GetPageInfoFunction:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal server error.' }),
        };
    }
};
