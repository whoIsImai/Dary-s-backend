import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import bodyParser from 'body-parser'
import router from './router/router'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use('/api', router)


app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
