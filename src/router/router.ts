import { Router } from "express"

import {Pay, Notify} from '../controller/payfast'

const router = Router()

router.post("/pay", Pay)
router.post("/notify_url", Notify)

export default router