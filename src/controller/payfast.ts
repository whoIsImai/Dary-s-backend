import 'dotenv/config'
import { Request, Response } from 'express'
import qs from 'querystring'
import https from 'https'
import crypto from 'crypto'

const PAYFAST_URL = 'https://sandbox.payfast.co.za/eng/process'
const MerchantId = process.env.MERCHANT_ID
const MerchantKey = process.env.MERCHANT_KEY
const ReturnUrl = process.env.RETURN_URL
const CancelUrl = process.env.CANCEL_URL
const NotifyUrl = process.env.NOTIFY_URL

export async function Pay(req: Request, res: Response) : Promise<void> {

    const { Clientname,amount, item_name_quantity, productID } = req.body
    
    const paymentData = {
        merchant_id: MerchantId,
        merchant_key: MerchantKey,
        return_url: ReturnUrl,
        cancel_url: CancelUrl,
        notify_url: NotifyUrl,
        Clientname,
        amount,
        item_name_quantity,
        productID
      }

        const formFields = Object.entries(paymentData)
        .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
        .join('&')
    
     res.send(`${PAYFAST_URL}?${formFields}`)
}

export function Hi(req: Request, res: Response) {
    res.json({message: 'Hey there!'})
}

export async function Notify(req: Request, res: Response) : Promise<void> {
     // Payfast sends the ITN data as x-www-form-urlencoded
  const pfData = req.body;

  // Validate signature
  const pfSignature = pfData['signature']
  delete pfData['signature']

  const pfParamString = Object.keys(pfData)
    .sort()
    .map(key => `${key}=${encodeURIComponent(pfData[key])}`)
    .join('&')

  const generatedSignature = crypto
    .createHash('md5')
    .update(pfParamString)
    .digest('hex')

  if (pfSignature !== generatedSignature) {
    console.log('Invalid signature')
     res.status(400).send('Invalid signature')
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

  const requestBody = qs.stringify(req.body)

  const pfRequest = https.request(options, pfRes => {
    let data = ''
    pfRes.on('data', chunk => (data += chunk))
    pfRes.on('end', () => {
      if (data === 'VALID') {
        console.log('Payment verified by Payfast')
     
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