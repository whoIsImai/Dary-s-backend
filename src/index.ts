import express from 'express'
import cors from 'cors'
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())


app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
