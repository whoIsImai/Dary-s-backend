import 'dotenv/config'
import { Request, Response } from 'express'
import qs from 'querystring'
import https from 'https'
import crypto from 'crypto'
import axios from 'axios'

const PAYFAST_URL = 'https://sandbox.payfast.co.za/eng/process' //https://www.payfast.co.za/eng/process"
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

  const { Clientname, amount, item_name, orderID } = req.body
  const ClientID = process.env.CLIENT_ID
  const API_SECRET = process.env.API_SECRET
  const accountApiCredentials = Buffer.from(`${ClientID}:${API_SECRET}`).toString('base64')
  const requestHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${accountApiCredentials}`,
      testMode: true,
  }
  const requestData = JSON.stringify({
    messages: [
      {
        content: `Order ID: ${orderID} for : ${Clientname}, Paid: R${amount}, Order: ${item_name}`,
        destination: process.env.DESTINATION,
        message: `Order ID: ${orderID} for : ${Clientname}, Paid: R${amount}, Order: ${item_name}`,
      }
    ]
  })

  const originalBody = { ...req.body }
  const passphrase = process.env.PAYFAST_PASSPHRASE

  originalBody['signature'] = verifyPayFastSignature(originalBody)

  let htmlForm = `<form action="${PAYFAST_URL}" method="post">`
  for (const key in originalBody) {
    if (originalBody.hasOwnProperty(key)) {
      const value = originalBody[key]
      if (value === undefined) continue
      htmlForm += `<input type="hidden" name="${key}" value="${value}">`
    }
  }
  htmlForm += `<input type="submit" value="Submit">`

  let pfParamString = ""
  for (const key in originalBody) {
    if (originalBody.hasOwnProperty(key) && key !== 'signature') {
      const value = originalBody[key]
      pfParamString += `${key}=${encodeURIComponent(value.trim()).replace(/%20/g, '+')}&`
    }
  }

  pfParamString = pfParamString.slice(0, -1)

  if (passphrase) {
    pfParamString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
  }

  const generatedSignature = crypto.createHash('md5').update(pfParamString).digest('hex')
  const receivedSignature = originalBody['signature']

  const isValid = generatedSignature === receivedSignature

  if (!isValid) {
    console.error('PayFast signature verification failed')
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
        // axios.post('https://rest.mymobileapi.com/v3/BulkMessages', requestData, { headers: requestHeaders })
        //   .then(response => {
        //     console.log('SMS sent successfully: \n', response.data)
        //   })
        //   .catch(error => {
        //     if(error.response) {
        //       console.error('Error sending SMS:', error.message, error.response.data)
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
  res.status(200).send('ITN received')
}

interface PayFastData {
  [key: string]: string | undefined;
  signature?: string;
}

function verifyPayFastSignature(requestBody: PayFastData, passphrase?: string) {
  const pfData = { ...requestBody };
  delete pfData['signature'];

   let pfOutput = '';

  // Respect the order of attributes as per documentation (do NOT sort keys)
  for (const key in pfData) {
    if( pfData.hasOwnProperty(key)) {
      const value = pfData[key];
      if (value !== undefined) {
        pfOutput += `${key}=${encodeURIComponent(value.trim()).replace(/%20/g, '+')}&`;
      }
    }
  }

  // Remove trailing "&"
  pfOutput = pfOutput.slice(0, -1);

  // Add passphrase if provided
  if (passphrase) {
    pfOutput += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;
  }

  return crypto.createHash('md5').update(pfOutput).digest('hex');
}


