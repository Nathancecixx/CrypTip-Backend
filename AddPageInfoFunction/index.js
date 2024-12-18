
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');

// Initialize DynamoDB Document Client
const dynamo = new AWS.DynamoDB.DocumentClient();

// Retrieve environment variables
const PAGEINFO_TABLE = process.env.PAGEINFO_TABLE;
const JWT_SECRET = process.env.JWT_SECRET;

// Lambda Handler
exports.handler = async (event) => {
    try {
        // Extract JWT from Authorization header
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: 'Missing Authorization header.' }),
            };
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: 'Invalid Authorization header format.' }),
            };
        }

        // Verify JWT
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: 'Invalid or expired token.' }),
            };
        }

        // Optionally, you can use decoded information here (e.g., walletAddress)
        const { walletAddress } = decoded;
        if (!walletAddress) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid token payload.' }),
            };
        }

        // Parse the request body
        const body = JSON.parse(event.body);

        // Validate required fields
        const requiredFields = ['pageWalletId', 'name', 'cta', 'description'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: `${field} is required.` }),
                };
            }
        }

        // Optionally, ensure that the walletAddress in the token matches the one in the body
        if (body.walletAddress && body.walletAddress !== walletAddress) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'Wallet address mismatch.' }),
            };
        }

        // Define the item to be inserted
        const item = {
            pageWalletId: body.pageWalletId,
            backgroundUrl: body.backgroundUrl || '',
            cta: body.cta,
            date: body.date || new Date().toISOString(),
            description: body.description,
            footer: body.footer || '',
            isMinter: body.isMinter || false,
            links: body.links || [],
            location: body.location || '',
            logoUrl: body.logoUrl || '',
            name: body.name,
            subtitle: body.subtitle || '',
            templateId: body.templateId || 1,
            tokenName: body.tokenName || '',
            tokenSupply: body.tokenSupply || '',
            walletAddress: body.walletAddress || walletAddress, // Ensure association with authenticated user
        };

        const params = {
            TableName: PAGEINFO_TABLE,
            Item: item,
        };

        // Insert the item into DynamoDB
        await dynamo.put(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'PageInfo added successfully.', item }),
        };
    } catch (error) {
        console.error('Error in AddPageInfoFunction:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error.' }),
        };
    }
};
