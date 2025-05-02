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

    const { Clientname,amount, item_name, item_description, orderID } = req.body
    
    const paymentData = {
        merchant_id: MerchantId,
        merchant_key: MerchantKey,
        return_url: ReturnUrl,
        cancel_url: CancelUrl,
        notify_url: NotifyUrl,
        Clientname,
        amount,
        item_name,
        item_description
      }

        const formFields = Object.entries(paymentData)
        .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
        .join('&')
    console.log(`${PAYFAST_URL}?${formFields}`)
     res.send(`${PAYFAST_URL}?${formFields}`)
}

export function Hi(req: Request, res: Response) {
res.send('Hello from Payfast')
}

export async function Notify(req: Request, res: Response) : Promise<void> {

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
      }
    ]
  })

     // Payfast sends the ITN data as x-www-form-urlencoded
      const originalBody = { ...req.body }
    //   console.log('ITN data:', originalBody)
    //  const pfData = { ...req.body }
    //  const Passphrase = process.env.PASSPHRASE
   
    //  const pfSignature = pfData['signature']
    //  delete pfData['signature']
   
    //  let pfParamString = Object.keys(pfData)
    //    .sort()
    //    .map(key => `${key}=${encodeURIComponent(pfData[key]).replace(/%20/g, '+')}`)
    //    .join('&')

    //   if(Passphrase){
    //     pfParamString += `&passphrase=${encodeURIComponent(Passphrase).replace(/%20/g, '+')}`
    //   }
   
    //  const generatedSignature = crypto
    //    .createHash('md5')
    //    .update(pfParamString)
    //    .digest('hex')
   
    //  if (pfSignature !== generatedSignature) {
    //    console.log('Invalid signature')
    //    res.status(400).send('Invalid signature')
    //    return
    //  }

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
        axios.post('https://rest.mymobileapi.com/bulkmessages', requestData, { headers: requestHeaders })
          .then(response => {
            console.log('SMS sent successfully:', response.data)
          })
          .catch(error => {
            if(error.response) {
              console.error('Error sending SMS:', error.response.data)
            }
            else {
              console.error('Error sending SMS:', error.message)
            }
          })
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