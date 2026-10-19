const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// Store active payment sessions
const activePayments = new Map();

// 1. Endpoint triggered when user clicks "Lipa Sasa"
app.post('/api/initiate-payment', async (req, res) => {
    const { phone, plan, amount } = req.body;
    const apiKey = "hpk_88c5a66dc476b8a2e1e07555f0830cd674840e79a141e28e";

    try {
        // Simulated or real API request using your API key
        const transactionId = `TXN_${Math.floor(Math.random() * 1000000)}`;
        activePayments.set(transactionId, { phone, plan, status: 'PENDING' });

        res.json({ 
            success: true, 
            message: "USSD Push imetumwa kwenye simu yako.", 
            transactionId: transactionId 
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Imeshindwa kutuma ombi la malipo." });
    }
});

// 2. Webhook endpoint where the carrier/gateway sends payment confirmation
app.post('/api/payment-callback', (req, res) => {
    const { transactionId, status } = req.body; 
    
    if (activePayments.has(transactionId)) {
        let payment = activePayments.get(transactionId);
        payment.status = status;
        activePayments.set(transactionId, payment);
    }
    
    res.json({ received: true });
});

// 3. Status check endpoint for frontend polling
app.get('/api/check-status/:txnId', (req, res) => {
    const txnId = req.params.txnId;
    const payment = activePayments.get(txnId);

    if (payment && payment.status === 'SUCCESS') {
        res.json({ paid: true });
    } else {
        res.json({ paid: false });
    }
});

// Serve index.html directly from root directory for any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
