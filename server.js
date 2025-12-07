const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
var crypto = require('crypto')
const zlib = require('zlib');
const multer = require('multer');
const path = require('path');
const Hashids = require('hashids/cjs');
const hashids = new Hashids('my salt', 16);
const session = require('express-session');
require('dotenv').config();
const fs = require('fs');
let dynamicFolderName = "words";

//var name = 'user_Session01';
//var hash = crypto.createHash('md5').update(name).digest('hex');
//console.log(hash); // 9b74c9897bac770ffc029102a200c5de

const db = new sqlite3.Database(path.join(__dirname, 'data.db'));


// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'uploads', dynamicFolderName, req.session.user);
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true }); // Tạo thư mục nếu chưa tồn tại
        }
        cb(null, dir);
      //  cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));


app.use(session({
    secret: 'xvKtGHewe',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

function checkAuthentication(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
}


app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const stmt = db.prepare("SELECT * FROM user WHERE username = ? AND password = ? AND active = 1");
    stmt.get(username, password, (err, row) => {
        if (err) {
            res.status(500).json({ success: false, message: 'Database error' });
        } else if (row) {
            req.session.user = username;
            db.run("UPDATE user SET last_login = datetime('now') WHERE username = ?", [username]);
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Invalid username or password' });
        }
    });
    stmt.finalize();
});



app.use((req, res, next) => {
    console.log(req.path)
    if (req.path === '/add.html' && !req.session.user) {
        return res.redirect('/login.html');
    }
    next();
});

app.get('/add.html', (req, res) => {
    res.sendFile(__dirname + '/public/add.html');
});


app.post('/add-word', checkAuthentication, upload.fields([{ name: 'audio' }, { name: 'image' }]), (req, res) => {
    const username = req.session.user;
    const { english, vietnamese, session, level, description } = req.body;
    const imageUrl = req.files.image?.[0]?.filename || null;
    const audioUrl = req.files.audio?.[0]?.filename || null;

    const stmt = db.prepare("INSERT INTO words (english, vietnamese, session, username, level, description, imageUrl, audio) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    stmt.run(english, vietnamese, session, username, level, description, imageUrl, audioUrl, (err) => {
        if (err) {
            res.status(500).json({ success: false, message: 'Database error' });
        } else {
            res.json({ success: true });
        }
    });
    stmt.finalize();
});


app.post('/edit-word', checkAuthentication, upload.single('newImage'), (req, res) => {
    const { id, newEnglish, newVietnamese, newLevel, newDescription } = req.body;
    const newImageUrl = req.file ? req.file.filename : null;

    const updateFields = [];
    const updateValues = [];

    if (newEnglish) {
        updateFields.push('english = ?');
        updateValues.push(newEnglish);
    }
    if (newVietnamese) {
        updateFields.push('vietnamese = ?');
        updateValues.push(newVietnamese);
    }
    if (newLevel) {
        updateFields.push('level = ?');
        updateValues.push(newLevel);
    }
    if (newDescription) {
        updateFields.push('description = ?');
        updateValues.push(newDescription);
    }
    if (newImageUrl) {
        updateFields.push('imageUrl = ?');
        updateValues.push(newImageUrl);
    }

    if (updateFields.length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updateValues.push(id);

    const sql = `UPDATE words SET ${updateFields.join(', ')} WHERE id = ?`;
    console.log(sql)
    db.run(sql, updateValues, function (err) {
        if (err) {
            console.error('Error updating word', err.message);
            res.status(500).json({ success: false });
        } else {
            res.json({ success: true });
        }
    });
});

app.post('/delete-word', checkAuthentication, (req, res) => {
    const username = req.session.user;
    const { id } = req.body;
    db.run(`DELETE FROM words WHERE id = ?`,
        [id],
        function (err) {
            if (err) {
                console.error('Error deleting word', err.message);
                res.status(500).json({ success: false });
            } else {
                res.json({ success: true });
            }
        });
});

app.get('/search-words', (req, res) => {
    const session = req.query.keyw;
    db.all(`SELECT id, english, vietnamese ,level ,description,
        CASE 
            WHEN imageUrl IS NULL OR imageUrl = '' 
            THEN NULL 
            ELSE concat('words/', username, '/', imageUrl) 
        END AS imageUrl
     , CASE 
            WHEN audio IS NULL OR audio = '' 
            THEN NULL 
            ELSE concat('words/', username, '/', audio) 
        END AS audio FROM words WHERE session = ?`,
        [session],
        (err, rows) => {
            if (err) {
                console.error('Error querying words', err.message);
                res.status(500).json({ success: false });
            } else {
                res.json({ success: true, words: rows });
            }
        });
});

app.post('/create-url', checkAuthentication, (req, res) => {
    const data = req.body;
    data.username = req.session.user;
    const quizName = data.quizName;
    const username = req.session.user;

    // Convert data object to JSON string
    let randomCode = genRand(8);
    console.log(randomCode)
    const dataString = JSON.stringify(data);
    console.log(dataString)

    // Compress the data string
    zlib.deflate(dataString, (err, buffer) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Compression error' });
        }

        // Create a hash of the compressed data
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');

        // Use Hashids to create a short unique ID
        const shortId = hashids.encodeHex(hash.slice(0, 8)); // Using part of the hash for shorter ID

        // Store the compressed and encrypted data in the database
        let url = ""
        db.run(`INSERT INTO encoded_data (id, name,username, passcode, data) VALUES (?,?, ?,?,?)`, [shortId, quizName, username, randomCode, buffer.toString('base64')], function (err) {
            if (err) {
                console.log(err);
                db.get(`SELECT data, passcode FROM encoded_data WHERE id = ?`, [shortId], (err, row) => {
                    if (err) {
                        console.log("Error get old")
                    }
                    if (!row) {
                        console.log("Not exits data")
                    }
                    url = row.data;
                    randomCode = row.passcode;
                    // Create URL with short ID
                    url = `${process.env.PAGE_URL}:${process.env.PORT}/student/?data=${encodeURIComponent(shortId)}`;
                    console.log("url " + url)

                    res.json({ success: true, url, randomCode });
                });
            } else {
                // Create URL with short ID
                url = `${process.env.PAGE_URL}:${process.env.PORT}/student/?data=${encodeURIComponent(shortId)}`;
                console.log(url)
                res.json({ success: true, url, randomCode });
            }
        });
    });
});

// Add a route to decrypt the data
app.get('/quiz', (req, res) => {
    const shortId = req.query.data;

    if (!shortId) {
        return res.status(400).json({ success: false, message: 'No data provided' });
    }

    data = {};
    // Retrieve the original compressed and encrypted data using the short ID
    db.get(`SELECT name, data FROM encoded_data WHERE id = ?`, [shortId], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!row) {
            return res.status(404).json({ success: false, message: 'Data not found' });
        }

        // Decompress the data
        const buffer = Buffer.from(row.data, 'base64');
        const quizName = row.name;
        zlib.inflate(buffer, (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Decompression error' });
            }

            // Parse the decompressed data
            data = JSON.parse(result.toString());
            console.log(data)
            getWord(data,shortId,quizName, res)
        });
    });

});

app.post('/check-pascode', (req, res) => {
    console.log(req.body);
    db.get(`SELECT id FROM encoded_data WHERE id = ? and passcode = ?`, [req.body.dataUrl, req.body.passcode], (err, row) => {
        if (err) {
            res.status(400).json({ success: false });
        } else {
            if (!row) {
                res.status(400).json({ success: false });
            } else {
                res.json({ success: true });
            }
        }
    });
});

app.post('/submitAnswer', (req, res) => {
    const { testUser, duration,quizName, quizId, data: dataAnswer } = req.body;
    const totalPoint = dataAnswer.reduce((sum, item) => sum + item.point, 0);

    db.serialize(() => {
        // Chèn dữ liệu vào bảng answer
        const stmtAnswer = db.prepare(`INSERT INTO answer (testuser, quizName, quizId, duration, totalPoint) VALUES (?,?, ?, ?, ?)`);
        stmtAnswer.run(testUser, quizName, quizId, duration, totalPoint, function(err) {
            if (err) {
                return console.error(err.message);
            }

            const answerId = this.lastID; // Lấy ID của bản ghi vừa chèn vào bảng answer

            // Chèn dữ liệu vào bảng answerdetail
            const stmtAnswerDetail = db.prepare(`INSERT INTO answerdetail (answerid, topicId, question, answer, correct, hintCount, point) VALUES (?,?, ?, ?, ?, ?, ?)`);
            dataAnswer.forEach(item => {
                const { question,session, answer, hintCount, correct, point } = item;
                stmtAnswerDetail.run(answerId, session, question, answer, correct, hintCount, point);
            });

            stmtAnswerDetail.finalize();
        });

        stmtAnswer.finalize();

        
    });
});

function genRand(len) {
    return Math.random().toString(36).substring(2, len + 2);
}

function getWord(data,shortId,quizName, res) {
    const session = data.session;
    const numberQuestion = data.numberQuestion;
    const hard = data.hard;
    const medium = data.medium;
    const easy = data.easy;
    const username = data.username;
    remainQuestion = 0;
    notIn = [];

    if (numberQuestion) {
        remainQuestion = Number(numberQuestion);
    }
    let baseQuery = `SELECT * FROM words WHERE username = ?`;
    let queryParams = []
    let queryParts = [];
    if (hard) {
        queryParts.push(`SELECT * FROM (SELECT * FROM words WHERE username = ? AND level = 'Hard' ${session && session !== 'all' ? 'AND session = ?' : ''} LIMIT ?)`);
        queryParams.push(username);
        if (session && session !== 'all') queryParams.push(session);
        remainQuestion = remainQuestion - Number(hard);
        notIn.push('Hard');
        queryParams.push(Number(hard));
    }
    if (medium) {
        queryParts.push(`SELECT * FROM (SELECT * FROM words WHERE username = ? AND level = 'Medium' ${session && session !== 'all' ? 'AND session = ?' : ''} LIMIT ?)`);
        queryParams.push(username);
        if (session && session !== 'all') queryParams.push(session);
        remainQuestion = remainQuestion - Number(medium);
        notIn.push('Medium');
        queryParams.push(Number(medium));
    }
    if (easy) {
        queryParts.push(`SELECT * FROM  (SELECT * FROM words WHERE username = ? AND level = 'Easy' ${session && session !== 'all' ? 'AND session = ?' : ''} LIMIT ?)`);
        queryParams.push(username);
        if (session && session !== 'all') queryParams.push(session);
        remainQuestion = remainQuestion - Number(easy);
        notIn.push('easy');
        queryParams.push(Number(easy));
    }

    if (remainQuestion > 0 && notIn.length != 3) {
        queryParams.push(username);
        if (session && session !== 'all') {
            baseQuery += ` AND session = ?`;
            queryParams.push(session);
        }
        if (notIn.length == 0) {
            queryParams.push(Number(remainQuestion));
            queryParts.push(`SELECT * FROM  ( ` + baseQuery + ` LIMIT ? )`);
        } else {
            queryParams.push(Number(remainQuestion));
            queryParts.push(`SELECT * FROM  ( ` + baseQuery + ` and level not in ('` + notIn.join('\',\'') + `') LIMIT ? )`);
        }
    }
    if (queryParts.length == 0) {
        queryParams.push(username);
        if (session && session !== 'all') {
            baseQuery += ` AND session = ?`;
            queryParams.push(session);
        }

        queryParts.push(baseQuery)
    }

    finalQuery = queryParts.join(' UNION ALL ');

    console.log(finalQuery)
    db.all(finalQuery, queryParams, (err, rows) => {
        if (err) {
            console.error('Error retrieving words', err.message);
            res.status(500).json({ success: false, message: 'Database error' });
        } else {

            res.json({
                success: true,
                quizName: quizName,
                quizId: shortId,
                type: data.type,
                time: data.time,
                tryAgainTimes: data.tryAgainTimes,
                wrongMinusScoreHard: data.wrongMinusScore.hard,
                wrongMinusScoreMedium: data.wrongMinusScore.medium,
                wrongMinusScoreEasy: data.wrongMinusScore.easy,
                rightPlusScoreHard: data.rightPlusScore.hard,
                rightPlusScoreMedium: data.rightPlusScore.medium,
                rightPlusScoreEasy: data.rightPlusScore.easy,
                skipMinusScoreHard: data.skipMinusScore.hard,
                skipMinusScoreMedium: data.skipMinusScore.medium,
                skipMinusScoreEasy: data.skipMinusScore.easy,
                hintMinusScoreHard: data.hintMinusScore.hard,
                hintMinusScoreMedium: data.hintMinusScore.medium,
                hintMinusScoreEasy: data.hintMinusScore.easy,
                skip: data.skip,
                hint: data.hint,
                maxHint: data.maxHint,
                correctCheck: data.correctCheck,
                correctDisplay: data.correctDisplay,
                words: rows
            });
        }
    });
}

app.get('/get-sessions', checkAuthentication, (req, res) => {
    const username = req.session.user;
    const type = req.query.type;
    db.all(`SELECT session, session_encode FROM topic WHERE username = ? and type = ?`, [username,type], (err, rows) => {
        if (err) {
            console.error('Error querying sessions', err.message);
            res.status(500).json({ success: false });
        } else {
            res.json({ success: true, sessions: rows });
        }
    });
});

app.post('/add-session', checkAuthentication, (req, res) => {
    const username = req.session.user;
    const { session, type } = req.body;
    var tmp = username + '_' + session + '_' + type;
    var session_encode = crypto.createHash('md5').update(tmp).digest('hex');
    db.run(`INSERT INTO topic (username, session, session_encode, type) VALUES (?,?,?,?)`, [username, session, session_encode, type], function (err) {
        if (err) {
            console.error('Error inserting session', err.message);
            res.status(500).json({ success: false });
        } else {
            res.json({ success: true, session_encode: session_encode });
        }
    });
});

// Lấy danh sách answer
app.get('/answers',checkAuthentication, (req, res) => {
    const username = req.session.user;

    db.all(`SELECT a.id, a.testuser, t.name AS name, a.duration, a.totalPoint
            FROM answer a
            JOIN encoded_data t ON a.quizId = t.id
            WHERE t.username = ?`, [username], (err, rows) => {
        if (err) {
            res.status(500).send(err.message);
        } else {
            res.json(rows);
        }
    });
});

// Lấy chi tiết answer
app.get('/answerdetails/:answerid', (req, res) => {
    const answerid = req.params.answerid;
    db.all(`SELECT question, answer, correct, hintCount, point
            FROM answerdetail
            WHERE answerid = ?`, [answerid], (err, rows) => {
        if (err) {
            res.status(500).send(err.message);
        } else {
            res.json(rows);
        }
    });
});

// API xử lý submit tất cả
app.post('/saveConv',checkAuthentication, (req, res) => {
    const username = req.session.user;
    const { convName, session, textConv, convItems } = req.body;

    if (!convName || !session || !textConv || !Array.isArray(convItems)) {
      return res.status(400).send("Dữ liệu không hợp lệ");
    }
  
    db.serialize(() => {
      // Bước 1: Chèn thông tin vào bảng `conversation`
      db.run(`INSERT INTO conversation (convename, textconv, session, username) VALUES (?, ?, ?,?)`, [convName, textConv, session,username], function(err) {
        if (err) {
          return res.status(500).send("Lỗi lưu dữ liệu vào conversation");
        }
  
        const convId = this.lastID; // Lấy ID của conversation vừa chèn
  
        // Bước 2: Chèn từng item vào bảng `conversationitem`
        const stmt = db.prepare(`INSERT INTO conversationitem (conv_id, sentence, sentence_index) VALUES (?, ?, ?)`);
  
        convItems.forEach((item, index) => {
          stmt.run(convId, item.sentence, item.indexSen);
        });
  
        stmt.finalize((err) => {
          if (err) {
            return res.status(500).send("Lỗi lưu dữ liệu vào conversationitem");
          }
          console.log(convId)
          res.json({ success: true, id: convId });
        });
      });
    });
});

app.get('/conv', (req, res) => {
    const username = req.session.user;
    const convId = req.query.id;
    console.log(convId);
    console.log(username);
  
    // Truy vấn dữ liệu từ bảng conversation
    db.get(`SELECT * FROM conversation WHERE id = ? and username = ?`, [convId, username], (err, convRow) => {
      if (err) {console.log(username);
        return res.status(500).send(err + "Lỗi khi lấy dữ liệu từ bảng conversation");
      }
  
      if (!convRow) {
        return res.status(404).send("Cuộc hội thoại không tồn tại");
      }
  
      // Truy vấn dữ liệu từ bảng conversationitem liên quan đến convId
      db.all(`SELECT id as itemId, sentence, sentence_index as indexSen ,
        CASE 
            WHEN audio_path IS NULL OR audio_path = '' 
            THEN NULL 
            ELSE concat('conv/', ?, '/', audio_path) 
        END AS audioFile FROM conversationitem WHERE conv_id = ?`, [username, convId], (err, itemRows) => {
        if (err) {
          return res.status(500).send("Lỗi khi lấy dữ liệu từ bảng conversationitem");
        }
  
        // Tạo cấu trúc JSON trả về
        const response = {
          id: convRow.id,
          convName: convRow.convename,
          session: convRow.session,
          textConv: convRow.textconv,
          convItems: itemRows 
        };
  
        res.status(200).json(response);
      });
    });
});
  

// API để lưu thông tin vào bảng conversationitem
app.post('/api/conversationitem',checkAuthentication,(req, res, next) => {
    dynamicFolderName = 'conv'; 
    next();
}, upload.single('audio'), (req, res,) => {
    const { itemId, sentence } = req.body;
    const audioPath = req.file ? req.file.filename : '';
    db.run("UPDATE conversationitem SET sentence = ?,audio_path=?  WHERE id = ?", [sentence ,audioPath, itemId]);
    res.json({ success: true });

    // db.run(`INSERT INTO conversationitem (conv_id, sentence, audio_path, order) VALUES (?, ?, ?, ?)`, [convid, sentence, audioPath, order], function(err) {
    //     if (err) {
    //         console.error(err.message);
    //         return res.json({ success: false, error: err.message });
    //     }
    //     res.json({ success: true, id: this.lastID });
    // });
});

const images = [
    '/uploads/001_EN.PNG',
    '/uploads/004_EN.PNG',
];

// API để lấy danh sách hình ảnh
app.get('/api/images', (req, res) => {
    res.json(images);
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
