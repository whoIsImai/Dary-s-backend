import { Router } from "express"

import Pay from '../controller/payfast'

const router = Router()

router.post("/pay", Pay)