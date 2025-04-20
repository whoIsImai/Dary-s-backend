import { Router } from "express"

import {Pay, Hi} from '../controller/payfast'

const router = Router()

router.post("/pay", Pay)
router.get("/hi", Hi)

export default router