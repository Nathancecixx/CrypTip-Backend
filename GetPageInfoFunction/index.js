// GetPageInfoFunction/index.js

const AWS = require('aws-sdk');

// Initialize DynamoDB Document Client
const dynamo = new AWS.DynamoDB.DocumentClient();

// Retrieve environment variables
const PAGEINFO_TABLE = process.env.PAGEINFO_TABLE;

// Lambda Handler
exports.handler = async (event) => {
    try {
        // Extract pageWalletId from path parameters
        const { pageWalletId } = event.pathParameters;
        if (!pageWalletId) {
            return {
                statusCode: 400,
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
                body: JSON.stringify({ message: 'PageInfo not found.' }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(result.Item),
        };
    } catch (error) {
        console.error('Error in GetPageInfoFunction:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error.' }),
        };
    }
};
