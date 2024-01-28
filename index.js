const mariadb = require('mariadb');
const express = require('express');
const path = require('path');
const app = express();
const port = 80
const { spawn } = require('child_process');

const pool = mariadb.createPool({
    host: '127.0.0.1', 
    user:'shootmgr', 
    password: 'DavidNuthall', 
    database: 'shooting',
    connectTimeout: 20000,
    connectionLimit: 20,
    multipleStatements: true
});

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

pool.getConnection()
    .then(conn => {
        console.log("Connected to MariaDB database!");
        conn.end(); //close the connection
    })
    .catch(err => {
        console.log("Error connecting to MariaDB database: ", err);
});

// app.get('/drop/opensaysme', async (req, res) => {
//     let conn;
//     try {
//         conn = await pool.getConnection();
//         const rows = await conn.query("DROP TABLE scores");
//         res.sendStatus(200);
//     } catch (err) {
//         console.log("Error executing query: ", err);
//         res.status(500).send({error: err});
//     } finally {
//         if (conn) conn.end();
//     }
// });

app.get('/add/:name/:score/:competition/:date/:id', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("INSERT INTO scores (name, score, competition, date, id) VALUES (?, ?, ?, ?, ?)", [req.params.name, req.params.score, req.params.competition, req.params.date]);
        res.sendStatus(201);
    } catch (err) {
        console.log("Error executing query: ", err);
        res.status(500).send({error: err});
    } finally {
        if (conn) conn.end();
    }
});

app.get('/apiadd/:user/:pwd', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("INSERT INTO api (name, password, publicScore) VALUES (?, ?, 1)", [req.params.user, req.params.pwd]);
        res.sendStatus(201);
    } catch (err) {
        console.log("Error executing query: ", err);
        res.status(500).send({error: err});
    } finally {
        if (conn) conn.end();
    }
});

app.get('/login', async (req, res) => {
    //retunr the login html page
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/auth/:username/:password', async (req, res) => {
    //check the password against the unsername in the api table
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT password FROM api WHERE name = ?", [req.params.username]);
        if (rows[0].password === req.params.password) {
            res.sendStatus(200);
        } else {
            res.sendStatus(401);
        }
    } catch (err) {
        console.log("Error executing query: ", err);
        res.status(500).send({error: err});
    } finally {
        if (conn) conn.end();
    }
});

app.get('/user', async (req, res) => {
    //return the user html page
    res.sendFile(path.join(__dirname, 'user.html'));
});

app.post('/setpub/:username/:value', async (req, res) => {
    // update the publicScore field in the api table
    let conn;
    try {
        if (req.params.value == "true") {
            req.params.value = 1;
        } else if (req.params.value == "false") {
            req.params.value = 0;
        }
        conn = await pool.getConnection();
        const rows = await conn.query("UPDATE api SET publicScore = ? WHERE name = ?", [req.params.value, req.params.username]);
        res.sendStatus(200);
    } catch (err) {
        console.log("Error executing query: ", err);
        res.status(500).send({error: err});
    } finally {
        if (conn) conn.end();
    }
    console.log(req.params);
});

app.post('/setpwd/:username/:old/:new', async (req, res) => {
    //update the password field in the api table
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT password FROM api WHERE name = ?", [req.params.username]);
        if (rows[0].password === req.params.old) {
            const rows = await conn.query("UPDATE api SET password = ? WHERE name = ?", [req.params.new, req.params.username]);
            res.sendStatus(200);
        } else {
            res.sendStatus(401);
        }
    } catch (err) {
        console.log("Error executing query: ", err);
        res.status(500).send({error: err});
    } finally {
        if (conn) conn.end();
    }
});

app.get('/public/:username', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT publicScore FROM api WHERE name = ?", [req.params.username]);
        if (rows.length > 0 && rows[0].publicScore === 1) {
            res.sendStatus(200);
        } else {
            res.sendStatus(401);
        }
    } catch (err) {
        console.log("Error executing query: ", err);
        res.status(500).send({error: err});
    } finally {
        if (conn) conn.end();
    }
});

app.get('/scores/:username/:password', async (req, res) => {
    //check the password against the unsername in the api table
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT password FROM api WHERE name = ?", [req.params.username]);
        if (rows[0].password === req.params.password) {
            const rows = await conn.query("SELECT score, competition, date FROM scores WHERE name = ?", [req.params.username]);
            res.send(rows);
        } else {
            res.sendStatus(401);
        }
    } catch (err) {
        console.log("Error executing query: ", err);
        res.status(500).send({error: err});
    } finally {
        if (conn) conn.end();
    }
});

app.get('/settings', async (req, res) => {
    res.sendFile(path.join(__dirname, 'settings.html'));
});

app.get('/images/:username/:filename', async (req, res) => {
    res.sendFile(path.join(__dirname, 'images/', req.params.username, '/', req.params.filename));
});

//send an orderd list of the top score of each shooter
app.get('/', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT name, score FROM scores ORDER BY name, score DESC");
        let leaderboard = [];
        let currentUser = rows[0].name;
        let currentScores = [];
        for (let row of rows) {
            if (row.name !== currentUser) {
                leaderboard.push({name: currentUser, scores: currentScores});
                currentUser = row.name;
                currentScores = [];
            }
            currentScores.push(row.score);
        }
        leaderboard.push({name: currentUser, scores: currentScores});
        leaderboard.sort((a, b) => {
            let i = 0;
            while (i < a.scores.length && i < b.scores.length && a.scores[i] === b.scores[i]) {
                i++;
            }
            if (i === a.scores.length && i === b.scores.length) {
                return 0; // a and b are equal
            } else if (i === a.scores.length) {
                return 1; // a is less than b
            } else if (i === b.scores.length) {
                return -1; // a is greater than b
            } else {
                return b.scores[i] - a.scores[i]; // compare the first different pair of scores
            }
        });
        res.send(`
        <html>
        <head>
            <style>
            body {
                background-color: #2E3440;
                color: #ECEFF4;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            h1 {
                text-align: center;
            }
            .card {
                background-color: #3B4252;
                border-radius: 10px;
                padding: 10px;
                margin: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            button {
                background-color: #3B4252;
                border: none;
                color: #ECEFF4;
                padding: 10px;
                text-align: center;
                text-decoration: none;
                display: inline-block;
                font-size: 16px;
                border-radius: 10px;
                margin: 10px;
                cursor: pointer;
            }
            </style>
        </head>
        <body>
        <button onclick="window.location.href = '/login.html';">Login</button>
            <h1>Leaderboard</h1>
            ${leaderboard.map(user => `
                <div class="card">
                    <h2>${user.name}</h2>
                    <h3>${user.scores[0]}</h3>
                </div>
            `).join('')}
        </body>
        <script>
        
    </html>
        `);
    } catch (err) {
        console.log("Error executing query: ", err);
        res.status(500).send({error: err});
    } finally {
        if (conn) conn.end();
    }
});

app.listen(port, () => {
    console.log(`Online @ http://localhost:${port}`)
});