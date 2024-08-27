const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const cors = require('cors')
const jwt = require('jsonwebtoken')


const app = express()
app.use(cors())
app.use(express.json())


const dbPath = path.join(__dirname, "hotelResidence.db")

let db = null

const initialDbAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        })
        app.listen(3006, () => {
            console.log("Server is running at http://localhost:3006")
        })
    } catch (error) {
        console.log(`DB Error : ${error.message}`)
        process.exit(1)
    }
}

initialDbAndServer()

const authorizationToken = (req, res, next) => {
    let jwtToken
    const authHeader = req.headers['authorization']
    if (authHeader !== undefined){
        jwtToken = authHeader.split(' ')[1]
    }
    if (jwtToken === undefined){
        res.status(400)
        res.send('Invalid JWT Token')
    }else{
        jwt.verify(jwtToken, 'user_name', async (error, payload) =>{
            if(error){
                res.status(400)
                res.send('Invalid JWT Token')
            }else{
                req.username = payload.username
                next()
            }
        })
    }
}

app.get('/users', authorizationToken, async (req, res) =>{
    const query = `SELECT * FROM hotel_user`
    const getUser = await db.all(query)
    res.send(getUser)
})

app.post('/users', authorizationToken,  async (req, res) =>{
    const {id, username, password, role_name} =  req.body
    const hashedPassword = await bcrypt.hash(password, 15)
    const selectUserQuery = `
    SELECT * FROM hotel_user WHERE username = '${username}';`;
    const dbUser = await db.get(selectUserQuery)
    if (dbUser === undefined){
        const createUser = `
        INSERT INTO hotel_user (id, username, password, role_name)
        VALUES (${id}, '${username}', '${hashedPassword}', '${role_name}')`;
        await db.run(createUser)
        res.send('User create Successfuly')
    }else{
        res.send("User already exist")
    }
})

app.put('/users/:id/', async (req, res)=>{
    const {id} = req.params
    const {username, password, role_name} = req.body
    const updateUser = `
    UPDATE hotel_user 
    SET
    username = '${username}',
    password = '${password}',
    role_name = '${role_name}'
    WHERE id = ${id}`;
    await db.run(updateUser)
    res.send('User Details Updated')
})

app.delete('/users/:id/', async (req, res)=>{
    const {id} = req.params
    const deleteUser = `
    DELETE FROM hotel_user WHERE id =${id}`
    await db.run(deleteUser)
    res.send("delete User")
})

app.post('/login', async (req, res)=>{
    const {username, password} = req.body
    const selectLoginQuery = `SELECT * FROM hotel_user WHERE username = '${username}'`
    const loginUser = await db.get(selectLoginQuery)
    if (loginUser === undefined){
        res.status(400)
        res.send('Invalid user')
    }else{
        const isPasswordMatch = await bcrypt.compare(password, loginUser.password)
        if (isPasswordMatch === true){
            const payload = {username: username}
            const jwtToken = jwt.sign(payload, 'user_name')
            res.status(200)
            res.send(jwtToken)
        }else{
            res.status(400)
            res.send('Invalid Password')
        }
    }
})