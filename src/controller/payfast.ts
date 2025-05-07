import 'dotenv/config'
import { Request, Response } from 'express'
import qs from 'querystring'
import https from 'https'
import crypto from 'crypto'
import axios from 'axios'

const PAYFAST_URL = 'https://sandbox.payfast.co.za/eng/process'
const MerchantId = process.env.MERCHANT_ID
const MerchantKey = process.env.MERCHANT_KEY
const ReturnUrl = process.env.RETURN_URL
const CancelUrl = process.env.CANCEL_URL
const NotifyUrl = process.env.NOTIFY_URL

export async function Pay(req: Request, res: Response) : Promise<void> {

    const { name_first,amount, item_name, item_description, orderID } = req.body

    const paymentData = {
        merchant_id: MerchantId,
        merchant_key: MerchantKey,
        return_url: ReturnUrl,
        cancel_url: CancelUrl,
        notify_url: NotifyUrl,
        name_first,
        amount,
        item_name,
        item_description
      }

        const formFields = Object.entries(paymentData)
        .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
        .join('&')
     res.send(`${PAYFAST_URL}?${formFields}`)
}

export async function Notify(req: Request, res: Response) : Promise<any> {

  // const { Clientname, amount, item_name, orderID } = req.body
  // const ClientID = process.env.CLIENT_ID
  // const API_SECRET = process.env.API_SECRET
  // const accountApiCredentials = Buffer.from(`${ClientID}:${API_SECRET}`).toString('base64')
  // const requestHeaders = {
  //     'Content-Type': 'application/json',
  //     Authorization: `Basic ${accountApiCredentials}`,
  //     testMode: true,
  // }
  // const requestData = JSON.stringify({
  //   messages: [
  //     {
  //       content: `Order ID: ${orderID} for : ${Clientname}, Paid: R${amount}, Order: ${item_name}`,
  //       destination: process.env.DESTINATION,
  //       sample: `Order ID: ${orderID} for : ${Clientname}, Paid: R${amount}, Order: ${item_name}`
  //     }
  //   ]
  // })

  const originalBody = { ...req.body }
  const passphrase = process.env.PAYFAST_PASSPHRASE

  const signatureVerification = verifyPayFastSignature(originalBody)

  console.log('Signature verification result:', signatureVerification)

  if (!signatureVerification.isValid) {
    console.error('Invalid signature')
    return res.status(400).send('Invalid signature')
  }

  // Validate data with Payfast (server-to-server)
  const options = {
    hostname: 'sandbox.payfast.co.za',
    port: 443,
    path: '/eng/query/validate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  const requestBody = qs.stringify(originalBody)

  const pfRequest = https.request(options, pfRes => {
    let data = ''
    pfRes.on('data', chunk => (data += chunk))
    pfRes.on('end', () => {
      if (data === 'VALID') {
        console.log('Payment verified by Payfast')
        // axios.post('https://rest.mymobileapi.com/bulkmessages', requestData, { headers: requestHeaders })
        //   .then(response => {
        //     console.log('SMS sent successfully: \n', response.data)
        //   })
        //   .catch(error => {
        //     if(error.response) {
        //       console.error('Error sending SMS:', error.response.data)
        //     }
        //     else {
        //       console.error('Error sending SMS:', error.message)
        //     }
        //   })
      } else {
        console.log('Payfast verification failed')
      }
    });
  });

  pfRequest.on('error', error => {
    console.error('Payfast validation error:', error)
  });

  pfRequest.write(requestBody)
  pfRequest.end()

  console.log('ITN received:', originalBody)
  res.status(200).send('ITN received')
}

interface PayFastData {
  [key: string]: string | undefined;
  signature?: string;
}

interface SignatureVerificationResult {
  isValid: boolean;
  generatedSignature: string;
  receivedSignature: string | undefined;
}

const PAYFAST_ORDER = [
  'merchant_id',
  'merchant_key',
  'return_url',
  'cancel_url',
  'notify_url',
  'name_first',
  'name_last',
  'email_address',
  'cell_number',
  'm_payment_id',
  'amount',
  'item_name',
  'item_description',
  'email_confirmation',
  'confirmation_address',
  'payment_method',
  'amount_gross',
  'amount_fee',
  'amount_net',
  'payment_status',
  'pf_payment_id',
];

function verifyPayFastSignature(requestBody: PayFastData, passphrase?: string): SignatureVerificationResult {
  const pfData = { ...requestBody };
  const pfSignature = pfData['signature'];
  delete pfData['signature'];

   let pfOutput = '';

  // Respect the order of attributes as per documentation (do NOT sort keys)
  for (const key in pfData) {
    const val = pfData[key];
    if (val !== '') {
      const encoded = encodeURIComponent(val.trim()).replace(/%20/g, '+');
      pfOutput += `${key}=${encoded}&`;
    }
  }

  // Remove trailing "&"
  pfOutput = pfOutput.slice(0, -1);

  // Add passphrase if provided
  if (passphrase) {
    pfOutput += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;
  }

  console.log('PayFast param string:', pfOutput);

  const generatedSignature = crypto
    .createHash('md5')
    .update(pfOutput)
    .digest('hex');

  console.log('Generated signature:', generatedSignature);
  console.log('PayFast signature:', pfSignature);

  return {
    isValid: pfSignature === generatedSignature,
    generatedSignature,
    receivedSignature: pfSignature,
  };
}


