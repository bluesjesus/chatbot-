// Import necessary packages
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');

// Load environment variables (for API keys)
require('dotenv').config();

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

// --- FIREBASE ADMIN SETUP ---
// This uses the SECRET key and must only ever run on the backend!
try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
    process.exit(1); // Exit if Firebase admin fails to initialize
}
const db = admin.firestore();

// --- API ENDPOINT FOR CHAT ---
app.post('/api/chat', async (req, res) => {
    // We need to verify the user is logged in
    // This requires sending an ID token from the frontend, which is a more advanced topic.
    // For now, we trust the chatId sent from the client.
    const { chatId } = req.body;
    
    // A real app needs authentication here to get the userId securely.
    // For this example, we assume the frontend code is working correctly to manage chats.
    // We need to get the user ID from the chat document itself. This is insecure but works for a demo.
    
    if (!chatId) {
        return res.status(400).json({ error: "Chat ID is required" });
    }

    try {
        // This is a simplified and insecure way to get the user ID.
        // In a real app, you would verify an auth token from the user.
        const chatRef = await db.collectionGroup('chats').where(admin.firestore.FieldPath.documentId(), '==', chatId).limit(1).get();
        if (chatRef.empty) {
            return res.status(404).json({ error: "Chat not found" });
        }
        const userId = chatRef.docs[0].ref.parent.parent.id;
        
        // 1. Get chat history from Firestore
        const messagesSnap = await db.collection('users').doc(userId).collection('chats').doc(chatId).collection('messages').orderBy('timestamp').get();
        const history = messagesSnap.docs.map(doc => {
            const msg = doc.data();
            return {
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            };
        });

        // 2. Call the Google AI API (replace with your actual API call logic)
        // const { GoogleGenerativeAI } = require("@google/generative-ai");
        // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // const model = genAI.getGenerativeModel({ model: "gemini-pro"});
        // const chat = model.startChat({ history });
        // const result = await chat.sendMessage(history[history.length - 1].parts[0].text);
        // const botText = result.response.text();
        
        // For demonstration, we'll use a placeholder response
        const botText = "This is a real response from your secure backend!";

        // 3. Save the bot's response back to Firestore
        await db.collection('users').doc(userId).collection('chats').doc(chatId).collection('messages').add({
            text: botText,
            sender: 'bot',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // 4. Send a success response
        res.status(200).json({ success: true });

    } catch (error) {
        console.error("Error in /api/chat:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// --- SERVE FIREBASE CONFIG ---
// This endpoint creates a JS file on the fly with your PUBLIC keys
app.get('/firebase-config.js', (req, res) => {
    const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
    };
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`const firebaseConfig = ${JSON.stringify(firebaseConfig)};`);
});


// --- SERVE FRONTEND ---
// This serves all the files in the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// For any other request, serve the index.html file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
