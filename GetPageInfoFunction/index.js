const AWS = require('aws-sdk');

const limiter = require('lambda-rate-limiter')({
    interval: 60000, // 1 minute
    uniqueTokenPerInterval: 500,
});

const dynamo = new AWS.DynamoDB.DocumentClient();

const PAGEINFO_TABLE = "TipPageInfo";
const MAX_REQUESTS_PER_MIN = 5;

const corsHeaders = {
    "Access-Control-Allow-Origin": " * ", // Specify frontend domain
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,GET",
};

// AWS Lambda Handler
exports.handler = async (event) => {
    try {

        // Rate limiting
        await limiter.check(MAX_REQUESTS_PER_MIN, event.requestContext.identity.sourceIp);
        
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
        if (error.name === 'TooManyRequestsError') {
            return {
                statusCode: 429,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Rate limit exceeded. Please try again later.' }),
            };
        }
        console.error('Error in GetPageInfoFunction:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal server error.' }),
        };
    }
};
