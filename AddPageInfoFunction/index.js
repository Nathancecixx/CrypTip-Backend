
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');

const dynamo = new AWS.DynamoDB.DocumentClient();

const PAGEINFO_TABLE = process.env.PAGEINFO_TABLE;
const JWT_SECRET = process.env.JWT_SECRET;


const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
};

// AWS Lambda Handler
exports.handler = async (event) => {
    try {
        // Extract JWT from Authorization header
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Missing Authorization header.' }),
            };
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return {
                statusCode: 401,
                headers: corsHeaders,
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
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid or expired token.' }),
            };
        }
        // Extract wallet address stored in token
        const { walletAddress } = decoded;
        if (!walletAddress) {
            return {
                statusCode: 400,
                headers: corsHeaders,
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
                    headers: corsHeaders,
                    body: JSON.stringify({ message: `${field} is required.` }),
                };
            }
        }

        // Ensure walletAddress in token matches the one inthe body
        if (body.walletAddress && body.walletAddress !== walletAddress) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Wallet address mismatch.' }),
            };
        }

        // Define the item to be inserted
        const item = {
            pageWalletId: body.pageWalletId || walletAddress,
            backgroundUrl: body.backgroundUrl || '',
            cta: body.cta || '',
            date: body.date || new Date().toISOString(),
            description: body.description,
            footer: body.footer || '',
            links: body.links || [],
            location: body.location || '',
            qrCode: body.qrCode || false,
            donate: body.donate || false,
            logoUrl: body.logoUrl || '',
            name: body.name || '',
            subtitle: body.subtitle || '',
            templateId: body.templateId || 1,
            videoEmbed: body.videoEmbed || '',
            donationGoal: body.donationGoal || '',
            walletAddress: body.walletAddress || walletAddress,
        };

        const params = {
            TableName: PAGEINFO_TABLE,
            Item: item,
        };

        // Insert the item into DynamoDB
        await dynamo.put(params).promise();

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'PageInfo added successfully.', item }),
        };
    } catch (error) {
        console.error('Error in AddPageInfoFunction:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal server error.' }),
        };
    }
};
