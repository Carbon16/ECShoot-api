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

app.get('/loaderio-248965f96e38a0964ec2336abd110a46/', async (req, res) => {
    res.send('loaderio-248965f96e38a0964ec2336abd110a46');
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

app.get('/getusers', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT name, AVG(score) as averageScore, COUNT(score) as scoreCount FROM scores GROUP BY name");
        const data = rows.map(row => ({
            ...row,
            averageScore: row.averageScore.toString(),
            scoreCount: row.scoreCount.toString()
        }));
        res.json(data);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    } finally {
        if (conn) conn.end();
    }
});

app.get('/getdates', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT date, AVG(score) as averageScore, COUNT(score) as scoreCount FROM scores GROUP BY date");
        rows.forEach(row => {
            let date = new Date(row.date);
            let formattedDate = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
            row.date = formattedDate;
            row.averageScore = row.averageScore ? row.averageScore.toString() : '0';
            row.scoreCount = row.scoreCount ? row.scoreCount.toString() : '0';
        });
        res.json(rows);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    } finally {
        if (conn) conn.end();
    }
});


app.get('/byuser/:username', async (req, res) => {
    // return a table and average of the scores for a given user
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT score, competition, date FROM scores WHERE name = ?", [req.params.username]);
        // format date to be more readable
        rows.forEach(row => {
            let date = new Date(row.date);
            let formattedDate = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
            row.date = formattedDate;
        });
        let totalScore = 0;
        let totalShoots = rows.length;

        rows.forEach(row => {
            totalScore += row.score;
        });

        let averageScore = totalScore / totalShoots;
        let table = `
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
            table {
                border-collapse: collapse;
                width: 100%;
            }
            th, td {
                text-align: left;
                padding: 8px;
            }
            tr:nth-child(even) {background-color: #4C566A;}
            </style>
        </head>
        <body>
            <h1>${req.params.username}</h1>
            <p>Average Score: ${averageScore}</p>
            <p>Total Shoots: ${totalShoots}</p>
            <table>
                <tr>
                    <th>Score</th>
                    <th>Competition</th>
                    <th>Date</th>
                </tr>
                ${rows.map(row => `
                    <tr>
                        <td>${row.score}</td>
                        <td>${row.competition}</td>
                        <td>${row.date}</td>
                    </tr>
                `).join('')}
            </table>
        </body>
    </html>
        `;
        res.send(table);
    } finally
    {
        if (conn) conn.end();
    }
});

app.get('/bydate/:date', async (req, res) => {
    // return a table and average of the scores for a given user
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT score, competition, name FROM scores WHERE date = ?", [req.params.date]);
        // format date to be more readable
        let totalScore = 0;
        let totalShoots = rows.length;
    
        rows.forEach(row => {
            totalScore += row.score;
        });
    
        let averageScore = totalShoots > 0 ? totalScore / totalShoots : 0;
    
        let table = `
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
            table {
                border-collapse: collapse;
                width: 100%;
            }
            th, td {
                text-align: left;
                padding: 8px;
            }
            tr:nth-child(even) {background-color: #4C566A;}
            </style>
        </head>
        <body>
            <h1>${req.params.date}</h1>
            <p>Average Score: ${averageScore}</p>
            <p>Total Shoots: ${totalShoots}</p>
            <table>
                <tr>
                    <th>Score</th>
                    <th>Competition</th>
                    <th>Date</th>
                </tr>
                ${rows.map(row => `
                    <tr>
                        <td>${row.score}</td>
                        <td>${row.competition}</td>
                        <td>${row.name}</td>
                    </tr>
                `).join('')}
            </table>
        </body>
    </html>
        `;
        res.send(table);
    } finally
    {
        if (conn) conn.end();
    }
});


app.get('/admin/:u/:p', async (req, res) => {
    //check the password against the unsername in the api table
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT password FROM api WHERE name = ?", [req.params.u]);
        if (rows[0].password === req.params.p) {
            // check if user has admin permission
            const rows = await conn.query("SELECT admin FROM api WHERE name = ?", [req.params.u]);
            if (rows[0].admin === 1) {
                res.sendFile(path.join(__dirname, 'admin.html'));
                // await conn.query("INSERT INTO log (name, action) VALUES (?, ?)", [req.params.u, "User viewed admin page"]);
            } else {
                res.sendStatus(401);
            }
    }} catch (err) {
        console.log("Error executing query: ", err);
        res.status(500).send({error: err});
    } finally {
        if (conn) conn.end();
    }
});

app.get('/competitions', async (req, res) => {
    // return a list of all competitions, with the id and name
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT id, name FROM competitions");
        res.send(rows);
    } finally {
        if (conn) conn.end();
    }
});

// add new score
app.get('/addscore/:name/:score/:competition/', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        // convert score and competition to integers
        req.params.score = parseInt(req.params.score);
        req.params.competition = parseInt(req.params.competition);
        const rows = await conn.query("INSERT INTO scores (name, score, competition) VALUES (?, ?, ?)", [req.params.name, req.params.score, req.params.competition]);
        res.sendStatus(201);
    } finally {
        if (conn) conn.end();
    }
});

app.get('/users', async (req, res) => {
    // return a list of all users
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT unique name FROM scores");
        res.send(rows.map(row => row.name));
    } finally {
        if (conn) conn.end();
    }
});

app.get('/add/:u/:p', async (req, res) => {
    //check the password against the unsername in the api table
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT password FROM api WHERE name = ?", [req.params.u]);
        if (rows[0].password === req.params.p) {
            // check if user has admin permission
            const rows = await conn.query("SELECT admin FROM api WHERE name = ?", [req.params.u]);
            if (rows[0].admin === 1) {
                res.sendFile(path.join(__dirname, 'add.html'));
                // await conn.query("INSERT INTO log (name, action) VALUES (?, ?)", [req.params.u, "User viewed admin page"]);
            } else {
                res.sendStatus(401);
            }
    }} catch (err) {
        console.log("Error executing query: ", err);
        res.status(500).send({error: err});
    } finally {
        if (conn) conn.end();
    }
});

app.get('/perm/:u', async (req, res) => {
    // check if user has admin permission 
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT admin FROM api WHERE name = ?", [req.params.u]);
        if (rows[0].admin === 1) {
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

app.post('/auth/:username/:password', async (req, res) => {
    //check the password against the unsername in the api table
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT password FROM api WHERE name = ?", [req.params.username]);
        if (rows[0].password === req.params.password) {
            res.sendStatus(200);
            // add record to log table
            // await conn.query("INSERT INTO log (name, action) VALUES (?, ?)", [req.params.username, "User logged in"]);
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
        // await conn.query("INSERT INTO log (name, action) VALUES (?, ?)", [req.params.username, `Set publicScore to ${req.params.value}`]);
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
            // await conn.query("INSERT INTO log (name, action) VALUES (?, ?)", [req.params.username, "User changed password"]);
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
            // await conn.query("INSERT INTO log (name, action) VALUES (?, ?)", [req.params.username, "Viewed scores"]);
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
                font-size: 25px;
                border-radius: 10px;
                margin: 10px;
                cursor: pointer;
                width: 100%;
                filter: invert(100%);
            }
            </style>
        </head>
        <body>
        <button onclick="window.location.href = '/login';">Login</button>
            <h1>Leaderboard</h1>
            ${leaderboard.map(user => `
                <div class="card">
                    <h2>${user.name}</h2>
                    <h3>${user.scores[0]}</h3><i></i>
                </div>
            `).join('')}
        </body>
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