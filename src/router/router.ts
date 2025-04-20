import { Router } from "express"

import {Pay, Hi, Notify} from '../controller/payfast'

const router = Router()

router.post("/pay", Pay)
router.post("/notify_url", Notify)
router.get("/hi", Hi)

export default router