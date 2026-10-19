const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

const HARAKAPAY_API_KEY = "hpk_88c5a66dc476b8a2e1e07555f0830cd674840e79a141e28e";
const HARAKAPAY_BASE_URL = "https://harakapay.net";

// Store all platform transactions & users in memory
const activePayments = new Map();

// 1. Endpoint triggered when user initiates payment -> Calls HarakaPay API
app.post('/api/initiate-payment', async (req, res) => {
    const { phone, plan, amount } = req.body;

    if (!phone || !amount) {
        return res.status(400).json({ success: false, message: "Namba ya simu na kiasi vinahitajika." });
    }

    try {
        const response = await fetch(`${HARAKAPAY_BASE_URL}/api/v1/collect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': HARAKAPAY_API_KEY
            },
            body: JSON.stringify({
                phone: phone,
                amount: amount,
                description: `Connection Za Bongo - Kifurushi cha ${plan}`
            })
        });

        const data = await response.json();

        if (data.success) {
            // Track transaction for admin metrics
            activePayments.set(data.order_id, {
                orderId: data.order_id,
                phone: phone,
                plan: plan,
                amount: Number(amount),
                status: 'pending',
                date: new Date().toISOString()
            });

            res.json({ 
                success: true, 
                message: "USSD push imetumwa kwenye simu yako.", 
                order_id: data.order_id 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: data.error || "Imeshindwa kutuma ombi la USSD." 
            });
        }

    } catch (error) {
        console.error("HarakaPay API Error:", error);
        res.status(500).json({ success: false, message: "Hitilafu ya mtandao kuunganisha na HarakaPay." });
    }
});

// 2. Status check endpoint for frontend polling
app.get('/api/check-status/:orderId', async (req, res) => {
    const orderId = req.params.orderId;

    try {
        const response = await fetch(`${HARAKAPAY_BASE_URL}/api/v1/status/${orderId}`, {
            method: 'GET',
            headers: { 'X-API-Key': HARAKAPAY_API_KEY }
        });

        const data = await response.json();

        if (data.success && data.payment) {
            const paymentStatus = data.payment.status; // 'completed', 'failed', or 'pending'
            
            if (activePayments.has(orderId)) {
                let txn = activePayments.get(orderId);
                txn.status = paymentStatus;
                activePayments.set(orderId, txn);
            }

            if (paymentStatus === 'completed') {
                return res.json({ paid: true });
            }
        }
        res.json({ paid: false });

    } catch (error) {
        console.error("Status Check Error:", error);
        res.json({ paid: false });
    }
});

// 3. Admin Analytics Endpoint (Returns Total Income and Users)
app.get('/api/admin-analytics', (req, res) => {
    let totalIncome = 0;
    let totalUsers = activePayments.size;
    let transactionsList = [];

    activePayments.forEach((txn) => {
        transactionsList.push(txn);
        if (txn.status === 'completed') {
            totalIncome += txn.amount;
        }
    });

    res.json({
        success: true,
        totalIncome,
        totalUsers,
        transactions: transactionsList
    });
});

// Serve index.html from root directory
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
