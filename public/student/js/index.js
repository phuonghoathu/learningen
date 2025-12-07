document.addEventListener('DOMContentLoaded', () => {

    const modal = document.getElementById("authModal");
    const span = document.getElementsByClassName("close")[1];
    const errorMessage = document.getElementById("errorMessage");
    const urlParams = new URLSearchParams(window.location.search);
    const dataUrl = urlParams.get('data');
    let testUser = "";
    let startTime ;
    let firstSubmit = false;

    // Show the modal
    modal.style.display = "block";

    // Close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Handle form submission
    document.getElementById("authForm").addEventListener("submit", function(event) {
        event.preventDefault();
        testUser = document.getElementById("name").value;
        startTime = new Date(); 
        const passcode = document.getElementById("passcode").value;

        // Call API to check name and passcode
        fetch('/check-pascode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({passcode, dataUrl })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                modal.style.display = "none";
                
                fetch(`/quiz?data=${encodeURIComponent(dataUrl)}`)
                    .then(response => response.json())
                    .then(data => {
                        initializeGame(data);
                    })
                    .catch(error => console.error('Error fetching data:', error));
            } else {
                errorMessage.textContent = "Bạn đã nhập sai thông tin rồi! Vui lòng nhập lại nhé.";  // Show error message
            }
        })
        .catch(error => console.error('Error checking auth:', error));
    });

    function initializeGame(data) {
        console.log(data)
        const wordCard = document.getElementById('wordCard');
        const inputAnswer = document.getElementById('inputAnswer');
        const submitAnswer = document.getElementById('submitAnswer');
        const skipButton = document.getElementById('skip');
        const hintButton = document.getElementById('hint');
        const scoreElement = document.getElementById('score');
        const hintModal = document.getElementById('hintModal');
        const hintContent = document.getElementById('hintContent');
        const closeModal = document.getElementsByClassName('close')[0];
        const submitQuiz = document.getElementById('submitQuiz');

        let score = 0;
        //let currentWordIndex = 0;
        let currentWord = {}
        let currentType = ""
        let timeLeft = data.time ? parseInt(data.time*60) : null;
        let hintCount = 0;
        let questionHitCount = 0 ;
        let dataAnswer = [];
        let sessionEncode ;
        let quizName = data.quizName;
        let quizId = data.quizId;

 ///START TIME PROCESS    
        let progressBar = document.querySelector('.e-c-progress');
        let indicator = document.getElementById('e-indicator');
        let pointer = document.getElementById('e-pointer');
        let length = Math.PI * 2 * 100;

        progressBar.style.strokeDasharray = length;

        function update(value, timePercent) {
            var offset = - length - length * value / (timePercent);
            progressBar.style.strokeDashoffset = offset; 
            pointer.style.transform = `rotate(${360 * value / (timePercent)}deg)`; 
        };

        //circle ends
        const displayOutput = document.querySelector('.display-remain-time')

        let intervalTimer;
        let wholeTime = timeLeft; // manage this to set the whole time 
        let isStarted = false;

        if (wholeTime != null) {
            update(wholeTime,wholeTime); //refreshes progress bar
            displayTimeLeft(wholeTime);
        }

        function changeWholeTime(seconds){
            if ((wholeTime + seconds) > 0){
                wholeTime += seconds;
                update(wholeTime,wholeTime);
            }
        }

        function timer (seconds){ //counts time, takes seconds
            let remainTime = Date.now() + (seconds * 1000);
            displayTimeLeft(seconds);
            
            intervalTimer = setInterval(function(){
                timeLeft = Math.round((remainTime - Date.now()) / 1000);
                if(timeLeft < 0){
                    clearInterval(intervalTimer);
                    handleCompletion();
                    return ;
                }
                displayTimeLeft(timeLeft);
            }, 1000);
        }

        function displayTimeLeft (timeLeft){ //displays time on the input
            let minutes = Math.floor(timeLeft / 60);
            let seconds = timeLeft % 60;
            let displayString = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            displayOutput.textContent = displayString;
            update(timeLeft, wholeTime);
        }
        if (wholeTime != null) {
            timer(wholeTime);
            isStarted = true;
        }
 ///END TIME PROCESS       
        if (data.skip) {
            skipButton.style.display = 'block';
        }

        if (data.hint) {
            hintButton.style.display = 'block';
        }

        displayWord();

        submitAnswer.addEventListener('click', () => {
            checkAnswer();
        });

        submitQuiz.addEventListener('click', () => {
            submitQuizAll();
            showCelebration();
            toastr.success("You are completed this test. Thank for your spent time to learning <br /><br /><button type=\"button\" class=\"btn clear\">Yes</button>", "Completed ")
        });

        skipButton.addEventListener('click', () => {
            skipWord();
        });

        hintButton.addEventListener('click', () => {
            showHint();
        });

        closeModal.addEventListener('click', () => {
            hintModal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target == hintModal) {
                hintModal.style.display = 'none';
            }
        });

        function displayWord() {
           // const word = data.words[currentWordIndex];//words.splice(Math.floor(Math.random() * words.length), 1)[0];
            if (data.words.length == 0) {
                // Show end game
                handleCompletion();
            }
            currentWord = data.words.splice(Math.floor(Math.random() * data.words.length), 1)[0];
            if(data.type === 'random') {
                ran = Math.round(Math.random())
                if(ran == 0)
                    currentType = 'en-vn';
                else
                    currentType = 'vn-en';
            } else {
                currentType = data.type;
            }
            wordCard.textContent = currentType === 'en-vn' ? currentWord.english : currentWord.vietnamese;
            console.log(currentWord.level)
            sessionEncode = currentWord.session;
            const leveLBar = document.getElementById('leveLBar');
            if(currentWord.level == 'Easy') {
                leveLBar.style.backgroundColor = 'aquamarine';
            } else if(currentWord.level == 'Medium') {
                leveLBar.style.backgroundColor = 'greenyellow';
            } else if(currentWord.level == 'Hard') {
                leveLBar.style.backgroundColor = 'red';
            }  
        }

        function submitQuizAll() {
            if (firstSubmit) {
                return;
            }
            firstSubmit = true;
            const endTime = new Date();
            const objJson = {"testUser": testUser, "quizId": quizId, "quizName" : quizName,"duration" : msToTime(endTime - startTime), "data":dataAnswer};

            fetch('/submitAnswer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(objJson)
            }).then(response => response.json())
                .then(data => {
                    if (data.success) {
                      //  toastr.success('Từ đã được cập nhật!');
                    } else {
                        toastr.error('Có lỗi xảy ra, vui lòng thử lại!');
                    }
                });
        }

        function checkAnswer() {
          //  const word = data.words[currentWordIndex];
            const correctAnswer = currentType === 'en-vn' ? currentWord.vietnamese : currentWord.english;
            let flagCorect = false;
            let scoreChange ;

            if (inputAnswer.value.toLowerCase() === correctAnswer.toLowerCase()) {
                flagCorect = true;
                scoreChange = updateScore(currentWord.level, true);
                if (data.correctDisplay) {
                    toastr.success('Correct!!!');
                }
            } else {
                scoreChange = updateScore(currentWord.level, false);
                if (data.correctDisplay) {
                    toastr.success('Incorrect! The correct answer was: ' + correctAnswer);
                }
            }

            const questtionTmp = currentType === 'en-vn' ? currentWord.english : currentWord.vietnamese;
            
            dataAnswer.push({"question": questtionTmp,"answer": inputAnswer.value, "hintCount" : questionHitCount, 
                "correct" :flagCorect,"point":scoreChange, "session": sessionEncode});

            inputAnswer.value = '';
            questionHitCount = 0;
          //  currentWordIndex = (currentWordIndex + 1) % data.words.length;
            displayWord();
        }

        function updateScore(level, isCorrect, isHint=false, isSkip=false) {
            let scoreChange = 0;
            if (isHint) {
                if (level === 'Easy') {
                    scoreChange = -parseInt(data.hintMinusScoreEasy);
                } else if (level === 'Medium') {
                    scoreChange = -parseInt(data.hintMinusScoreMedium);
                } else if (level === 'Hard') {
                    scoreChange = -parseInt(data.hintMinusScoreHard);
                }
            } else {
                if (isSkip) {
                    if (level === 'Easy') {
                        scoreChange = -parseInt(data.skipMinusScoreEasy);
                    } else if (level === 'Medium') {
                        scoreChange = -parseInt(data.skipMinusScoreMedium);
                    } else if (level === 'Hard') {
                        scoreChange = -parseInt(data.skipMinusScoreHard);
                    }
                } else {
                    if (isCorrect) {
                        if (level === 'Easy') {
                            scoreChange = parseInt(data.rightPlusScoreEasy);
                        } else if (level === 'Medium') {
                            scoreChange = parseInt(data.rightPlusScoreMedium);
                        } else if (level === 'Hard') {
                            scoreChange = parseInt(data.rightPlusScoreHard);
                        }
                    } else {
                        if (level === 'Easy') {
                            scoreChange = -parseInt(data.wrongMinusScoreEasy);
                        } else if (level === 'Medium') {
                            scoreChange = -parseInt(data.wrongMinusScoreMedium);
                        } else if (level === 'Hard') {
                            scoreChange = -parseInt(data.wrongMinusScoreHard);
                        }
                    }
                }
            }

            score += scoreChange;
            scoreElement.textContent = score;
            return scoreChange;
        }

        function skipWord() {
          //  const word = data.words[currentWordIndex];
            const scoreChange = updateScore(currentWord.level, false, false, true);

            const questtionTmp = currentType === 'en-vn' ? currentWord.english : currentWord.vietnamese;
            dataAnswer.push({"question": questtionTmp,"answer": inputAnswer.value, "hintCount" : questionHitCount, 
                "point":scoreChange, "correct" :false, "session": sessionEncode});

            inputAnswer.value = '';
            questionHitCount = 0;
            
            displayWord();
        }

        function showHint() {
            hintModal.style.display = 'block';
           // const word = currentWord;
            const correctAnswer = currentType === 'en-vn' ? currentWord.vietnamese : currentWord.english;
            const wordHint = correctAnswer.split('');

            hintContent.innerHTML = '';
            //hintContent.style.textAlign = 'center'
            wordHint.forEach(word => {
                const wordElement = document.createElement('span');
                if(word == ' ') {
                    wordElement.textContent = " ";
                    wordElement.style.margin = '10px';
                    wordElement.style.padding = '10px';
                    wordElement.style.border = '1px solid #ddd';
                    wordElement.style.borderRadius = '4px';
                    hintContent.appendChild(wordElement);
                } else {
                    wordElement.textContent = "_";
                    wordElement.style.margin = '10px';
                    wordElement.style.padding = '10px';
                    wordElement.style.border = '1px solid #ddd';
                    wordElement.style.borderRadius = '4px';
                    wordElement.style.cursor = 'pointer';
                    wordElement.style.backgroundColor = 'gray';
    
                    wordElement.addEventListener('click', () => {
                        hintCount++;
                        questionHitCount++;
                        if (hintCount > parseInt(data.maxHint)) {
                            hintButton.disabled = true;
                            hintButton.style.backgroundColor = "gray"
                        } else {
                            updateScore(currentWord.level,true,true, false)
                            wordElement.textContent = word;
                            wordElement.style.backgroundColor = 'greenyellow';
                        }
                        
                    });
    
                    hintContent.appendChild(wordElement);
                }
            });
        }
        
        function handleCompletion(timeout = false) {
            const submitButton = document.getElementById('submitAnswer');
            submitButton.disabled = true;
            if (!firstSubmit) {
                showCelebration();
                toastr.success("You are completed this test. Thank for your spent time to learning <br /><br /><button type=\"button\" class=\"btn clear\">Yes</button>", "Completed ")
            }
            submitQuizAll();
        }

        function applyRandomEffect(element) {
            const effects = ['slideInLeft', 'zoomIn', 'fadeIn','heartbeat' ,'flipInX','fadeOut','pulse','rotateIn','bounceIn'];
            const randomEffect = effects[Math.floor(Math.random() * effects.length)];
            console.log(randomEffect)
            element.classList.add('animated', randomEffect);
            setTimeout(() => {
                element.classList.remove('animated', randomEffect);
            }, 1000);
        }
    
        function showCelebration() {
            const duration = 2 * 1000;
            const end = Date.now() + duration;
    
            (function frame() {
                confetti({
                    particleCount: 2,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 }
                });
                confetti({
                    particleCount: 2,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 }
                });
    
                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
        }
        function msToTime(duration) {
            var milliseconds = parseInt((duration % 1000) / 100),
              seconds = Math.floor((duration / 1000) % 60),
              minutes = Math.floor((duration / (1000 * 60)) % 60),
              hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
          
            hours = (hours < 10) ? "0" + hours : hours;
            minutes = (minutes < 10) ? "0" + minutes : minutes;
            seconds = (seconds < 10) ? "0" + seconds : seconds;
          
            return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
        }
    }
});
