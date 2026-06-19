    document.getElementById('payment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payButton = document.getElementById('pay-button');
        const statusMsg = document.getElementById('status-message');
        
        payButton.disabled = true;
        payButton.innerText = "Processing...";
        statusMsg.style.display = "none";

        const paymentData = {
            email: document.getElementById('email').value,
            amount: 1000000, // ₹10,000.00 in paise
            currency: 'inr',
            cardNumber: document.getElementById('card-number').value,
            expiry: document.getElementById('expiry').value,
            cvv: document.getElementById('cvv').value
        };

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            });

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
            }

            const result = await response.json();

            if (response.ok && result.status === 'paid') {
                statusMsg.className = "message success";
                statusMsg.innerText = "🎉 Payment Successful!";
                statusMsg.style.display = "block";
                payButton.innerText = "Paid";
            } else {
                throw new Error(result.message || "Payment rejected by sandbox.");
            }

        } catch (error) {
            statusMsg.className = "message error";
            statusMsg.innerText = error.message; 
            statusMsg.style.display = "block";
            payButton.disabled = false;
            payButton.innerText = "Pay ₹10,000.00";
        }
    });