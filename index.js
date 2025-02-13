require("dotenv").config();
const fetch = require("node-fetch");

const stripeApiKey = process.env.STRIPE_SECRET_KEY;
const commerce7Auth = Buffer.from(`${process.env.COMMERCE7_APP_ID}:${process.env.COMMERCE7_SECRET_KEY}`).toString("base64");

// Map Stripe Payment IDs to Commerce7 Tenant IDs
const tenantLookup = {
    "pi_3Qs8s0H6FrcrZ94A1BMIDViq": "reserves-rarirites-llc"
};

// Function to fetch Stripe transaction details
async function fetchStripeTransaction(stripePaymentId) {
    console.log(`Fetching Stripe transaction for Payment ID: ${stripePaymentId}`);

    const stripeResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${stripePaymentId}`, {
        method: 'GET',
        headers: { "Authorization": `Bearer ${stripeApiKey}` }
    });

    if (!stripeResponse.ok) {
        const errorText = await stripeResponse.text();
        throw new Error(`Stripe API Error: ${errorText}`);
    }

    const paymentData = await stripeResponse.json();
    return {
        customerEmail: paymentData.charges?.data[0]?.billing_details?.email || "unknown",
        customerName: paymentData.charges?.data[0]?.billing_details?.name || "Unknown Unknown",
        shipping: paymentData.charges?.data[0]?.shipping?.address || {},
        productDetails: paymentData.charges?.data.map(charge => ({
            product_id: charge.metadata?.product_id || "unknown-product",
            quantity: charge.metadata?.quantity || 1,
            price: charge.amount / 100
        }))
    };
}

// Function to find or create a customer in Commerce7
async function findOrCreateCustomer(tenantId, customerEmail, customerName) {
    console.log(`Checking for existing customer in Commerce7: ${customerEmail}`);

    const customerResponse = await fetch(`https://${tenantId}.commerce7.com/api/customers?email=${encodeURIComponent(customerEmail)}`, {
        method: 'GET',
        headers: { "Authorization": `Basic ${commerce7Auth}` }
    });

    if (!customerResponse.ok) {
        const errorText = await customerResponse.text();
        throw new Error(`Commerce7 API Error: ${errorText}`);
    }

    const customerData = await customerResponse.json();
    if (customerData?.customers?.length > 0) {
        return customerData.customers[0].id;
    }

    console.log("Customer not found, creating new customer...");
    const [firstName, lastName] = customerName.split(" ") || ["Unknown", "Unknown"];

    const createCustomerResponse = await fetch(`https://${tenantId}.commerce7.com/api/customers`, {
        method: 'POST',
        headers: {
            "Authorization": `Basic ${commerce7Auth}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            firstName,
            lastName,
            emails: [{ email: customerEmail }],
            emailMarketingStatus: "Subscribed"
        })
    });

    if (!createCustomerResponse.ok) {
        const errorText = await createCustomerResponse.text();
        throw new Error(`Commerce7 Customer Creation Failed: ${errorText}`);
    }

    const newCustomer = await createCustomerResponse.json();
    return newCustomer.id;
}

// Function to create an order in Commerce7
async function createCommerce7Order(tenantId, customerId, productDetails, shipping) {
    console.log("Creating order in Commerce7...");

    const orderPayload = {
        channel: "Web",
        customerId,
        orderNumber: Math.floor(100000 + Math.random() * 900000),
        externalOrderNumber: Math.floor(100000 + Math.random() * 900000),
        orderDeliveryMethod: "Ship",
        subTotal: productDetails.reduce((sum, item) => sum + item.price * item.quantity, 0),
        total: productDetails.reduce((sum, item) => sum + item.price * item.quantity, 0),
        paymentStatus: "Paid",
        fulfillmentStatus: "Not Fulfilled",
        shipping: [{ title: "Standard", service: "Ground" }],
        shipTo: {
            firstName: "Auto",
            lastName: "Generated",
            address: shipping.line1 || "Unknown",
            city: shipping.city || "Unknown",
            stateCode: shipping.state || "Unknown",
            zipCode: shipping.postal_code || "Unknown",
            countryCode: shipping.country || "Unknown"
        },
        items: productDetails.map(item => ({
            productId: item.product_id,
            quantity: item.quantity,
            price: item.price
        })),
        appData: {
            "yourAppId": {
                "source": "Stripe Automation",
                "notes": "Order created via automation script."
            }
        }
    };

    const commerce7Response = await fetch(`https://${tenantId}.commerce7.com/api/orders`, {
        method: 'POST',
        headers: {
            "Authorization": `Basic ${commerce7Auth}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(orderPayload)
    });

    if (!commerce7Response.ok) {
        const errorText = await commerce7Response.text();
        throw new Error(`Failed to create order in Commerce7 for ${tenantId}: ${errorText}`);
    }

    const orderData = await commerce7Response.json();
    console.log("✅ Order Created Successfully:", orderData);
    return orderData;
}

// Main order processing function
async function processOrder(stripePaymentId) {
    try {
        if (!stripePaymentId) throw new Error("Stripe Payment ID is missing");

        const tenantId = tenantLookup[stripePaymentId];
        if (!tenantId) throw new Error(`No tenant mapping found for Stripe Payment ID: ${stripePaymentId}`);

        const stripeData = await fetchStripeTransaction(stripePaymentId);
        const customerId = await findOrCreateCustomer(tenantId, stripeData.customerEmail, stripeData.customerName);
        if (!customerId) throw new Error("Failed to create or find a customer in Commerce7.");

        const orderResponse = await createCommerce7Order(tenantId, customerId, stripeData.productDetails, stripeData.shipping);
        console.log("✅ Order Processed Successfully:", orderResponse);

    } catch (error) {
        console.error("🚨 Error Processing Order:", error.message);
    }
}

// Run order processing with a sample Stripe Payment ID
processOrder("pi_3Qs8s0H6FrcrZ94A1BMIDViq");
