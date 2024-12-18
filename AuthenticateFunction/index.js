// Add comment to trigger CI/CD

const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const { PublicKey } = require('@solana/web3.js');
const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');

const dynamo = new AWS.DynamoDB.DocumentClient();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = 1800; // In seconds

// AWS Lambda Handler
exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const { walletAddress, message, signature } = body;

        // Validate required fields
        if (!walletAddress || !message || !signature) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing required fields.' }),
            };
        }

        // Verify the signature
        const isValid = verifySignature(walletAddress, message, signature);
        if (!isValid) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: 'Invalid signature.' }),
            };
        }

        // Check if user exists; if not, create
        const user = await getUser(walletAddress);
        if (!user) {
            await createUser(walletAddress);
        }

        // Issue JWT
        const token = jwt.sign({ walletAddress }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

        return {
            statusCode: 200,
            body: JSON.stringify({ token }),
        };
    } catch (error) {
        console.error('Error in AuthenticateFunction:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error.' }),
        };
    }
};

// Function to verify the signature
const verifySignature = (walletAddress, message, signature) => {
    try {
        const publicKey = new PublicKey(walletAddress);
        const messageUint8 = nacl.util.decodeUTF8(message);
        const signatureUint8 = nacl.util.decodeBase64(signature);
        return nacl.sign.detached.verify(messageUint8, signatureUint8, publicKey.toBytes());
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
};

// Function to retrieve user from DynamoDB
const getUser = async (walletAddress) => {
    const params = {
        TableName: USERS_TABLE,
        Key: { walletAddress },
    };
    const result = await dynamo.get(params).promise();
    return result.Item;
};

// Function to create a new user in DynamoDB
const createUser = async (walletAddress) => {
    const params = {
        TableName: USERS_TABLE,
        Item: {
            walletAddress,
            createdAt: new Date().toISOString(),
        },
    };
    await dynamo.put(params).promise();
};
