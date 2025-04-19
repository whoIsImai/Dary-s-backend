import 'dotenv/config'
import { Request, Response } from 'express'

const PAYFAST_URL = 'https://sandbox.payfast.co.za/eng/process'
const MerchantId = process.env.MERCHANT_ID
const MerchantKey = process.env.MERCHANT_KEY
const ReturnUrl = process.env.RETURN_URL
const CancelUrl = process.env.CANCEL_URL
const NotifyUrl = process.env.NOTIFY_URL

export default async function Pay(req: Request, res: Response) {

    const { name,amount, item_name } = req.body
    
    const paymentData = {
        merchant_id: MerchantId,
        merchant_key: MerchantKey,
        return_url: ReturnUrl,
        cancel_url: CancelUrl,
        notify_url: NotifyUrl,
        name,
        amount,
        item_name}

        const formFields = Object.entries(paymentData)
        .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
        .join('&')
    
      res.send(`${PAYFAST_URL}?${formFields}`)

}