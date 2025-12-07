const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const parm = process.argv;
const db = new sqlite3.Database(path.join(__dirname, 'data.db'), (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        if(parm[2] == 'init') {
            db.run(`CREATE TABLE IF NOT EXISTS words (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                english TEXT,
                vietnamese TEXT,
                session TEXT,
                level TEXT,
                description TEXT,
                imageUrl TEXT,
                audio TEXT default ''
            )`);
    
            db.run(`CREATE TABLE IF NOT EXISTS topic (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                session TEXT,
                session_encode,
                type TEXT
            )`);
    
            db.run(`CREATE TABLE IF NOT EXISTS encoded_data (
                id TEXT PRIMARY KEY,
                name TEXT,
                username TEXT,
                data TEXT NOT NULL,
                passcode TEXT default ''
            )`);
    
            db.run(`CREATE TABLE IF NOT EXISTS user 
            (username TEXT, password TEXT, active INTEGER, last_login TEXT)`);

            db.run(`CREATE TABLE IF NOT EXISTS answer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                testuser TEXT NOT NULL,
                quizId INTEGER,
                quizName TEXT,
                duration TEXT,
                totalPoint INTEGER
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS answerdetail (
                answerid INTEGER,
                question TEXT NOT NULL ,
                topicId TEXT,
                answer TEXT default '',
                correct TEXT ,
                hintCount INTEGER,
                point INTEGER
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS conversation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                convename TEXT,
                textconv TEXT,
                session TEXT
              )`);
              
            db.run(`CREATE TABLE IF NOT EXISTS conversationitem (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conv_id INTEGER,
                sentence TEXT,
                audio_path TEXT default '',
                sentence_index  INTEGER
              )`);

        } else if(parm[2] == 'data') {
            // Insert dummy users for example purposes
            db.run("INSERT INTO user (username, password, active, last_login) VALUES ('teacher', 'a', 1, NULL)");
            db.run("INSERT INTO user (username, password, active, last_login) VALUES ('user', 'a', 1, NULL)");

            db.run(`INSERT INTO topic (username, session, session_encode,type)  VALUES ('teacher','Session01','e87120c1b331a44cecc60380e2286978','word')`);
            db.run(`INSERT INTO topic (username, session, session_encode,type)  VALUES ('user','Session01','5e0a9d73ec8c67fd451c879366cb4f98','word')`);
        } else {
           // db.run(`ALTER TABLE words ADD COLUMN audio TEXT default ''`);
           // db.run(`ALTER TABLE encoded_data ADD COLUMN passcode TEXT default ''`);

           
           db.run(`DROP TABLE answer`);
           db.run(`DROP TABLE answerdetail`);
           db.run(`DROP TABLE encoded_data`);
           db.run(`ALTER TABLE topic ADD COLUMN type TEXT default 'word'`);
           db.run(`INSERT INTO topic (username, session, session_encode,type)  VALUES ('teacher','demo','e87120c1b331a44cecc60380e2286979','conversion')`);
           db.run(`INSERT INTO topic (username, session, session_encode, type)  VALUES ('user','demo','5e0a9d73ec8c67fd451c879366cb4f99','conversion')`);
       }
        
        
        
       
        
    }
});
