const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

const HARAKAPAY_API_KEY = "hpk_88c5a66dc476b8a2e1e07555f0830cd674840e79a141e28e";
const HARAKAPAY_BASE_URL = "https://harakapay.net";

// 1. Endpoint triggered when user clicks "Lipa Sasa" -> Calls HarakaPay API to send USSD Push
app.post('/api/initiate-payment', async (req, res) => {
    const { phone, plan, amount } = req.body;

    if (!phone || !amount) {
        return res.status(400).json({ success: false, message: "Namba ya simu na kiasi vinahitajika." });
    }

    try {
        // Call HarakaPay live API endpoint
        const response = await fetch(`${HARAKAPAY_BASE_URL}/api/v1/collect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': HARAKAPAY_API_KEY
            },
            body: JSON.stringify({
                phone: phone, // e.g. 0712345678 or 255712345678
                amount: amount,
                description: `Connection Za Bongo - Kifurushi cha ${plan}`
            })
        });

        const data = await response.json();

        if (data.success) {
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

// 2. Status check endpoint for frontend polling (Checks HarakaPay API)
app.get('/api/check-status/:orderId', async (req, res) => {
    const orderId = req.params.orderId;

    try {
        const response = await fetch(`${HARAKAPAY_BASE_URL}/api/v1/status/${orderId}`, {
            method: 'GET',
            headers: {
                'X-API-Key': HARAKAPAY_API_KEY
            }
        });

        const data = await response.json();

        if (data.success && data.payment) {
            const paymentStatus = data.payment.status; // 'completed', 'failed', or 'pending'
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

// 3. Webhook endpoint where HarakaPay automatically notifies your server on completion
app.post('/api/payment-webhook', (req, res) => {
    const { order_id, status } = req.body;
    console.log(`Webhook received for Order ${order_id}: Status -> ${status}`);
    // You can handle background database updates here if needed
    res.json({ received: true });
});

// Serve index.html directly from root directory for any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
